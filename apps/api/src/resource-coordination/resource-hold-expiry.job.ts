import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DomainEvent, ResourceHoldStatus } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';
import { EVENT_PUBLISHER, EventPublisher } from '../shared-services/event-bus/event-publisher.interface';

@Injectable()
export class ResourceHoldExpiryJob {
  private readonly logger = new Logger(ResourceHoldExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async expireOverdueHolds(): Promise<number> {
    const overdue = await this.prisma.resourceHold.findMany({
      where: { status: ResourceHoldStatus.PENDING, expiresAt: { lte: new Date() } },
    });

    for (const hold of overdue) {
      const result = await this.prisma.resourceHold.updateMany({
        where: { id: hold.id, version: hold.version },
        data: { status: ResourceHoldStatus.EXPIRED, version: { increment: 1 } },
      });

      if (result.count === 0) continue; // already transitioned concurrently

      await this.audit.record({
        actor: 'system:resource-hold-expiry-job',
        action: 'RESOURCE_HOLD_EXPIRED',
        entityType: 'ResourceHold',
        entityId: hold.id,
      });

      this.events.publish(DomainEvent.RESOURCE_HOLD_EXPIRED, { holdId: hold.id });
    }

    if (overdue.length > 0) {
      this.logger.log(`Expired ${overdue.length} overdue resource hold(s)`);
    }

    return overdue.length;
  }
}
