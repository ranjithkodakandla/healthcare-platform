import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { EVENT_PUBLISHER, EventPublisher } from '../shared-services/event-bus/event-publisher.interface';
import { DomainEvent, CaseSeverity } from '@sahayak/shared-constants';

export interface CreateAmbulanceRequestInput {
  caseId: string;
  actorId: string;
  pickupLat?: number;
  pickupLng?: number;
  severity?: CaseSeverity;
}

export interface AmbulanceSearchResult {
  id: string;
  driverUid: string;
  vehicleReg: string;
  vehicleType: string;
  isOnDuty: boolean;
  distanceKm: number | null; // null if driver has no GPS ping yet
}

// FR-AMB-001 / FR-AMB-002: Citizen-facing ambulance request and search service.
// BR-01: platform SLA is 90s from match to driver en-route (monitored by A-10 SLA screen).
// BR-03: per-driver 20s sequential offer window lives in the Driver Mode flow (C-31).
// This service manages the request lifecycle; offer dispatch is handled by the
// AmbulanceOfferJobService (scheduled, Phase 7) which reads SEARCHING requests.
@Injectable()
export class CitizenAmbulanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // FR-AMB-001: Create an ambulance request linked to an emergency case.
  async createRequest(input: CreateAmbulanceRequestInput) {
    const request = await this.prisma.$transaction(async (tx) => {
      const req = await tx.ambulanceRequest.create({
        data: {
          caseId: input.caseId,
          pickupLat: input.pickupLat,
          pickupLng: input.pickupLng,
          severity: input.severity ?? CaseSeverity.MODERATE,
          status: 'SEARCHING',
        },
      });

      await this.audit.record(
        {
          actor: input.actorId,
          action: 'AMBULANCE_REQUEST_CREATED',
          entityType: 'AmbulanceRequest',
          entityId: req.id,
          metadata: { caseId: input.caseId, severity: req.severity },
        },
        tx,
      );

      return req;
    });

    await this.events.publish(DomainEvent.AMBULANCE_REQUEST_CREATED, {
      requestId: request.id,
      caseId: request.caseId,
      severity: request.severity,
    });

    return request;
  }

  // FR-AMB-002: Search for on-duty ambulance drivers near a location.
  // TD-003 resolved: haversine distance sort for drivers who have GPS pings.
  // Drivers without a GPS ping (lastLat/lastLng null) are returned last.
  async searchAvailableDrivers(
    lat: number,
    lng: number,
    radiusKm: number = 5,
  ): Promise<AmbulanceSearchResult[]> {
    // Bounding-box pre-filter: 1° ≈ 111 km
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    type RawDriver = {
      id: string;
      driver_uid: string;
      vehicle_reg: string;
      vehicle_type: string;
      is_on_duty: boolean;
      distance_km: number | null;
    };

    const rows = await this.prisma.$queryRawUnsafe<RawDriver[]>(
      `
      SELECT
        id,
        driver_uid,
        vehicle_reg,
        vehicle_type,
        is_on_duty,
        CASE WHEN last_lat IS NOT NULL AND last_lng IS NOT NULL THEN
          6371.0 * 2.0 * ASIN(SQRT(
            POWER(SIN(RADIANS((last_lat - $1) / 2.0)), 2) +
            COS(RADIANS($1)) * COS(RADIANS(last_lat)) *
            POWER(SIN(RADIANS((last_lng - $2) / 2.0)), 2)
          ))
        ELSE NULL END AS distance_km
      FROM ambulance.ambulance_drivers
      WHERE is_on_duty = TRUE
        AND (
          last_lat IS NULL
          OR (last_lat BETWEEN $3 AND $4 AND last_lng BETWEEN $5 AND $6)
        )
      ORDER BY distance_km ASC NULLS LAST
      LIMIT 20
      `,
      lat,
      lng,
      lat - latDelta,
      lat + latDelta,
      lng - lngDelta,
      lng + lngDelta,
    );

    return rows.map((d) => ({
      id: d.id,
      driverUid: d.driver_uid,
      vehicleReg: d.vehicle_reg,
      vehicleType: d.vehicle_type,
      isOnDuty: d.is_on_duty,
      distanceKm: d.distance_km != null ? Math.round(Number(d.distance_km) * 10) / 10 : null,
    }));
  }

  // FR-AMB-003: Get the current status of an ambulance request by case ID.
  async getRequestByCaseId(caseId: string) {
    const request = await this.prisma.ambulanceRequest.findFirst({
      where: { caseId, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      include: { driver: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) {
      throw new NotFoundException(`No active ambulance request for case ${caseId}`);
    }

    return request;
  }

  // FR-AMB-004 / C-31 Driver Mode: Driver accepts an offer, locks the assignment (BR-04).
  async driverAcceptOffer(offerId: string, driverUid: string) {
    const offer = await this.prisma.ambulanceOffer.findUnique({
      where: { id: offerId },
      include: { request: true },
    });

    if (!offer || offer.status !== 'PENDING') {
      throw new NotFoundException(`Offer ${offerId} not found or not pending`);
    }

    const driver = await this.prisma.ambulanceDriver.findUnique({
      where: { driverUid },
    });

    if (!driver) {
      throw new NotFoundException(`Driver ${driverUid} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ambulanceOffer.update({
        where: { id: offerId },
        data: { status: 'ACCEPTED', respondedAt: new Date() },
      });

      await tx.ambulanceRequest.update({
        where: { id: offer.requestId },
        data: { status: 'MATCHED', driverId: driver.id },
      });

      await this.audit.record(
        {
          actor: driverUid,
          action: 'AMBULANCE_OFFER_ACCEPTED',
          entityType: 'AmbulanceOffer',
          entityId: offerId,
          metadata: { requestId: offer.requestId, caseId: offer.request.caseId },
        },
        tx,
      );
    });

    await this.events.publish(DomainEvent.AMBULANCE_MATCHED, {
      offerId,
      requestId: offer.requestId,
      caseId: offer.request.caseId,
      driverUid,
    });
  }
}
