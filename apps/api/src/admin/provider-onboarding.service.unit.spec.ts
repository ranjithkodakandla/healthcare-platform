import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OnboardingStage, OnboardingStageStatus, ProviderType, Role } from '@sahayak/shared-constants';

jest.mock('firebase-admin', () => {
  const getUserByEmail = jest.fn();
  const updateUser = jest.fn();
  const createUser = jest.fn();
  const setCustomUserClaims = jest.fn();
  const initializeApp = jest.fn(() => ({ name: 'app' }));
  const auth = jest.fn(() => ({ getUserByEmail, updateUser, createUser, setCustomUserClaims }));
  const api = {
    apps: [] as unknown[],
    app: jest.fn(() => ({ name: 'app' })),
    initializeApp,
    auth,
    credential: { cert: jest.fn(() => 'cert'), applicationDefault: jest.fn(() => 'adc') },
  };
  return { __esModule: true, default: api, ...api };
});

import * as admin from 'firebase-admin';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { resetFirebaseAdminAppCache } from '../shared-services/auth/firebase-admin.app';

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
    const config = {
      get: (k: string) => (k === 'FIREBASE_PROJECT_ID' ? 'sahyak' : 'ADC'),
    };
    return {
      service: new ProviderOnboardingService(prisma as never, audit as never, config as never),
      prisma,
      tx,
      audit,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    resetFirebaseAdminAppCache();
    (admin as unknown as { apps: unknown[] }).apps = [];
  });

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

  it('createApplication with credentials stamps role/orgId/providerType claims (not just role/orgId)', async () => {
    const { service } = build();
    const authApi = (admin.auth as unknown as jest.Mock)();
    authApi.getUserByEmail.mockRejectedValue({ code: 'auth/user-not-found' });
    authApi.createUser.mockResolvedValue({ uid: 'new-uid' });

    await service.createApplication({
      providerType: ProviderType.HOSPITAL,
      legalName: 'Apollo Test',
      actor: 'reviewer-1',
      orgId: 'hos-test',
      portalEmail: 'ranjith@sahyak.test',
      portalPassword: 'password123',
    });

    expect(authApi.setCustomUserClaims).toHaveBeenCalledWith('new-uid', expect.objectContaining({
      role: Role.PROVIDER_STAFF,
      orgId: 'hos-test',
      providerType: ProviderType.HOSPITAL,
    }));
  });

  it('resyncPortalClaims backfills providerType for an already-provisioned account without touching its password', async () => {
    const { service, prisma } = build();
    prisma.providerApplication.findUnique.mockResolvedValueOnce({
      id: 'app1',
      orgId: 'hos-test',
      portalEmail: 'ranjith@sahyak.test',
      providerType: ProviderType.HOSPITAL,
    });
    const authApi = (admin.auth as unknown as jest.Mock)();
    authApi.getUserByEmail.mockResolvedValue({ uid: 'existing-uid' });

    const result = await service.resyncPortalClaims('app1', 'reviewer-1');

    expect(authApi.updateUser).not.toHaveBeenCalled();
    expect(authApi.setCustomUserClaims).toHaveBeenCalledWith('existing-uid', expect.objectContaining({
      role: Role.PROVIDER_STAFF,
      orgId: 'hos-test',
      providerType: ProviderType.HOSPITAL,
    }));
    expect(result).toEqual({ email: 'ranjith@sahyak.test', orgId: 'hos-test', providerType: ProviderType.HOSPITAL });
  });

  it('resyncPortalClaims rejects an application with no provisioned credentials', async () => {
    const { service, prisma } = build();
    prisma.providerApplication.findUnique.mockResolvedValueOnce({ id: 'app2', orgId: null, portalEmail: null });
    await expect(service.resyncPortalClaims('app2', 'reviewer-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resyncPortalClaims rejects an unknown application', async () => {
    const { service, prisma } = build();
    prisma.providerApplication.findUnique.mockResolvedValueOnce(null);
    await expect(service.resyncPortalClaims('missing', 'reviewer-1')).rejects.toBeInstanceOf(NotFoundException);
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
