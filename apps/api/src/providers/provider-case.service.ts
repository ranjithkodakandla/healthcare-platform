import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BedCategory, CaseSeverity, ResourceType } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { CaseService } from '../core/case.service';
import { ResourceCoordinationService } from '../resource-coordination/resource-coordination.service';

const ICU_VENT_CATEGORIES = [BedCategory.ICU, BedCategory.VENTILATOR];

// Same BR-02 severity buckets as CitizenController.resolveHoldTtlSeconds — duplicated
// here rather than shared because this is the only other place a hold gets created
// outside the citizen app path; if a third call site appears, factor this into
// ResourceCoordinationService instead of copying again.
const DEFAULT_HOLD_EXPIRY_MIN_CRITICAL = 30;
const DEFAULT_HOLD_EXPIRY_MIN_PLANNED = 120;

export interface CreateWalkInCaseInput {
  severity: CaseSeverity;
  category: BedCategory;
  patientName?: string;
}

// P-06 Case Management (F2). Hospital staff can view cases that have an active
// bed hold at this hospital, and add a "walk-in" case — a patient who arrived
// directly rather than through the citizen app's own emergency flow. A walk-in
// creates both a Case (CaseService, same path the citizen app uses) and a
// ResourceHold at this hospital (ResourceCoordinationService, same path
// FR-BED-003 uses) in one step, so it shows up in every other hospital screen
// (Incoming Queue, Clinical Ack, Case Management) exactly like a citizen-app case.
@Injectable()
export class ProviderCaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caseService: CaseService,
    private readonly resourceCoordination: ResourceCoordinationService,
    private readonly config: ConfigService,
  ) {}

  async list(hospitalId: string) {
    const holds = await this.prisma.resourceHold.findMany({
      where: {
        resourceType: ResourceType.BED,
        resourceOwnerId: { startsWith: `${hospitalId}:` },
        caseId: { not: null },
      },
      orderBy: { heldAt: 'desc' },
      take: 100,
    });

    const caseIds = [...new Set(holds.map((h) => h.caseId).filter((id): id is string => id != null))];
    if (caseIds.length === 0) return [];

    const cases = await this.prisma.case.findMany({ where: { id: { in: caseIds } } });
    const caseById = new Map(cases.map((c) => [c.id, c]));

    return holds
      .map((h) => {
        const kase = h.caseId ? caseById.get(h.caseId) : undefined;
        if (!kase) return null;
        return {
          caseId: kase.id,
          caseNumber: kase.caseNumber,
          severity: kase.severity,
          status: kase.status,
          holdId: h.id,
          category: h.resourceOwnerId.slice(`${hospitalId}:`.length),
          holdStatus: h.status,
          heldAt: h.heldAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  }

  async getTimeline(hospitalId: string, caseId: string) {
    const ownedHold = await this.prisma.resourceHold.findFirst({
      where: { caseId, resourceType: ResourceType.BED, resourceOwnerId: { startsWith: `${hospitalId}:` } },
    });
    if (!ownedHold) {
      throw new NotFoundException(`Case ${caseId} has no hold at this hospital`);
    }
    return this.caseService.getTimeline(caseId);
  }

  async createWalkIn(hospitalId: string, input: CreateWalkInCaseInput, actor: string) {
    if (!input.category) {
      throw new BadRequestException('category is required');
    }
    const kase = await this.caseService.createCase({
      actor,
      initiatorId: actor,
      severity: input.severity,
      initialPayload: {
        source: 'hospital_walkin',
        patientName: input.patientName ?? null,
        hospitalId,
      },
    });

    const resourceOwnerId = `${hospitalId}:${input.category}`;
    await this.resourceCoordination.ensureCapacity(ResourceType.BED, resourceOwnerId, 1);

    const isCritical = input.severity === CaseSeverity.CRITICAL;
    const minutes = isCritical
      ? Number(this.config.get('BED_HOLD_EXPIRY_MIN_CRITICAL') ?? DEFAULT_HOLD_EXPIRY_MIN_CRITICAL)
      : Number(this.config.get('BED_HOLD_EXPIRY_MIN_PLANNED') ?? DEFAULT_HOLD_EXPIRY_MIN_PLANNED);

    const hold = await this.resourceCoordination.createHold({
      resourceType: ResourceType.BED,
      resourceOwnerId,
      caseId: kase.id,
      ttlSeconds: minutes * 60,
      requiresSecondaryAck: ICU_VENT_CATEGORIES.includes(input.category),
      actor,
    });

    return { case: kase, hold };
  }
}
