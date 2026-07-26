import { AuditService } from './audit.service';

describe('AuditService (unit)', () => {
  it('writes via prisma or transaction client', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { auditLog: { create } };
    const service = new AuditService(prisma as never);
    await service.record({ actor: 'a', action: 'X', entityType: 'T', entityId: '1' });
    expect(create).toHaveBeenCalled();
    const txCreate = jest.fn().mockResolvedValue({});
    await service.record(
      { actor: 'a', action: 'Y', entityType: 'T', entityId: '2', metadata: { k: 1 } },
      { auditLog: { create: txCreate } } as never,
    );
    expect(txCreate).toHaveBeenCalled();
  });
});
