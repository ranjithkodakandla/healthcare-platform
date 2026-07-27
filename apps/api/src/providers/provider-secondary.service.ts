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

  // Adding/removing vehicles is the "full CRUD" half of fleet management — status
  // updates (above) already existed. `driverUid` isn't a real citizen account for an
  // in-house/manually-added vehicle, so we generate a synthetic one; a real driver
  // app account can be linked later by updating this row (out of scope here).
  async createDriver(
    operatorId: string,
    input: { vehicleReg: string; vehicleType?: string; driverName?: string },
    actor: string,
  ) {
    if (!input.vehicleReg?.trim()) {
      throw new BadRequestException('vehicleReg is required');
    }
    const allowedTypes = ['BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT'];
    const vehicleType = input.vehicleType ?? 'BASIC_LIFE_SUPPORT';
    if (!allowedTypes.includes(vehicleType)) {
      throw new BadRequestException(`vehicleType must be one of ${allowedTypes.join(', ')}`);
    }
    const created = await this.prisma.ambulanceDriver.create({
      data: {
        driverUid: `manual-${operatorId}-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
        operatorId,
        displayName: input.driverName?.trim() || null,
        vehicleReg: input.vehicleReg.trim(),
        vehicleType,
        fleetStatus: 'OFF_DUTY',
        isOnDuty: false,
      },
    });
    await this.audit.record({
      actor,
      action: 'FLEET_VEHICLE_ADDED',
      entityType: 'AmbulanceDriver',
      entityId: created.id,
      metadata: { operatorId, vehicleReg: created.vehicleReg },
    });
    return created;
  }

  async deleteDriver(operatorId: string, driverId: string, actor: string) {
    const existing = await this.prisma.ambulanceDriver.findFirst({
      where: { id: driverId, operatorId },
    });
    if (!existing) throw new NotFoundException(`Driver ${driverId} not found for operator`);
    await this.prisma.ambulanceDriver.delete({ where: { id: driverId } });
    await this.audit.record({
      actor,
      action: 'FLEET_VEHICLE_REMOVED',
      entityType: 'AmbulanceDriver',
      entityId: driverId,
      metadata: { operatorId },
    });
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

  async deletePharmacyItem(pharmacyId: string, itemId: string, actor: string) {
    const existing = await this.prisma.pharmacyStock.findFirst({
      where: { id: itemId, pharmacyId },
    });
    if (!existing) throw new NotFoundException(`Pharmacy stock item ${itemId} not found`);
    await this.prisma.pharmacyStock.delete({ where: { id: itemId } });
    await this.audit.record({
      actor,
      action: 'PHARMACY_STOCK_ITEM_REMOVED',
      entityType: 'PharmacyStock',
      entityId: itemId,
      metadata: { pharmacyId, medicineName: existing.medicineName },
    });
  }

  // ── Blood Bank Stock (in-house inventory CRUD) ──────────────────────────────
  // Distinct from the pre-alert queue above (that's a triage inbox; this is the
  // actual unit inventory a hospital's own blood bank department manages).

  async getBloodStock(bloodBankId: string) {
    return this.prisma.bloodBankStock.findMany({
      where: { bloodBankId },
      orderBy: [{ bloodGroup: 'asc' }, { component: 'asc' }],
    });
  }

  async createBloodStock(
    bloodBankId: string,
    input: { bloodGroup: string; component?: string; unitsAvailable: number; name?: string },
    actor: string,
  ) {
    if (!input.bloodGroup?.trim()) {
      throw new BadRequestException('bloodGroup is required');
    }
    if (input.unitsAvailable == null || input.unitsAvailable < 0) {
      throw new BadRequestException('unitsAvailable must be a non-negative number');
    }
    const created = await this.prisma.bloodBankStock.upsert({
      where: {
        bloodBankId_bloodGroup_component: {
          bloodBankId,
          bloodGroup: input.bloodGroup.trim(),
          component: input.component ?? 'WHOLE_BLOOD',
        },
      },
      create: {
        bloodBankId,
        name: input.name?.trim() || bloodBankId,
        bloodGroup: input.bloodGroup.trim(),
        component: input.component ?? 'WHOLE_BLOOD',
        unitsAvailable: input.unitsAvailable,
      },
      update: { unitsAvailable: input.unitsAvailable },
    });
    await this.audit.record({
      actor,
      action: 'BLOOD_STOCK_ADDED',
      entityType: 'BloodBankStock',
      entityId: created.id,
      metadata: { bloodBankId, bloodGroup: created.bloodGroup, component: created.component },
    });
    return created;
  }

  async updateBloodStock(bloodBankId: string, id: string, unitsAvailable: number, actor: string) {
    if (unitsAvailable == null || unitsAvailable < 0) {
      throw new BadRequestException('unitsAvailable must be a non-negative number');
    }
    const existing = await this.prisma.bloodBankStock.findFirst({ where: { id, bloodBankId } });
    if (!existing) throw new NotFoundException(`Blood stock ${id} not found`);
    const updated = await this.prisma.bloodBankStock.update({
      where: { id },
      data: { unitsAvailable },
    });
    await this.audit.record({
      actor,
      action: 'BLOOD_STOCK_UPDATED',
      entityType: 'BloodBankStock',
      entityId: id,
      metadata: { bloodBankId, unitsAvailable },
    });
    return updated;
  }

  async deleteBloodStock(bloodBankId: string, id: string, actor: string) {
    const existing = await this.prisma.bloodBankStock.findFirst({ where: { id, bloodBankId } });
    if (!existing) throw new NotFoundException(`Blood stock ${id} not found`);
    await this.prisma.bloodBankStock.delete({ where: { id } });
    await this.audit.record({
      actor,
      action: 'BLOOD_STOCK_REMOVED',
      entityType: 'BloodBankStock',
      entityId: id,
      metadata: { bloodBankId },
    });
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
