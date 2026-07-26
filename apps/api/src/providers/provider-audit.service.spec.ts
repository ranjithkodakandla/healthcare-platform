import { ProviderAuditService } from './provider-audit.service';

describe('ProviderAuditService', () => {
  it('filters audit_log rows by metadata.hospitalId, newest first', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 'a1' }]);
    const service = new ProviderAuditService({ auditLog: { findMany } } as never);

    const rows = await service.listForHospital('hosp-apollo-blr');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { metadata: { path: ['hospitalId'], equals: 'hosp-apollo-blr' } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    );
    expect(rows).toEqual([{ id: 'a1' }]);
  });
});
