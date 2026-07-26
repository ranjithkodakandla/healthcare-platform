import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ConfigRow {
  label: string;
  value: string;
}

// P-11 Configuration (F2, G16) — read-only view of platform-wide config groups
// relevant to a provider's own operations. Hold-expiry windows are the same
// `platform_config` rows AdminOpsService.listConfig() reads (BR-02), keyed by case
// severity (CRITICAL/PLANNED) since the fix for PROVIDER_UAT_REPORT.md Finding #7 —
// exposed here read-only so hospital staff can see the real values instead of a
// static mock, without granting provider accounts the full admin config surface.
@Injectable()
export class ProviderConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getHoldExpiryConfig(): Promise<ConfigRow[]> {
    const rows = await this.prisma.platformConfig.findMany({
      where: { groupKey: 'hold_expiry' },
      orderBy: { label: 'asc' },
      select: { label: true, value: true },
    });
    return rows;
  }
}
