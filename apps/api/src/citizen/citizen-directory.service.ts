import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(a)) * 10) / 10;
}

function withDistance<T extends { lat?: number | null; lng?: number | null }>(
  rows: T[],
  lat?: number,
  lng?: number,
): Array<T & { distanceKm: number | null }> {
  return rows
    .map((r) => ({
      ...r,
      distanceKm:
        lat != null && lng != null && r.lat != null && r.lng != null
          ? haversineKm(lat, lng, r.lat, r.lng)
          : null,
    }))
    .sort((a, b) => {
      if (a.distanceKm == null && b.distanceKm == null) return 0;
      if (a.distanceKm == null) return 1;
      if (b.distanceKm == null) return -1;
      return a.distanceKm - b.distanceKm;
    });
}

// Modules 3–9 citizen search (FR-DOC / FR-PHR / FR-BLD / FR-DIA / FR-CAN / FR-INS).
@Injectable()
export class CitizenDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async searchDoctors(params: { specialty?: string; q?: string; lat?: number; lng?: number }) {
    const rows = await this.prisma.doctorProfile.findMany({
      where: {
        AND: [
          params.specialty
            ? { specialty: { equals: params.specialty, mode: 'insensitive' } }
            : {},
          params.q
            ? {
                OR: [
                  { name: { contains: params.q, mode: 'insensitive' } },
                  { specialty: { contains: params.q, mode: 'insensitive' } },
                  { hospitalName: { contains: params.q, mode: 'insensitive' } },
                ],
              }
            : {},
        ],
      },
      orderBy: { nextSlotAt: 'asc' },
      take: 50,
    });
    return withDistance(rows, params.lat, params.lng).map((d) => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      hospitalName: d.hospitalName,
      nextSlotAt: d.nextSlotAt,
      isTeleconsult: d.isTeleconsult,
      city: d.city,
      distanceKm: d.distanceKm,
    }));
  }

  async searchPharmacies(params: { medicine?: string; lat?: number; lng?: number }) {
    const medicine = params.medicine?.trim() || 'Insulin';
    const stockRows = await this.prisma.pharmacyStock.findMany({
      where: { medicineName: { contains: medicine, mode: 'insensitive' } },
    });
    const pharmacyIds = [...new Set(stockRows.map((s) => s.pharmacyId))];
    const registries = await this.prisma.pharmacyRegistry.findMany({
      where: { pharmacyId: { in: pharmacyIds } },
    });
    const regMap = new Map(registries.map((r) => [r.pharmacyId, r]));
    const stockMap = new Map(stockRows.map((s) => [s.pharmacyId, s]));

    const combined = pharmacyIds.map((id) => {
      const reg = regMap.get(id);
      const stock = stockMap.get(id)!;
      let status: 'In stock' | 'Low stock' | 'Out of stock' = 'In stock';
      let variant: 'available' | 'low' | 'full' = 'available';
      if (stock.stockCount <= 0) {
        status = 'Out of stock';
        variant = 'full';
      } else if (stock.stockCount <= stock.lowThreshold) {
        status = 'Low stock';
        variant = 'low';
      }
      return {
        pharmacyId: id,
        name: reg?.name ?? id,
        address: reg?.address ?? null,
        city: reg?.city ?? null,
        lat: reg?.lat ?? null,
        lng: reg?.lng ?? null,
        is24x7: reg?.is24x7 ?? false,
        medicineName: stock.medicineName,
        stockCount: stock.stockCount,
        status,
        variant,
      };
    });

    return withDistance(combined, params.lat, params.lng);
  }

  async searchBloodBanks(params: { bloodGroup?: string; lat?: number; lng?: number }) {
    const group = params.bloodGroup ?? 'O+';
    const rows = await this.prisma.bloodBankStock.findMany({
      where: { bloodGroup: group },
      orderBy: { unitsAvailable: 'desc' },
    });
    return withDistance(rows, params.lat, params.lng).map((r) => ({
      bloodBankId: r.bloodBankId,
      name: r.name,
      bloodGroup: r.bloodGroup,
      component: r.component,
      unitsAvailable: r.unitsAvailable,
      city: r.city,
      distanceKm: r.distanceKm,
      status: r.unitsAvailable > 0 ? `${r.bloodGroup} available` : 'Out of stock',
      variant: r.unitsAvailable > 0 ? 'available' : 'full',
    }));
  }

  async searchDiagnostics(params: { q?: string; lat?: number; lng?: number }) {
    const rows = await this.prisma.diagnosticOffering.findMany({
      where: params.q
        ? {
            OR: [
              { testName: { contains: params.q, mode: 'insensitive' } },
              { centerName: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { nextSlotAt: 'asc' },
      take: 50,
    });
    return withDistance(rows, params.lat, params.lng).map((r) => ({
      id: r.id,
      centerName: r.centerName,
      testName: r.testName,
      priceInr: r.priceInr,
      nextSlotAt: r.nextSlotAt,
      city: r.city,
      distanceKm: r.distanceKm,
    }));
  }

  async searchCancerCenters(params: { modality?: string; lat?: number; lng?: number }) {
    const rows = await this.prisma.cancerCenter.findMany({ take: 50 });
    const filtered = params.modality
      ? rows.filter((r) =>
          r.modalities.toLowerCase().includes(params.modality!.toLowerCase()),
        )
      : rows;
    return withDistance(filtered, params.lat, params.lng).map((r) => ({
      id: r.id,
      name: r.name,
      modalities: r.modalities.split(',').map((m) => m.trim()),
      city: r.city,
      distanceKm: r.distanceKm,
    }));
  }

  async getLatestPreAuth(caseId?: string) {
    if (caseId) {
      const row = await this.prisma.insurancePreAuth.findFirst({
        where: { caseId },
        orderBy: { createdAt: 'desc' },
      });
      if (row) return row;
    }
    return this.prisma.insurancePreAuth.findFirst({ orderBy: { createdAt: 'desc' } });
  }
}
