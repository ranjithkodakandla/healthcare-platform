import { ConsentService } from './consent.service';

describe('ConsentService (unit)', () => {
  function build() {
    const tx = {
      consentGrant: {
        create: jest.fn().mockResolvedValue({ id: 'g1' }),
        update: jest.fn().mockResolvedValue({ id: 'g1', revokedAt: new Date() }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      consentGrant: {
        findFirst: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ConsentService(prisma as never, audit as never), prisma, audit };
  }

  it('grant revoke and isGranted', async () => {
    const { service, prisma, audit } = build();
    await service.grant({ granterId: 'a', granteeId: 'b', purpose: 'CARE' });
    expect(audit.record).toHaveBeenCalled();
    await service.revoke('g1', 'a');
    prisma.consentGrant.findFirst.mockResolvedValueOnce({ id: 'g1' });
    expect(await service.isGranted('a', 'b', 'CARE')).toBe(true);
    prisma.consentGrant.findFirst.mockResolvedValueOnce(null);
    expect(await service.isGranted('a', 'b', 'CARE')).toBe(false);
  });
});
