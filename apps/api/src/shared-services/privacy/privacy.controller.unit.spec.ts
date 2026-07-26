import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';

describe('PrivacyController', () => {
  const privacy = {
    getMyDataSummary: jest.fn().mockResolvedValue({ subjectId: 'u1', activeConsents: 1 }),
    exportMyData: jest.fn().mockResolvedValue({ subjectId: 'u1' }),
    listConsents: jest.fn().mockResolvedValue([]),
    acceptPolicies: jest.fn().mockResolvedValue({ accepted: ['PRIVACY_POLICY:v1.0.0'] }),
    revokeConsent: jest.fn().mockResolvedValue({ id: 'c1', revokedAt: new Date() }),
    requestErasure: jest.fn().mockResolvedValue({ status: 'completed' }),
    getRetentionPolicy: jest.fn().mockResolvedValue({ locationPreciseDays: 90 }),
  };

  const controller = new PrivacyController(privacy as unknown as PrivacyService);
  const user = { uid: 'u1', role: 'CITIZEN' } as never;

  it('returns public notices', () => {
    const res = controller.notices();
    expect(res.data.privacyPolicyVersion).toBeDefined();
    expect(res.data.contact).toContain('privacy@');
  });

  it('delegates me/export/consents', async () => {
    await expect(controller.me(user)).resolves.toEqual({
      data: expect.objectContaining({ subjectId: 'u1' }),
    });
    await expect(controller.export(user)).resolves.toEqual({
      data: expect.objectContaining({ subjectId: 'u1' }),
    });
    await expect(controller.consents(user)).resolves.toEqual({ data: [] });
  });

  it('accepts and revokes consents', async () => {
    await controller.accept(user, { privacyPolicy: true });
    expect(privacy.acceptPolicies).toHaveBeenCalledWith('u1', { privacyPolicy: true });
    await controller.revoke(user, 'c1');
    expect(privacy.revokeConsent).toHaveBeenCalledWith('u1', 'c1');
  });

  it('requires confirm for erasure', async () => {
    const pending = await controller.erasure(user, {});
    expect(pending.data.status).toBe('confirmation_required');
    await controller.erasure(user, { confirm: true, reason: 'test' });
    expect(privacy.requestErasure).toHaveBeenCalledWith('u1', 'test');
  });

  it('returns retention for admin', async () => {
    await expect(controller.retention()).resolves.toEqual({
      data: expect.objectContaining({ locationPreciseDays: 90 }),
    });
  });
});
