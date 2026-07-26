import { OnboardingStage } from '@sahayak/shared-constants';
import { AdminController } from './admin.controller';

describe('AdminController (unit)', () => {
  it('covers onboarding and console-user routes', async () => {
    const onboarding = {
      createApplication: jest.fn().mockResolvedValue({ id: 'a1' }),
      getApplication: jest.fn().mockResolvedValue({
        id: 'a1',
        providerType: 'HOSPITAL',
        stages: [{ stage: OnboardingStage.APPLICATION_INTAKE, status: 'PENDING' }],
      }),
      completeStage: jest.fn().mockResolvedValue(undefined),
      isPortalLive: jest.fn().mockResolvedValue(true),
      nextPendingStage: jest.fn().mockReturnValue(OnboardingStage.APPLICATION_INTAKE),
      listVerificationDocuments: jest.fn().mockReturnValue([]),
      credentialChecklist: jest.fn().mockReturnValue([]),
      getVerificationDocument: jest.fn().mockResolvedValue({
        filename: 'doc.pdf',
        body: Buffer.from('pdf'),
      }),
    };
    const consoleUsers = {
      requireConsoleRole: jest.fn().mockResolvedValue({}),
      listConsoleUsers: jest.fn().mockResolvedValue([{ id: 'u1' }]),
      createConsoleUser: jest.fn().mockResolvedValue({ id: 'u1' }),
      updateConsoleUser: jest.fn().mockResolvedValue({ id: 'u1', status: 'ACTIVE' }),
    };
    const c = new AdminController(onboarding as never, consoleUsers as never);
    const user = { uid: 'admin' };
    await c.createApplication({ providerType: 'HOSPITAL', legalName: 'X' } as never, user as never);
    await c.getApplication('a1', user as never);
    await c.approveStage(
      'a1',
      OnboardingStage.APPLICATION_INTAKE,
      { reviewerId: 'r', notes: 'n' } as never,
      user as never,
    );
    await c.listConsoleUsers(user as never);
    await c.createConsoleUser({ email: 'a@b.co', role: 'CONSOLE_ADMINISTRATOR' } as never, user as never);
    expect(onboarding.isPortalLive).toHaveBeenCalled();
  });
});
