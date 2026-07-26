import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../shared-services/audit/audit.service';

export type StockFlag = 'OK' | 'Low' | 'Critical';

function stockFlag(count: number, low: number, critical: number): StockFlag {
  if (count <= critical) return 'Critical';
  if (count <= low) return 'Low';
  return 'OK';
}

// P-14 / P-15 / P-16 — provider secondary module services (pharmacy, fleet, blood).
@Injectable()
export class ProviderSecondaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── P-14 Fleet Roster (FR-AMBP-001) ────────────────────────────────────────

  async getFleet(operatorId: string) {
    const drivers = await this.prisma.ambulanceDriver.findMany({
      where: { operatorId },
      orderBy: { vehicleReg: 'asc' },
    });
    return drivers.map((d) => ({
      id: d.id,
      vehicleReg: d.vehicleReg,
      driverName: d.displayName ?? d.driverUid,
      vehicleType: d.vehicleType,
      fleetStatus: d.fleetStatus,
      isOnDuty: d.isOnDuty,
      lastLat: d.lastLat,
      lastLng: d.lastLng,
      lastPingAt: d.lastPingAt,
    }));
  }

  async updateFleetStatus(operatorId: string, driverId: string, fleetStatus: string, actor: string) {
    const allowed = ['AVAILABLE', 'EN_ROUTE', 'MAINTENANCE', 'OFF_DUTY'];
    if (!allowed.includes(fleetStatus)) {
      throw new BadRequestException(`fleetStatus must be one of ${allowed.join(', ')}`);
    }
    const existing = await this.prisma.ambulanceDriver.findFirst({
      where: { id: driverId, operatorId },
    });
    if (!existing) throw new NotFoundException(`Driver ${driverId} not found for operator`);

    const updated = await this.prisma.ambulanceDriver.update({
      where: { id: driverId },
      data: {
        fleetStatus,
        isOnDuty: fleetStatus === 'AVAILABLE' || fleetStatus === 'EN_ROUTE',
      },
    });
    await this.audit.record({
      actor,
      action: 'FLEET_STATUS_UPDATED',
      entityType: 'AmbulanceDriver',
      entityId: driverId,
      metadata: { operatorId, fleetStatus },
    });
    return updated;
  }

  // ── P-15 Pharmacy Stock (FR-PHR-009 / FR-PHRP-001) ──────────────────────────

  async getPharmacyStock(pharmacyId: string, q?: string) {
    const rows = await this.prisma.pharmacyStock.findMany({
      where: {
        pharmacyId,
        ...(q
          ? { medicineName: { contains: q, mode: 'insensitive' as const } }
          : {}),
      },
      orderBy: { medicineName: 'asc' },
    });
    return rows.map((r) => ({
      id: r.id,
      medicineName: r.medicineName,
      category: r.category,
      stockCount: r.stockCount,
      flag: stockFlag(r.stockCount, r.lowThreshold, r.criticalThreshold),
      lastUpdatedAt: r.lastUpdatedAt,
    }));
  }

  async updatePharmacyStock(
    pharmacyId: string,
    updates: Array<{ medicineName: string; stockCount: number }>,
    actor: string,
  ) {
    const results = [];
    for (const u of updates) {
      if (u.stockCount < 0) {
        throw new BadRequestException(`stockCount cannot be negative for ${u.medicineName}`);
      }
      const row = await this.prisma.pharmacyStock.upsert({
        where: {
          pharmacyId_medicineName: { pharmacyId, medicineName: u.medicineName },
        },
        create: {
          pharmacyId,
          medicineName: u.medicineName,
          category: 'General',
          stockCount: u.stockCount,
          lastUpdatedAt: new Date(),
          lastUpdatedBy: actor,
        },
        update: {
          stockCount: u.stockCount,
          lastUpdatedAt: new Date(),
          lastUpdatedBy: actor,
        },
      });
      results.push({
        id: row.id,
        medicineName: row.medicineName,
        category: row.category,
        stockCount: row.stockCount,
        flag: stockFlag(row.stockCount, row.lowThreshold, row.criticalThreshold),
      });
    }
    await this.audit.record({
      actor,
      action: 'PHARMACY_STOCK_UPDATED',
      entityType: 'PharmacyStock',
      entityId: pharmacyId,
      metadata: { updatedCount: results.length },
    });
    return results;
  }

  // ── P-16 Blood Pre-Alert Queue (FR-BLD-001 / FR-BLDP-001) ───────────────────

  async getBloodPreAlerts(bloodBankId: string) {
    const rows = await this.prisma.bloodPreAlert.findMany({
      where: { bloodBankId, status: 'OPEN' },
      orderBy: { createdAt: 'desc' },
    });
    return {
      aiPreAlerts: rows
        .filter((r) => r.sourceType === 'AI_PREALERT')
        .map((r) => ({
          id: r.id,
          bloodGroup: r.bloodGroup,
          units: r.units,
          urgency: r.urgency,
          reason: r.reason,
          caseId: r.caseId,
        })),
      explicitRequests: rows
        .filter((r) => r.sourceType === 'EXPLICIT_REQUEST')
        .map((r) => ({
          id: r.id,
          bloodGroup: r.bloodGroup,
          units: r.units,
          urgency: r.urgency,
          reason: r.reason,
          caseId: r.caseId,
        })),
    };
  }

  async acknowledgeBloodAlert(bloodBankId: string, alertId: string, actor: string) {
    const existing = await this.prisma.bloodPreAlert.findFirst({
      where: { id: alertId, bloodBankId },
    });
    if (!existing) throw new NotFoundException(`BloodPreAlert ${alertId} not found`);
    const updated = await this.prisma.bloodPreAlert.update({
      where: { id: alertId },
      data: { status: 'ACKNOWLEDGED' },
    });
    await this.audit.record({
      actor,
      action: 'BLOOD_PRE_ALERT_ACKNOWLEDGED',
      entityType: 'BloodPreAlert',
      entityId: alertId,
      metadata: { bloodBankId, bloodGroup: existing.bloodGroup },
    });
    return updated;
  }
}
