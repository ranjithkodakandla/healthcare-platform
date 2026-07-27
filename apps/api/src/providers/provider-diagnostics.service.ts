import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';

export interface UpsertDiagnosticOfferingInput {
  testName: string;
  priceInr: number;
  nextSlotAt?: string;
  city?: string;
}

// Hospital in-house Diagnostics department — same in-house-department model as
// ProviderDoctorService. DiagnosticOffering.centerName is kept human-readable
// (denormalized) since the citizen-facing search table has no FK to a hospital
// registry row (M23); hospitalId is the real ownership key.
@Injectable()
export class ProviderDiagnosticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(hospitalId: string) {
    return this.prisma.diagnosticOffering.findMany({
      where: { hospitalId },
      orderBy: { testName: 'asc' },
    });
  }

  async create(hospitalId: string, input: UpsertDiagnosticOfferingInput, actor: string) {
    if (!input.testName?.trim()) {
      throw new BadRequestException('testName is required');
    }
    if (input.priceInr == null || input.priceInr < 0) {
      throw new BadRequestException('priceInr must be a non-negative number');
    }
    const hospital = await this.prisma.hospitalRegistry.findUnique({ where: { hospitalId } });
    const created = await this.prisma.diagnosticOffering.create({
      data: {
        hospitalId,
        centerName: hospital?.name ?? hospitalId,
        testName: input.testName.trim(),
        priceInr: input.priceInr,
        nextSlotAt: input.nextSlotAt ? new Date(input.nextSlotAt) : null,
        city: input.city?.trim() || null,
      },
    });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DIAGNOSTIC_OFFERING_ADDED',
      entityType: 'DiagnosticOffering',
      entityId: created.id,
      metadata: { hospitalId, testName: created.testName },
    });
    return created;
  }

  private async requireOwned(hospitalId: string, id: string) {
    const existing = await this.prisma.diagnosticOffering.findFirst({ where: { id, hospitalId } });
    if (!existing) {
      throw new NotFoundException(`Diagnostic offering ${id} not found for this hospital`);
    }
    return existing;
  }

  async update(hospitalId: string, id: string, input: Partial<UpsertDiagnosticOfferingInput>, actor: string) {
    await this.requireOwned(hospitalId, id);
    if (input.priceInr != null && input.priceInr < 0) {
      throw new BadRequestException('priceInr must be a non-negative number');
    }
    const updated = await this.prisma.diagnosticOffering.update({
      where: { id },
      data: {
        ...(input.testName != null ? { testName: input.testName.trim() } : {}),
        ...(input.priceInr != null ? { priceInr: input.priceInr } : {}),
        ...(input.nextSlotAt !== undefined ? { nextSlotAt: input.nextSlotAt ? new Date(input.nextSlotAt) : null } : {}),
        ...(input.city !== undefined ? { city: input.city?.trim() || null } : {}),
      },
    });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DIAGNOSTIC_OFFERING_UPDATED',
      entityType: 'DiagnosticOffering',
      entityId: id,
      metadata: { hospitalId },
    });
    return updated;
  }

  async remove(hospitalId: string, id: string, actor: string) {
    await this.requireOwned(hospitalId, id);
    await this.prisma.diagnosticOffering.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'HOSPITAL_DIAGNOSTIC_OFFERING_REMOVED',
      entityType: 'DiagnosticOffering',
      entityId: id,
      metadata: { hospitalId },
    });
  }
}
