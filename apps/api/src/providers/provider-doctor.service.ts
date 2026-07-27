import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';

export interface UpsertDoctorInput {
  name: string;
  specialty: string;
  isTeleconsult?: boolean;
  nextSlotAt?: string;
  city?: string;
}

// Hospital in-house Doctors department (full add/update/view/delete, per the
// "in-house department" model chosen over independent-partner — see
// IMPLEMENTATION_MASTER_PLAN.md Decision Log). Doctors owned by a hospital are
// DoctorProfile rows with `hospitalId` set to that hospital's own orgId — same
// table the citizen-facing directory search already reads, so an in-house doctor
// a hospital adds here is immediately searchable, no separate sync step.
@Injectable()
export class ProviderDoctorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(hospitalId: string) {
    return this.prisma.doctorProfile.findMany({
      where: { hospitalId },
      orderBy: { name: 'asc' },
    });
  }

  async create(hospitalId: string, input: UpsertDoctorInput, actor: string) {
    if (!input.name?.trim() || !input.specialty?.trim()) {
      throw new BadRequestException('name and specialty are required');
    }
    const created = await this.prisma.doctorProfile.create({
      data: {
        hospitalId,
        name: input.name.trim(),
        specialty: input.specialty.trim(),
        isTeleconsult: input.isTeleconsult ?? false,
        nextSlotAt: input.nextSlotAt ? new Date(input.nextSlotAt) : null,
        city: input.city?.trim() || null,
      },
    });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DOCTOR_ADDED',
      entityType: 'DoctorProfile',
      entityId: created.id,
      metadata: { hospitalId, name: created.name, specialty: created.specialty },
    });
    return created;
  }

  private async requireOwned(hospitalId: string, id: string) {
    const existing = await this.prisma.doctorProfile.findFirst({ where: { id, hospitalId } });
    if (!existing) {
      throw new NotFoundException(`Doctor ${id} not found for this hospital`);
    }
    return existing;
  }

  async update(hospitalId: string, id: string, input: Partial<UpsertDoctorInput>, actor: string) {
    await this.requireOwned(hospitalId, id);
    const updated = await this.prisma.doctorProfile.update({
      where: { id },
      data: {
        ...(input.name != null ? { name: input.name.trim() } : {}),
        ...(input.specialty != null ? { specialty: input.specialty.trim() } : {}),
        ...(input.isTeleconsult != null ? { isTeleconsult: input.isTeleconsult } : {}),
        ...(input.nextSlotAt !== undefined ? { nextSlotAt: input.nextSlotAt ? new Date(input.nextSlotAt) : null } : {}),
        ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
      },
    });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DOCTOR_UPDATED',
      entityType: 'DoctorProfile',
      entityId: id,
      metadata: { hospitalId },
    });
    return updated;
  }

  async remove(hospitalId: string, id: string, actor: string) {
    await this.requireOwned(hospitalId, id);
    await this.prisma.doctorProfile.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DOCTOR_REMOVED',
      entityType: 'DoctorProfile',
      entityId: id,
      metadata: { hospitalId },
    });
  }
}
