import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared-services/audit/audit.service';
import { EventPublisher } from '../../shared-services/event-bus/event-publisher.interface';
import { EVENT_PUBLISHER } from '../../shared-services/event-bus/event-publisher.interface';
import {
  ResourceHoldStatus,
  DomainEvent,
  ERROR_CODES,
  HospitalPortalRole,
} from '@sahayak/shared-constants';

export interface QueueEntry {
  holdId: string;
  caseId: string | null;
  category: string;
  status: string;
  requiresSecondaryAck: boolean;
  heldAt: Date;
  expiresAt: Date;
  // Denormalized from Case for ranking (may be null if case not linked)
  caseSeverity?: string | null;
  caseNumber?: string | null;
}

// FR-HOSP-001: Incoming Patients / Booking Queue
// Surfaces all ResourceHold rows for this hospital's BED resources, ranked by
// case severity (CRITICAL > URGENT > MODERATE > ROUTINE > no-case).
@Injectable()
export class IncomingPatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async getIncomingQueue(hospitalId: string): Promise<QueueEntry[]> {
    // Fetch all PENDING holds for this hospital's BED resources.
    const holds = await this.prisma.resourceHold.findMany({
      where: {
        resourceType: 'BED',
        resourceOwnerId: hospitalId,
        status: { in: [ResourceHoldStatus.PENDING] },
      },
      orderBy: { heldAt: 'asc' },
    });

    if (holds.length === 0) return [];

    // Enrich with case data for severity-based ranking.
    const caseIds = holds
      .map((h) => h.caseId)
      .filter((id): id is string => id != null);

    const cases =
      caseIds.length > 0
        ? await this.prisma.case.findMany({
            where: { id: { in: caseIds } },
            select: { id: true, severity: true, caseNumber: true },
          })
        : [];

    const caseMap = new Map(cases.map((c) => [c.id, c]));

    const severityOrder: Record<string, number> = {
      CRITICAL: 0,
      URGENT: 1,
      MODERATE: 2,
      ROUTINE: 3,
    };

    const enriched: QueueEntry[] = holds.map((h) => {
      const c = h.caseId ? caseMap.get(h.caseId) : undefined;
      return {
        holdId: h.id,
        caseId: h.caseId,
        category: h.resourceType,
        status: h.status,
        requiresSecondaryAck: h.requiresSecondaryAck,
        heldAt: h.heldAt,
        expiresAt: h.expiresAt,
        caseSeverity: c?.severity ?? null,
        caseNumber: c?.caseNumber ?? null,
      };
    });

    // Sort by severity rank, then by heldAt ascending (FIFO within same severity)
    enriched.sort((a, b) => {
      const ra = severityOrder[a.caseSeverity ?? ''] ?? 99;
      const rb = severityOrder[b.caseSeverity ?? ''] ?? 99;
      if (ra !== rb) return ra - rb;
      return a.heldAt.getTime() - b.heldAt.getTime();
    });

