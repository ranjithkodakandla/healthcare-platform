import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderDoctorService } from './provider-doctor.service';

describe('ProviderDoctorService', () => {
  function build() {
    const prisma = {
      doctorProfile: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ProviderDoctorService(prisma as never, audit as never), prisma, audit };
  }

  it('lists doctors scoped to the hospital', async () => {
    const { service, prisma } = build();
    prisma.doctorProfile.findMany.mockResolvedValue([{ id: 'd1' }]);
    const result = await service.list('hosp-1');
    expect(prisma.doctorProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { hospitalId: 'hosp-1' } }),
    );
    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('rejects create with missing name/specialty', async () => {
    const { service } = build();
    await expect(service.create('hosp-1', { name: '', specialty: '' }, 'actor')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('creates a doctor scoped to the hospital and audits it', async () => {
    const { service, prisma, audit } = build();
    prisma.doctorProfile.create.mockResolvedValue({ id: 'd1', name: 'Dr. X', specialty: 'ENT' });
    const result = await service.create('hosp-1', { name: 'Dr. X', specialty: 'ENT' }, 'actor');
    expect(prisma.doctorProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ hospitalId: 'hosp-1', name: 'Dr. X' }) }),
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'HOSPITAL_DOCTOR_ADDED' }));
    expect(result.id).toBe('d1');
  });

  it('throws NotFound when updating/removing a doctor not owned by this hospital', async () => {
    const { service, prisma } = build();
    prisma.doctorProfile.findFirst.mockResolvedValue(null);
    await expect(service.update('hosp-1', 'd1', { name: 'X' }, 'actor')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('hosp-1', 'd1', 'actor')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates and removes an owned doctor', async () => {
    const { service, prisma, audit } = build();
    prisma.doctorProfile.findFirst.mockResolvedValue({ id: 'd1', hospitalId: 'hosp-1' });
    prisma.doctorProfile.update.mockResolvedValue({ id: 'd1', name: 'Dr. Y' });
    const updated = await service.update('hosp-1', 'd1', { name: 'Dr. Y' }, 'actor');
    expect(updated.name).toBe('Dr. Y');

    await service.remove('hosp-1', 'd1', 'actor');
    expect(prisma.doctorProfile.delete).toHaveBeenCalledWith({ where: { id: 'd1' } });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'HOSPITAL_DOCTOR_REMOVED' }));
  });
});
