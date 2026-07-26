import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProviderAuditRow {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
  metadata: unknown;
}

// P-12 Audit Logs (F2, GT-06). Every provider-facing mutation (bed updates, hold
// confirm/decline, clinical-ack, user invites) already calls AuditService.record with
// `hospitalId` in its metadata — this just reads those rows back scoped to the
// caller's own org, replacing the previous hardcoded static array
// (PROVIDER_UAT_REPORT.md Finding #8: audit writing was already correct, only the
// portal's *display* of it was fake).
@Injectable()
export class ProviderAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async listForHospital(hospitalId: string, limit = 50): Promise<ProviderAuditRow[]> {
    return this.prisma.auditLog.findMany({
      where: { metadata: { path: ['hospitalId'], equals: hospitalId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
