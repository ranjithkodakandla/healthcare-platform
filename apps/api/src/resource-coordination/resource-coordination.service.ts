import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ResourceHold } from '@prisma/client';
import { DomainEvent, ERROR_CODES, ResourceHoldStatus } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { EVENT_PUBLISHER, EventPublisher } from '../shared-services/event-bus/event-publisher.interface';

// Field names mirror PRD Appendix C2's ResourceHold shape verbatim:
// { hold_id, case_id, resource_type, resource_owner_id, status, held_at, expires_at,
//   confirmed_at, requires_secondary_ack }.
export interface CreateHoldInput {
  resourceType: string;
  resourceOwnerId: string;
  caseId?: string;
  ttlSeconds: number;
  requiresSecondaryAck?: boolean;
  actor: string;
}

const ACTIVE_HOLD_STATUSES = [ResourceHoldStatus.PENDING, ResourceHoldStatus.CONFIRMED];

// Appendix C2 / M9: the single generic ResourceHold engine every resource module
// (ambulance, beds, blood units, ...) configures rather than reimplements.
@Injectable()
export class ResourceCoordinationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  // Idempotent — first caller for a (resourceType, resourceOwnerId) pair sets the capacity.
  async ensureCapacity(resourceType: string, resourceOwnerId: string, capacity: number) {
    return this.prisma.resourceCapacity.upsert({
      where: { resourceType_resourceOwnerId: { resourceType, resourceOwnerId } },
      create: { resourceType, resourceOwnerId, capacity },
      update: {},
    });
  }

  // Atomicity via `SELECT ... FOR UPDATE` on the capacity row (M9 DoD blocker): every
  // concurrent caller for the same (resourceType, resourceOwnerId) serializes on this
  // lock before counting active holds, so capacity can never be oversold under concurrency.
  async createHold(input: CreateHoldInput): Promise<ResourceHold> {
    const hold = await this.prisma.$transaction(async (tx) => {
      const capacityRows = await tx.$queryRaw<Array<{ id: string; capacity: number }>>`
        SELECT id, capacity
        FROM resource_coordination.resource_capacities
        WHERE resource_type = ${input.resourceType} AND resource_owner_id = ${input.resourceOwnerId}
        FOR UPDATE
      `;

      const capacityRow = capacityRows[0];
      if (!capacityRow) {
        throw new NotFoundException(
          `No ResourceCapacity configured for ${input.resourceType}/${input.resourceOwnerId}`,
        );
      }

      const activeHoldCount = await tx.resourceHold.count({
        where: {
          resourceType: input.resourceType,
          resourceOwnerId: input.resourceOwnerId,
          status: { in: ACTIVE_HOLD_STATUSES },
          expiresAt: { gt: new Date() },
        },
      });

      if (activeHoldCount >= capacityRow.capacity) {
        throw new ConflictException({
          code: ERROR_CODES.RESOURCE_HOLD_CAPACITY_EXCEEDED,
          message: `Capacity exceeded for ${input.resourceType}/${input.resourceOwnerId}`,
        });
      }

      const created = await tx.resourceHold.create({
        data: {
          resourceType: input.resourceType,
          resourceOwnerId: input.resourceOwnerId,
          caseId: input.caseId,
          status: ResourceHoldStatus.PENDING,
          expiresAt: new Date(Date.now() + input.ttlSeconds * 1000),
          requiresSecondaryAck: input.requiresSecondaryAck ?? false,
        },
      });

      await this.audit.record(
        {
          actor: input.actor,
          action: 'RESOURCE_HOLD_CREATED',
          entityType: 'ResourceHold',
          entityId: created.id,
          metadata: { resourceType: input.resourceType, resourceOwnerId: input.resourceOwnerId },
        },
        tx,
      );

      return created;
    });

    this.events.publish(DomainEvent.RESOURCE_HOLD_CREATED, { holdId: hold.id });
    return hold;
  }

  async confirmHold(holdId: string, actor: string): Promise<ResourceHold> {
    return this.transitionHold(holdId, actor, {
      from: ResourceHoldStatus.PENDING,
      to: ResourceHoldStatus.CONFIRMED,
      action: 'RESOURCE_HOLD_CONFIRMED',
      event: DomainEvent.RESOURCE_HOLD_CONFIRMED,
      extraData: { confirmedAt: new Date() },
    });
  }

  async releaseHold(holdId: string, actor: string): Promise<ResourceHold> {
    return this.transitionHold(holdId, actor, {
      from: undefined,
      to: ResourceHoldStatus.RELEASED,
      action: 'RESOURCE_HOLD_RELEASED',
      event: DomainEvent.RESOURCE_HOLD_RELEASED,
    });
  }

  private async transitionHold(
    holdId: string,
    actor: string,
    opts: {
      from?: ResourceHoldStatus;
      to: ResourceHoldStatus;
      action: string;
      event: string;
      extraData?: Record<string, unknown>;
    },
  ): Promise<ResourceHold> {
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.resourceHold.findUnique({ where: { id: holdId } });
      if (!existing) {
        throw new NotFoundException(`ResourceHold ${holdId} not found`);
      }
      if (opts.from && existing.status !== opts.from) {
        throw new ConflictException({
          code: ERROR_CODES.RESOURCE_HOLD_INVALID_STATE_TRANSITION,
          message: `Cannot transition hold ${holdId} from ${existing.status} to ${opts.to}`,
        });
      }

      // Optimistic locking (version column, M17 item 9): fails if another writer
      // already moved this hold since it was read above.
      const result = await tx.resourceHold.updateMany({
        where: { id: holdId, version: existing.version },
        data: { status: opts.to, version: { increment: 1 }, ...(opts.extraData ?? {}) },
      });

      if (result.count === 0) {
        throw new ConflictException(`ResourceHold ${holdId} was concurrently modified`);
      }

      await this.audit.record(
        { actor, action: opts.action, entityType: 'ResourceHold', entityId: holdId },
        tx,
      );

      return tx.resourceHold.findUniqueOrThrow({ where: { id: holdId } });
    });

    this.events.publish(opts.event, { holdId: updated.id });
    return updated;
  }
}
