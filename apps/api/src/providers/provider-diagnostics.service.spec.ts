import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderDiagnosticsService } from './provider-diagnostics.service';

describe('ProviderDiagnosticsService', () => {
  function build() {
    const prisma = {
      diagnosticOffering: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      hospitalRegistry: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Apollo Test' }),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ProviderDiagnosticsService(prisma as never, audit as never), prisma, audit };
  }

  it('lists offerings scoped to the hospital', async () => {
    const { service, prisma } = build();
    prisma.diagnosticOffering.findMany.mockResolvedValue([{ id: 'o1' }]);
    const result = await service.list('hosp-1');
    expect(prisma.diagnosticOffering.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hospitalId: 'hosp-1' } }),
    );
    expect(result).toEqual([{ id: 'o1' }]);
  });

  it('rejects create with missing testName or negative price', async () => {
    const { service } = build();
    await expect(service.create('hosp-1', { testName: '', priceInr: 100 }, 'actor')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.create('hosp-1', { testName: 'MRI', priceInr: -1 }, 'actor')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates an offering using the hospital registry display name, and audits it', async () => {
    const { service, prisma, audit } = build();
    prisma.diagnosticOffering.create.mockResolvedValue({ id: 'o1', testName: 'MRI', priceInr: 4000 });
    const result = await service.create('hosp-1', { testName: 'MRI', priceInr: 4000 }, 'actor');
    expect(prisma.diagnosticOffering.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ hospitalId: 'hosp-1', centerName: 'Apollo Test', testName: 'MRI' }),
      }),
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'HOSPITAL_DIAGNOSTIC_OFFERING_ADDED' }));
    expect(result.id).toBe('o1');
  });

  it('falls back to hospitalId as centerName when the hospital is not in the registry', async () => {
    const { service, prisma } = build();
    prisma.hospitalRegistry.findUnique.mockResolvedValue(null);
    prisma.diagnosticOffering.create.mockResolvedValue({ id: 'o1' });
    await service.create('hosp-unregistered', { testName: 'X-Ray', priceInr: 500 }, 'actor');
    expect(prisma.diagnosticOffering.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ centerName: 'hosp-unregistered' }) }),
    );
  });

  it('throws NotFound when updating/removing an offering not owned by this hospital', async () => {
    const { service, prisma } = build();
    prisma.diagnosticOffering.findFirst.mockResolvedValue(null);
    await expect(service.update('hosp-1', 'o1', { priceInr: 100 }, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('hosp-1', 'o1', 'actor')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a negative price on update', async () => {
    const { service, prisma } = build();
    prisma.diagnosticOffering.findFirst.mockResolvedValue({ id: 'o1', hospitalId: 'hosp-1' });
    await expect(service.update('hosp-1', 'o1', { priceInr: -5 }, 'actor')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('updates and removes an owned offering', async () => {
    const { service, prisma, audit } = build();
    prisma.diagnosticOffering.findFirst.mockResolvedValue({ id: 'o1', hospitalId: 'hosp-1' });
    prisma.diagnosticOffering.update.mockResolvedValue({ id: 'o1', priceInr: 999 });
    const updated = await service.update('hosp-1', 'o1', { priceInr: 999 }, 'actor');
    expect(updated.priceInr).toBe(999);

    await service.remove('hosp-1', 'o1', 'actor');
    expect(prisma.diagnosticOffering.delete).toHaveBeenCalledWith({ where: { id: 'o1' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'HOSPITAL_DIAGNOSTIC_OFFERING_REMOVED' }));
  });
});
