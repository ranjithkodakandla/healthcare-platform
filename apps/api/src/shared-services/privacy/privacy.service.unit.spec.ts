import { PrivacyService } from './privacy.service';
import { redactLocationJson, sanitizeForAi } from './pii-sanitize.util';
import { maskLogText, maskPhone } from './log-mask.util';

describe('privacy utilities', () => {
  it('masks phones and tokens in logs', () => {
    expect(maskPhone('+919876543210')).toContain('••••');
    expect(maskLogText('Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb call +919876543210')).toContain('[token]');
    expect(maskLogText('otp 123456 sent')).toContain('[otp]');
  });

  it('sanitizes AI prompts', () => {
    const s = sanitizeForAi('Call me at +91 98765 43210 email a@b.com my name is Ravi Kumar unconscious');
    expect(s).not.toMatch(/98765/);
    expect(s).toContain('[phone]');
    expect(s).toContain('[email]');
  });

  it('redacts location json', () => {
    const out = redactLocationJson({
      lat: 12.9716,
      lng: 77.5946,
      address: '12 MG Road',
      phone: '+919999999999',
    });
    expect(out.phone).toBeUndefined();
    expect(out.address).toBe('[redacted address]');
    expect(out.precision).toBe('coarse');
  });
});

describe('PrivacyService', () => {
  function build() {
    const prisma: Record<string, unknown> = {
      platformConfig: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({}),
      },
      consentGrant: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
        update: jest.fn(),
      },
      case: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    };
    prisma.$transaction = jest.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prisma));
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const consent = {
      grant: jest.fn().mockResolvedValue({ id: 'g1' }),
      revoke: jest.fn().mockResolvedValue({ id: 'g1', revokedAt: new Date() }),
      isGranted: jest.fn().mockResolvedValue(false),
    };
    return {
      service: new PrivacyService(prisma as never, audit as never, consent as never),
      prisma,
      audit,
      consent,
    };
  }

  it('exports subject data and audits', async () => {
    const { service, audit } = build();
    const data = await service.exportMyData('uid-1');
    expect(data.subjectId).toBe('uid-1');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_EXPORT' }),
    );
  });

  it('accepts privacy policy', async () => {
    const { service, consent } = build();
    const res = await service.acceptPolicies('uid-1', {
      privacyPolicy: true,
      terms: true,
      emergencyProcessing: true,
    });
    expect(res.accepted.length).toBe(3);
    expect(consent.grant).toHaveBeenCalled();
  });

  it('summarizes subject data and loads retention defaults', async () => {
    const { service, prisma } = build();
    const summary = await service.getMyDataSummary('uid-1');
    expect(summary.rights).toContain('export');
    await service.ensureRetentionDefaults();
    expect((prisma.platformConfig as { upsert: jest.Mock }).upsert).toHaveBeenCalled();
    const policy = await service.getRetentionPolicy();
    expect(policy.locationPreciseDays).toBe(90);
  });

  it('revokes consent owned by subject', async () => {
    const { service, prisma, consent } = build();
    (prisma.consentGrant as { findUnique: jest.Mock }).findUnique.mockResolvedValue({
      id: 'g1',
      granterId: 'uid-1',
      revokedAt: null,
    });
    await service.revokeConsent('uid-1', 'g1');
    expect(consent.revoke).toHaveBeenCalledWith('g1', 'uid-1');
  });

  it('applies location retention on closed cases', async () => {
    const { service, prisma, audit } = build();
    (prisma.case as { findMany: jest.Mock }).findMany.mockResolvedValue([
      {
        id: 'c1',
        location: { lat: 12.97, lng: 77.59, address: 'x' },
        status: 'CLOSED',
      },
    ]);
    const n = await service.applyLocationRetention();
    expect(n).toBe(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOCATION_RETENTION_APPLIED' }),
    );
  });

  it('erasure anonymizes cases', async () => {
    const { service, prisma, audit } = build();
    const caseApi = prisma.case as { findMany: jest.Mock };
    caseApi.findMany.mockResolvedValue([
      {
        id: 'c1',
        location: { lat: 12.97, lng: 77.59, phone: '+91' },
        primaryPatientId: 'uid-1',
        initiatorId: 'uid-1',
      },
    ]);
    const res = await service.requestErasure('uid-1', 'test');
    expect(res.status).toBe('completed');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'DATA_ERASURE_COMPLETED' }),
    );
  });
});