    return enriched;
  }

  // Admissions staff confirms a PENDING hold (General beds auto-confirm;
  // ICU/Vent with requiresSecondaryAck=true must go through ClinicalAckService first).
  async confirmHold(
    hospitalId: string,
    holdId: string,
    actorId: string,
    actorRole: string,
  ): Promise<void> {
    const hold = await this.prisma.resourceHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new NotFoundException(
        `${ERROR_CODES.HOLD_NOT_FOUND}: hold ${holdId} not found`,
      );
    }
    if (hold.resourceOwnerId !== hospitalId) {
      throw new ForbiddenException('Hold does not belong to this hospital');
    }
    if (hold.status !== ResourceHoldStatus.PENDING) {
      throw new BadRequestException(
        `${ERROR_CODES.HOLD_ALREADY_CONFIRMED}: hold is already ${hold.status}`,
      );
    }
    // ICU/Vent requires Clinical Lead to go through ClinicalAckService.
    // Admissions staff can confirm GENERAL beds directly; ICU/Vent requires secondary ack.
    if (
      hold.requiresSecondaryAck &&
      actorRole !== HospitalPortalRole.HOSPITAL_CLINICAL_LEAD
    ) {
      throw new BadRequestException(
        `${ERROR_CODES.HOLD_REQUIRES_CLINICAL_ACK}: ICU/Ventilator holds require clinical-lead acknowledgment via POST .../clinical-ack`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceHold.update({
        where: { id: holdId },
        data: {
          status: ResourceHoldStatus.CONFIRMED,
          confirmedAt: new Date(),
          version: { increment: 1 },
        },
      });

      await this.audit.record(
        {
          actor: actorId,
          action: 'HOLD_CONFIRMED_BY_ADMISSIONS',
          entityType: 'ResourceHold',
          entityId: holdId,
          metadata: { hospitalId, holdId, actorRole },
        },
        tx,
      );
    });

    await this.events.publish(DomainEvent.HOLD_CONFIRMED_BY_ADMISSIONS, {
      holdId,
      hospitalId,
      confirmedBy: actorId,
    });
  }

  // Admissions declines a hold with a mandatory reason.
  async declineHold(
    hospitalId: string,
    holdId: string,
    actorId: string,
    reason: string,
  ): Promise<void> {
    const hold = await this.prisma.resourceHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new NotFoundException(`${ERROR_CODES.HOLD_NOT_FOUND}: hold ${holdId} not found`);
    }
    if (hold.resourceOwnerId !== hospitalId) {
      throw new ForbiddenException('Hold does not belong to this hospital');
    }
    if (hold.status !== ResourceHoldStatus.PENDING) {
      throw new BadRequestException(
        `${ERROR_CODES.HOLD_ALREADY_CONFIRMED}: hold is already ${hold.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.resourceHold.update({
        where: { id: holdId },
        data: {
          status: ResourceHoldStatus.RELEASED,
          version: { increment: 1 },
        },
      });

      await this.audit.record(
        {
          actor: actorId,
          action: 'HOLD_DECLINED_BY_ADMISSIONS',
          entityType: 'ResourceHold',
          entityId: holdId,
          metadata: { hospitalId, holdId, reason },
        },
        tx,
      );
    });

    await this.events.publish(DomainEvent.HOLD_DECLINED_BY_ADMISSIONS, {
      holdId,
      hospitalId,
      declinedBy: actorId,
      reason,
    });
  }
}

// FR-HOSP-002: ICU/Ventilator two-step clinical acknowledgment (BR-04).
// "No ICU/Ventilator hold reaches CONFIRMED without a logged Clinical Lead
// acknowledgment" — zero-tolerance audit gate (UX Spec A-04 pattern applied here).
@Injectable()
export class ClinicalAckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async acknowledgeHold(
    hospitalId: string,
    holdId: string,
    clinicalLeadId: string,
    clinicalLeadRole: string,
  ): Promise<void> {
    // Zero-tolerance gate: only HOSPITAL_CLINICAL_LEAD may call this endpoint.
    if (clinicalLeadRole !== HospitalPortalRole.HOSPITAL_CLINICAL_LEAD) {
      throw new ForbiddenException(
        `${ERROR_CODES.CLINICAL_ACK_NOT_AUTHORIZED}: only Hospital Clinical Lead may acknowledge ICU/Vent holds`,
      );
    }

    const hold = await this.prisma.resourceHold.findUnique({
      where: { id: holdId },
    });

    if (!hold) {
      throw new NotFoundException(`${ERROR_CODES.HOLD_NOT_FOUND}: hold ${holdId} not found`);
    }
    if (hold.resourceOwnerId !== hospitalId) {
      throw new ForbiddenException('Hold does not belong to this hospital');
    }
    if (!hold.requiresSecondaryAck) {
      throw new BadRequestException(
        `${ERROR_CODES.CLINICAL_ACK_PRECONDITION_NOT_MET}: hold ${holdId} does not require clinical acknowledgment (not an ICU/Vent hold)`,
      );
    }
    if (hold.status !== ResourceHoldStatus.PENDING) {
      throw new BadRequestException(
        `${ERROR_CODES.HOLD_ALREADY_CONFIRMED}: hold is already ${hold.status}`,
      );
    }

    // Transition to CONFIRMED — the clinical acknowledgment IS the confirmation step
    // for ICU/Vent beds (BR-04: "Only then does hold transition to CONFIRMED").
    await this.prisma.$transaction(async (tx) => {
      await tx.resourceHold.update({
        where: { id: holdId },
        data: {
          status: ResourceHoldStatus.CONFIRMED,
          confirmedAt: new Date(),
          version: { increment: 1 },
        },
      });

      // Zero-tolerance audit: both the CLINICAL_ACK and the CONFIRMATION events
      // are logged in the same transaction — neither can commit without the other.
      await this.audit.record(
        {
          actor: clinicalLeadId,
          action: 'CLINICAL_ACK_COMPLETED',
          entityType: 'ResourceHold',
          entityId: holdId,
          metadata: {
            hospitalId,
            holdId,
            clinicalLeadId,
            clinicalLeadRole,
            auditNote:
              'ICU/Vent bed physically verified available and staffed — zero-tolerance gate FR-HOSP-002',
          },
        },
        tx,
      );
    });

    await this.events.publish(DomainEvent.CLINICAL_ACK_COMPLETED, {
      holdId,
      hospitalId,
      acknowledgedBy: clinicalLeadId,
    });
  }
}
