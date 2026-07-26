import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ProviderApplication } from '@prisma/client';
import { ERROR_CODES, OnboardingStage, OnboardingStageStatus, ProviderType } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';

// PRD Part G4 / FR-ADM-PRV-001 Main Flow, transcribed verbatim and in strict order —
// never reorder without a Decision Log entry.
const STAGE_ORDER: OnboardingStage[] = [
  OnboardingStage.APPLICATION_INTAKE,
  OnboardingStage.CREDENTIAL_VERIFICATION,
  OnboardingStage.INTEGRATION_TEST,
  OnboardingStage.GO_LIVE_APPROVAL,
  OnboardingStage.PORTAL_ACCESS_ACTIVATED,
];

export interface CreateProviderApplicationInput {
  providerType: ProviderType;
  legalName: string;
  actor: string;
}

export interface CompleteStageInput {
  applicationId: string;
  stage: OnboardingStage;
  reviewerId: string;
  notes?: string;
}

// G4: "a structured, stage-gated onboarding workflow ... blocking portal go-live
// (F3-F9 access) until all mandatory stages are complete." UX Spec A-04's
// zero-tolerance audit requirement — isPortalLive() is the single source of truth
// every Provider Portal auth check must consult before granting F3-F9 access.
@Injectable()
export class ProviderOnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createApplication(input: CreateProviderApplicationInput): Promise<ProviderApplication> {
    return this.prisma.$transaction(async (tx) => {
      const application = await tx.providerApplication.create({
        data: { providerType: input.providerType, legalName: input.legalName },
      });

      // All 5 stages created up front (PENDING) so "every mandatory stage logged
      // complete" can be verified by a simple query rather than inferred from a
      // stage row's absence.
      await tx.providerOnboardingStage.createMany({
        data: STAGE_ORDER.map((stage) => ({ applicationId: application.id, stage })),
      });

      await this.audit.record(
        {
          actor: input.actor,
          action: 'PROVIDER_APPLICATION_CREATED',
          entityType: 'ProviderApplication',
          entityId: application.id,
          metadata: { providerType: input.providerType },
        },
        tx,
      );

      return application;
    });
  }

  // Enforces STAGE_ORDER strictly: a stage can only be completed once every stage
  // before it is COMPLETE. This is the mechanism behind G4's "blocking portal go-live
  // until all mandatory stages are complete" — there is no way to reach
  // PORTAL_ACCESS_ACTIVATED out of order.
  async completeStage(input: CompleteStageInput): Promise<void> {
    const stageIndex = STAGE_ORDER.indexOf(input.stage);

    await this.prisma.$transaction(async (tx) => {
      const allStages = await tx.providerOnboardingStage.findMany({
        where: { applicationId: input.applicationId },
      });

      if (allStages.length === 0) {
        throw new NotFoundException(`ProviderApplication ${input.applicationId} not found`);
      }

      const stageRow = allStages.find((s) => s.stage === input.stage);
      if (!stageRow) {
        throw new NotFoundException(`Stage ${input.stage} not found on this application`);
      }
      if (stageRow.status === OnboardingStageStatus.COMPLETE) {
        throw new BadRequestException({
          code: ERROR_CODES.ONBOARDING_STAGE_ALREADY_COMPLETE,
          message: `Stage ${input.stage} is already complete`,
        });
      }

      const priorStages = STAGE_ORDER.slice(0, stageIndex);
      const incompletePrior = priorStages.filter((prior) => {
        const row = allStages.find((s) => s.stage === prior);
        return row?.status !== OnboardingStageStatus.COMPLETE;
      });

      if (incompletePrior.length > 0) {
        throw new BadRequestException({
          code: ERROR_CODES.ONBOARDING_STAGE_OUT_OF_ORDER,
          message: `Cannot complete ${input.stage} before completing: ${incompletePrior.join(', ')}`,
        });
      }

      await tx.providerOnboardingStage.update({
        where: { id: stageRow.id },
        data: {
          status: OnboardingStageStatus.COMPLETE,
          reviewerId: input.reviewerId,
          notes: input.notes,
          completedAt: new Date(),
        },
      });

      await tx.providerApplication.update({
        where: { id: input.applicationId },
        data: { status: input.stage },
      });

      await this.audit.record(
        {
          actor: input.reviewerId,
          action: 'PROVIDER_ONBOARDING_STAGE_COMPLETED',
          entityType: 'ProviderApplication',
          entityId: input.applicationId,
          metadata: { stage: input.stage },
        },
        tx,
      );
    });
  }

  // UX Spec A-04 zero-tolerance gate: true only when every stage, including the
  // final PORTAL_ACCESS_ACTIVATED stage, is logged COMPLETE.
  async isPortalLive(applicationId: string): Promise<boolean> {
    const stages = await this.prisma.providerOnboardingStage.findMany({
      where: { applicationId },
    });

    if (stages.length !== STAGE_ORDER.length) return false;
    return stages.every((s) => s.status === OnboardingStageStatus.COMPLETE);
  }

  async getApplication(applicationId: string) {
    const application = await this.prisma.providerApplication.findUnique({
      where: { id: applicationId },
      include: { stages: true },
    });

    if (!application) {
      throw new NotFoundException(`ProviderApplication ${applicationId} not found`);
    }

    return application;
  }
}
