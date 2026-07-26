import { Injectable, BadRequestException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../shared-services/audit/audit.service';
import { EventPublisher } from '../../shared-services/event-bus/event-publisher.interface';
import { Inject } from '@nestjs/common';
import { EVENT_PUBLISHER } from '../../shared-services/event-bus/event-publisher.interface';
import { BedCategory, BedInventoryStatus, DomainEvent } from '@sahayak/shared-constants';

export interface BedCategoryUpdate {
  category: BedCategory;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
}

export interface BedInventoryRow {
  id: string;
  hospitalId: string;
  category: string;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  stalenessStatus: string;
  lastUpdatedAt: Date;
  version: number;
}

@Injectable()
export class BedInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly config: ConfigService,
  ) {}

  // FR-BED-001: Update bed category counts for a hospital.
  // Validates per PRD §2.8: occupied+available ≤ total (unless override+reason);
  // no negatives. Resets the staleness timer (BR-03).
  // Uses optimistic locking (`version`) to prevent silent last-write-wins races.
  async updateBedCounts(
    hospitalId: string,
    actorId: string,
    updates: BedCategoryUpdate[],
    overrideReason?: string,
  ): Promise<BedInventoryRow[]> {
    const results: BedInventoryRow[] = [];

    for (const u of updates) {
      // Validate — no negatives
      if (u.availableCount < 0 || u.occupiedCount < 0 || u.totalCount < 0) {
        throw new BadRequestException(
          `BED_INVENTORY_NEGATIVE_COUNT: category ${u.category} — counts cannot be negative`,
        );
      }
      // Validate — consistency: occupied + available ≤ total (unless override provided)
      if (u.occupiedCount + u.availableCount > u.totalCount) {
        if (!overrideReason) {
          throw new BadRequestException(
            `BED_INVENTORY_COUNT_EXCEEDS_TOTAL: category ${u.category} — occupied(${u.occupiedCount}) + available(${u.availableCount}) > total(${u.totalCount}). Provide overrideReason to force.`,
          );
        }
      }

      const row = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.hospitalBedInventory.findUnique({
          where: { hospitalId_category: { hospitalId, category: u.category } },
        });

        const updated = await tx.hospitalBedInventory.upsert({
          where: { hospitalId_category: { hospitalId, category: u.category } },
          create: {
            hospitalId,
            category: u.category,
            availableCount: u.availableCount,
            occupiedCount: u.occupiedCount,
            totalCount: u.totalCount,
            stalenessStatus: BedInventoryStatus.FRESH,
            lastUpdatedAt: new Date(),
            lastUpdatedBy: actorId,
            version: 1,
          },
          update: {
            availableCount: u.availableCount,
            occupiedCount: u.occupiedCount,
            totalCount: u.totalCount,
            stalenessStatus: BedInventoryStatus.FRESH,
            lastUpdatedAt: new Date(),
            lastUpdatedBy: actorId,
            // Optimistic version bump — detect concurrent updates
            version: { increment: 1 },
          },
        });

        await this.audit.record(
          {
            actor: actorId,
            action: 'BED_INVENTORY_UPDATED',
            entityType: 'HospitalBedInventory',
            entityId: updated.id,
            metadata: {
              hospitalId,
              category: u.category,
              before: existing
                ? {
                    available: existing.availableCount,
                    occupied: existing.occupiedCount,
                    total: existing.totalCount,
                  }
                : null,
              after: {
                available: u.availableCount,
                occupied: u.occupiedCount,
                total: u.totalCount,
              },
              overrideReason: overrideReason ?? null,
            },
          },
          tx,
        );

        return updated;
      });

      results.push(row as BedInventoryRow);
    }

    // Emit after all categories updated — one event per call, not per category
    await this.events.publish(DomainEvent.BED_INVENTORY_UPDATED, {
      hospitalId,
      updatedCategories: updates.map((u) => u.category),
      updatedBy: actorId,
    });

    return results;
  }

  // Fetch all bed categories for a hospital (for Dashboard and P-03 screen).
  async getBedInventory(hospitalId: string): Promise<BedInventoryRow[]> {
    const rows = await this.prisma.hospitalBedInventory.findMany({
      where: { hospitalId },
      orderBy: { category: 'asc' },
    });
    return rows as BedInventoryRow[];
  }

  // Returns true if the hospital's inventory is current (any category FRESH).
  async isInventoryFresh(hospitalId: string): Promise<boolean> {
    const staleCount = await this.prisma.hospitalBedInventory.count({
      where: { hospitalId, stalenessStatus: BedInventoryStatus.STALE },
    });
    return staleCount === 0;
  }
}

// BR-03: Mark hospital bed inventory STALE if last_updated_at is older than
// BED_STALE_THRESHOLD_HOURS (default 6). Runs every 30 minutes; logs + emits
// an event per hospital that transitions to STALE so the notification service
// can alert the hospital administrator.
@Injectable()
export class InventoryStalenessCheckJob {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async markStaleInventory(): Promise<void> {
    const thresholdHours = this.config.get<number>(
      'BED_STALE_THRESHOLD_HOURS',
      6,
    );
    const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000);

    // Find FRESH rows whose last_updated_at has crossed the threshold
    const toMark = await this.prisma.hospitalBedInventory.findMany({
      where: {
        stalenessStatus: BedInventoryStatus.FRESH,
        lastUpdatedAt: { lt: cutoff },
      },
      select: { id: true, hospitalId: true, category: true },
    });

    if (toMark.length === 0) return;

    // Bulk mark STALE
    await this.prisma.hospitalBedInventory.updateMany({
      where: {
        id: { in: toMark.map((r) => r.id) },
      },
      data: { stalenessStatus: BedInventoryStatus.STALE },
    });

    // Group by hospitalId and emit one event per hospital
    const byHospital = toMark.reduce<Record<string, string[]>>((acc, r) => {
      if (!acc[r.hospitalId]) acc[r.hospitalId] = [];
      acc[r.hospitalId].push(r.category);
      return acc;
    }, {});

    for (const [hospitalId, categories] of Object.entries(byHospital)) {
      await this.audit.record({
        actor: 'system:staleness-check-job',
        action: 'BED_INVENTORY_MARKED_STALE',
        entityType: 'HospitalBedInventory',
        entityId: hospitalId,
        metadata: { categories, thresholdHours },
      });
      await this.events.publish(DomainEvent.BED_INVENTORY_STALE, {
        hospitalId,
        categories,
        thresholdHours,
      });
    }
  }
}
