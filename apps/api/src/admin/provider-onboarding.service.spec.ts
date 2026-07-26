import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { OnboardingStage, ProviderType } from '@sahayak/shared-constants';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../shared-services/audit/audit.module';
import { ProviderOnboardingService } from './provider-onboarding.service';

// Phase 3 exit criterion: a real hospital can be onboarded end-to-end through the
// stage-gated workflow, matching UX Spec A-04's zero-tolerance audit requirement —
// no provider reaches Portal access without every mandatory stage logged complete.
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('ProviderOnboardingService', () => {
  let service: ProviderOnboardingService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuditModule],
      providers: [ProviderOnboardingService],
    }).compile();

    service = moduleRef.get(ProviderOnboardingService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('is not portal-live until every stage is completed in order, then becomes live', async () => {
    const application = await service.createApplication({
      providerType: ProviderType.HOSPITAL,
      legalName: 'Test General Hospital',
      actor: 'onboarding-specialist-1',
    });

    expect(await service.isPortalLive(application.id)).toBe(false);

    const stages = [
      OnboardingStage.APPLICATION_INTAKE,
      OnboardingStage.CREDENTIAL_VERIFICATION,
      OnboardingStage.INTEGRATION_TEST,
      OnboardingStage.GO_LIVE_APPROVAL,
      OnboardingStage.PORTAL_ACCESS_ACTIVATED,
    ];

    for (const stage of stages.slice(0, -1)) {
      await service.completeStage({ applicationId: application.id, stage, reviewerId: 'reviewer-1' });
      expect(await service.isPortalLive(application.id)).toBe(false);
    }

    await service.completeStage({
      applicationId: application.id,
      stage: stages[stages.length - 1],
      reviewerId: 'reviewer-1',
    });

    expect(await service.isPortalLive(application.id)).toBe(true);

    const auditRows = await prisma.auditLog.findMany({
      where: { entityType: 'ProviderApplication', entityId: application.id },
    });
    // 1 for creation + 5 for each completed stage
    expect(auditRows).toHaveLength(6);
  });

  it('rejects completing a stage out of order', async () => {
    const application = await service.createApplication({
      providerType: ProviderType.PHARMACY,
      legalName: 'Test Pharmacy',
      actor: 'onboarding-specialist-1',
    });

    await expect(
      service.completeStage({
        applicationId: application.id,
        stage: OnboardingStage.INTEGRATION_TEST,
        reviewerId: 'reviewer-1',
      }),
    ).rejects.toMatchObject({ response: { code: 'ONBOARDING_STAGE_OUT_OF_ORDER' } });

    expect(await service.isPortalLive(application.id)).toBe(false);
  });

  it('rejects completing an already-complete stage', async () => {
    const application = await service.createApplication({
      providerType: ProviderType.BLOOD_BANK,
      legalName: 'Test Blood Bank',
      actor: 'onboarding-specialist-1',
    });

    await service.completeStage({
      applicationId: application.id,
      stage: OnboardingStage.APPLICATION_INTAKE,
      reviewerId: 'reviewer-1',
    });

    await expect(
      service.completeStage({
        applicationId: application.id,
        stage: OnboardingStage.APPLICATION_INTAKE,
        reviewerId: 'reviewer-1',
      }),
    ).rejects.toMatchObject({ response: { code: 'ONBOARDING_STAGE_ALREADY_COMPLETE' } });
  });
});
