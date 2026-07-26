import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { EVENT_PUBLISHER, EventPublisher } from '../shared-services/event-bus/event-publisher.interface';
import { DomainEvent } from '@sahayak/shared-constants';

// BR-01 target: 90s from case creation to driver en-route (monitored by SLA screen A-10).
// BR-03: sequential offer window — exactly ONE PENDING offer per request at a time.
//   Each driver gets 20 seconds to accept before the offer expires and the next
//   nearest driver is tried. This serialisation prevents duplicate accepts.
//
// Job runs every 5 seconds (two ticks before a 20s offer expires, giving a margin
// for clock skew). Two responsibilities:
//   1. OFFER CREATION — find SEARCHING requests with no PENDING offer, create a new
//      offer for the nearest available driver who has not already declined.
//   2. OFFER EXPIRY — find PENDING offers past their expiresAt, mark EXPIRED, and
//      return the request to bare SEARCHING so the next driver can be tried.

const OFFER_TTL_SECONDS = 20; // BR-03

@Injectable()
export class AmbulanceOfferDispatchJob {
  private readonly logger = new Logger(AmbulanceOfferDispatchJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // ── EXPIRY PROCESSOR — runs first every tick ─────────────────────────────────

  @Cron('*/5 * * * * *') // every 5 seconds
  async processExpiredOffers(): Promise<void> {
    const expired = await this.prisma.ambulanceOffer.findMany({
      where: { status: 'PENDING', expiresAt: { lte: new Date() } },
      include: { request: true },
    });

    for (const offer of expired) {
      await this.prisma.$transaction(async (tx) => {
        await tx.ambulanceOffer.update({
          where: { id: offer.id },
          data: { status: 'EXPIRED', respondedAt: new Date() },
        });

        await this.audit.record(
          {
            actor: 'system:offer-dispatch-job',
            action: 'AMBULANCE_OFFER_EXPIRED',
            entityType: 'AmbulanceOffer',
            entityId: offer.id,
            metadata: { requestId: offer.requestId, caseId: offer.request.caseId },
          },
          tx,
        );
      });

      await this.events.publish(DomainEvent.AMBULANCE_OFFER_EXPIRED, {
        offerId: offer.id,
        requestId: offer.requestId,
        caseId: offer.request.caseId,
      });

      this.logger.debug(`Offer ${offer.id} expired → cascading to next driver`);
    }
  }

  // ── OFFER CREATION — after expiry, create new offers ─────────────────────────

  @Cron('*/5 * * * * *')
  async dispatchNextOffers(): Promise<void> {
    // SEARCHING requests that have no PENDING offer right now
    const searching = await this.prisma.ambulanceRequest.findMany({
      where: {
        status: 'SEARCHING',
        offers: { none: { status: 'PENDING' } },
      },
      take: 50, // process up to 50 concurrent requests per tick
    });

    for (const request of searching) {
      await this.tryDispatchOffer(request.id, request.caseId, request.pickupLat, request.pickupLng);
    }
  }

  // ── Offer creation for a single request ──────────────────────────────────────

  private async tryDispatchOffer(
    requestId: string,
    caseId: string,
    pickupLat: number | null,
    pickupLng: number | null,
  ): Promise<void> {
    // Drivers already tried for this request (accepted, declined, or expired)
    const triedDriverIds = await this.prisma.ambulanceOffer.findMany({
      where: { requestId },
      select: { driverId: true },
    });
    const excludeIds = triedDriverIds.map((o) => o.driverId);

    // Find the nearest on-duty driver not yet tried
    let nextDriver: { id: string; driver_uid: string } | null = null;

    if (pickupLat != null && pickupLng != null) {
      // Haversine sort — nearest first
      const latDelta = 50 / 111.0; // 50 km max search radius for ambulances
      const lngDelta = 50 / (111.0 * Math.cos((pickupLat * Math.PI) / 180));
      type NearbyDriver = { id: string; driver_uid: string };
      const rows = await this.prisma.$queryRawUnsafe<NearbyDriver[]>(
        `
        SELECT id, driver_uid
        FROM ambulance.ambulance_drivers
        WHERE is_on_duty = TRUE
          ${excludeIds.length > 0 ? `AND id NOT IN (${excludeIds.map(() => '?').join(',')})` : ''}
          AND (last_lat IS NULL OR (last_lat BETWEEN $1 AND $2 AND last_lng BETWEEN $3 AND $4))
        ORDER BY
          CASE WHEN last_lat IS NOT NULL THEN
            6371.0 * 2.0 * ASIN(SQRT(
              POWER(SIN(RADIANS((last_lat - $5) / 2.0)), 2) +
              COS(RADIANS($5)) * COS(RADIANS(last_lat)) *
              POWER(SIN(RADIANS((last_lng - $6) / 2.0)), 2)
            ))
          ELSE 9999 END ASC
        LIMIT 1
        `,
        pickupLat - latDelta,
        pickupLat + latDelta,
        pickupLng - lngDelta,
        pickupLng + lngDelta,
        pickupLat,
        pickupLng,
        ...excludeIds,
      );
      nextDriver = rows[0] ?? null;
    } else {
      // No GPS for pickup — pick any available on-duty driver not yet tried
      const driver = await this.prisma.ambulanceDriver.findFirst({
        where: {
          isOnDuty: true,
          ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        },
        orderBy: { lastPingAt: 'desc' },
      });
      nextDriver = driver ? { id: driver.id, driver_uid: driver.driverUid } : null;
    }

    if (!nextDriver) {
      // No more available drivers — log and let the next tick retry
      this.logger.warn(`No available driver for request ${requestId} (case ${caseId})`);
      return;
    }

    const expiresAt = new Date(Date.now() + OFFER_TTL_SECONDS * 1000);

    await this.prisma.$transaction(async (tx) => {
      await tx.ambulanceOffer.create({
        data: {
          requestId,
          driverId: nextDriver!.id,
          status: 'PENDING',
          expiresAt,
          offeredAt: new Date(),
        },
      });

      await this.audit.record(
        {
          actor: 'system:offer-dispatch-job',
          action: 'AMBULANCE_OFFER_CREATED',
          entityType: 'AmbulanceOffer',
          entityId: requestId,
          metadata: { driverUid: nextDriver!.driver_uid, caseId, expiresAt },
        },
        tx,
      );
    });

    this.logger.debug(`Offered request ${requestId} to driver ${nextDriver.driver_uid} (expires ${expiresAt.toISOString()})`);
  }
}
