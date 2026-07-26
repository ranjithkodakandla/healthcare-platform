import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OnboardingStage, OnboardingStageStatus, ProviderType } from '@sahayak/shared-constants';
import { ProviderOnboardingService } from './provider-onboarding.service';

describe('ProviderOnboardingService (unit)', () => {
  function build() {
    const tx = {
      providerApplication: {
        create: jest.fn().mockResolvedValue({ id: 'app1' }),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      providerOnboardingStage: {
        createMany: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      hospitalRegistry: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      providerOnboardingStage: { findMany: jest.fn() },
      providerApplication: { findUnique: jest.fn() },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    return {
      service: new ProviderOnboardingService(prisma as never, audit as never, config as never),
      prisma,
      tx,
    };
  }

  it('createApplication seeds stages', async () => {
    const { service, tx } = build();
    await service.createApplication({
      providerType: ProviderType.HOSPITAL,
      legalName: 'X',
      actor: 'a',
    });
    expect(tx.providerOnboardingStage.createMany).toHaveBeenCalled();
  });

  it('completeStage enforces order and completeness', async () => {
    const { service, tx } = build();
    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([]);
    await expect(
      service.completeStage({
        applicationId: 'app1',
        stage: OnboardingStage.APPLICATION_INTAKE,
        reviewerId: 'r',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.COMPLETE },
    ]);
    await expect(
      service.completeStage({
        applicationId: 'app1',
        stage: OnboardingStage.CREDENTIAL_VERIFICATION,
        reviewerId: 'r',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.COMPLETE },
      { id: 's2', stage: OnboardingStage.CREDENTIAL_VERIFICATION, status: OnboardingStageStatus.COMPLETE },
    ]);
    await expect(
      service.completeStage({
        applicationId: 'app1',
        stage: OnboardingStage.CREDENTIAL_VERIFICATION,
        reviewerId: 'r',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.PENDING },
      { id: 's2', stage: OnboardingStage.CREDENTIAL_VERIFICATION, status: OnboardingStageStatus.PENDING },
    ]);
    await expect(
      service.completeStage({
        applicationId: 'app1',
        stage: OnboardingStage.CREDENTIAL_VERIFICATION,
        reviewerId: 'r',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.PENDING },
      { id: 's2', stage: OnboardingStage.CREDENTIAL_VERIFICATION, status: OnboardingStageStatus.PENDING },
    ]);
    await service.completeStage({
      applicationId: 'app1',
      stage: OnboardingStage.APPLICATION_INTAKE,
      reviewerId: 'r',
      notes: 'ok',
    });

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.COMPLETE },
      { id: 's2', stage: OnboardingStage.CREDENTIAL_VERIFICATION, status: OnboardingStageStatus.PENDING },
    ]);
    await expect(
      service.completeStage({
        applicationId: 'app1',
        stage: OnboardingStage.CREDENTIAL_VERIFICATION,
        reviewerId: 'r',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    tx.providerOnboardingStage.findMany.mockResolvedValueOnce([
      { id: 's1', stage: OnboardingStage.APPLICATION_INTAKE, status: OnboardingStageStatus.COMPLETE },
      { id: 's2', stage: OnboardingStage.CREDENTIAL_VERIFICATION, status: OnboardingStageStatus.PENDING },
    ]);
    await service.completeStage({
      applicationId: 'app1',
      stage: OnboardingStage.CREDENTIAL_VERIFICATION,
      reviewerId: 'r',
      checklistComplete: true,
      notes: 'docs ok',
    });
  });

  it('isPortalLive and getApplication', async () => {
    const { service, prisma } = build();
    prisma.providerOnboardingStage.findMany.mockResolvedValueOnce([{ status: 'PENDING' }]);
    expect(await service.isPortalLive('a')).toBe(false);
    prisma.providerOnboardingStage.findMany.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => ({
        status: OnboardingStageStatus.COMPLETE,
        stage: i,
      })),
    );
    expect(await service.isPortalLive('a')).toBe(true);
    prisma.providerApplication.findUnique.mockResolvedValueOnce(null);
    await expect(service.getApplication('x')).rejects.toBeInstanceOf(NotFoundException);
    prisma.providerApplication.findUnique.mockResolvedValueOnce({ id: 'a' });
    await expect(service.getApplication('a')).resolves.toEqual({ id: 'a' });
  });
});
