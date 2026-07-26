import { Injectable } from '@nestjs/common';
import { AiCapability, BedCategory, BedInventoryStatus } from '@sahayak/shared-constants';
import { PrismaService } from '../prisma/prisma.service';
import { AiPlatformClient } from '../shared-services/ai/ai-platform.client';
import {
  applyOrderedKeys,
  bedRankKey,
  rankBeds,
} from '../shared-services/ai/deterministic-ranking';

export interface BedSearchResult {
  hospitalId: string;
  hospitalName: string | null;
  city: string | null;
  address: string | null;
  category: string;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  occupancyPercent: number;
  stalenessStatus: string;
  lastUpdatedAt: Date;
  distanceKm: number | null;
}

export interface BedSearchQuery {
  lat?: number;
  lng?: number;
  radiusKm?: number;
  category?: BedCategory;
  freshOnly?: boolean;
}

// FR-BED-002, Module 4: Citizen-facing bed search.
// TD-003 (geo-sort) resolved: haversine formula via raw SQL — no PostGIS required.
// Accurate to ~0.5% for distances < 100 km (spherical Earth, R = 6371 km).
// §13.1: stalenessStatus is MANDATORY on every result.
@Injectable()
export class CitizenBedSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiPlatformClient,
  ) {}

  async searchBeds(query: BedSearchQuery): Promise<BedSearchResult[]> {
    const hasGeo = query.lat != null && query.lng != null;

    const raw = hasGeo
      ? await this.searchBedsWithGeo(
          query.lat!,
          query.lng!,
          query.radiusKm ?? 10,
          query.category,
          query.freshOnly,
        )
      : await this.searchBedsWithoutGeo(query);

    return this.rankViaAi(raw);
  }

  private async searchBedsWithoutGeo(query: BedSearchQuery): Promise<BedSearchResult[]> {
    // No lat/lng — ORM path, FRESH-first then most-available
    const where: Record<string, unknown> = { availableCount: { gt: 0 } };
    if (query.category) where.category = query.category;
    if (query.freshOnly) where.stalenessStatus = BedInventoryStatus.FRESH;

    const rows = await this.prisma.hospitalBedInventory.findMany({
      where,
      orderBy: [{ stalenessStatus: 'asc' }, { availableCount: 'desc' }],
    });

    return rows.map((r) => ({
      hospitalId: r.hospitalId,
      hospitalName: null,
      city: null,
      address: null,
      category: r.category,
      availableCount: r.availableCount,
      occupiedCount: r.occupiedCount,
      totalCount: r.totalCount,
      occupancyPercent: r.totalCount > 0 ? Math.round((r.occupiedCount / r.totalCount) * 100) : 0,
      stalenessStatus: r.stalenessStatus,
      lastUpdatedAt: r.lastUpdatedAt,
      distanceKm: null,
    }));
  }

  // M8 MATCHING_RANKING — AI may reorder; fallback is deterministic rankBeds (GT-11).
  private async rankViaAi(candidates: BedSearchResult[]): Promise<BedSearchResult[]> {
    if (candidates.length <= 1) return candidates;

    const { value } = await this.ai.execute<{ orderedKeys: string[] }>({
      capability: AiCapability.MATCHING_RANKING,
      input: {
        candidates: candidates.map((c) => ({
          key: bedRankKey(c),
          hospitalId: c.hospitalId,
          category: c.category,
          availableCount: c.availableCount,
          stalenessStatus: c.stalenessStatus,
          distanceKm: c.distanceKm,
        })),
      },
      context: { candidateCount: candidates.length },
      fallback: () => ({ orderedKeys: rankBeds(candidates).map(bedRankKey) }),
    });

    return applyOrderedKeys(candidates, value.orderedKeys ?? []);
  }

  // Haversine formula in native Postgres arithmetic.
  // Uses $queryRawUnsafe — category is validated against the BedCategory enum before use.
  private async searchBedsWithGeo(
    lat: number,
    lng: number,
    radiusKm: number,
    category?: BedCategory,
    freshOnly?: boolean,
  ): Promise<BedSearchResult[]> {
    // Bounding-box pre-filter: 1° ≈ 111 km — cheap index scan before haversine
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    // Category is validated against enum — safe to interpolate as a string literal
    const validCategories = Object.values(BedCategory) as string[];
    const categoryClause =
      category && validCategories.includes(category)
        ? `AND b.category = '${category}'`
        : '';
    const freshnessClause = freshOnly ? `AND b.staleness_status = 'FRESH'` : '';

    const sql = `
      SELECT
        b.hospital_id,
        r.name,
        r.address,
        r.city,
        b.category,
        b.available_count,
        b.occupied_count,
        b.total_count,
        b.staleness_status,
        b.last_updated_at,
        CASE WHEN r.lat IS NOT NULL THEN
          6371.0 * 2.0 * ASIN(SQRT(
            POWER(SIN(RADIANS((r.lat - $1) / 2.0)), 2) +
            COS(RADIANS($1)) * COS(RADIANS(r.lat)) *
            POWER(SIN(RADIANS((r.lng - $2) / 2.0)), 2)
          ))
        ELSE NULL END AS distance_km
      FROM beds.hospital_bed_inventory b
      LEFT JOIN beds.hospital_registry r ON r.hospital_id = b.hospital_id
      WHERE b.available_count > 0
        ${categoryClause}
        ${freshnessClause}
        AND (
          r.hospital_id IS NULL
          OR (
            r.lat BETWEEN $3 AND $4
            AND r.lng BETWEEN $5 AND $6
          )
        )
      ORDER BY
        distance_km ASC NULLS LAST,
        b.staleness_status ASC,
        b.available_count DESC
    `;

    type RawRow = {
      hospital_id: string;
      name: string | null;
      address: string | null;
      city: string | null;
      category: string;
      available_count: number;
      occupied_count: number;
      total_count: number;
      staleness_status: string;
      last_updated_at: Date;
      distance_km: number | null;
    };

    const rows = await this.prisma.$queryRawUnsafe<RawRow[]>(
      sql,
      lat,
      lng,
      lat - latDelta,
      lat + latDelta,
      lng - lngDelta,
      lng + lngDelta,
    );

    return rows
      .filter((row) => {
        if (row.distance_km == null) return true; // no registry row → include, can't filter
        return Number(row.distance_km) <= radiusKm;
      })
      .map((row) => ({
        hospitalId: row.hospital_id,
        hospitalName: row.name ?? null,
        city: row.city ?? null,
        address: row.address ?? null,
        category: row.category,
        availableCount: Number(row.available_count),
        occupiedCount: Number(row.occupied_count),
        totalCount: Number(row.total_count),
        occupancyPercent:
          Number(row.total_count) > 0
            ? Math.round((Number(row.occupied_count) / Number(row.total_count)) * 100)
            : 0,
        stalenessStatus: row.staleness_status,
        lastUpdatedAt: row.last_updated_at,
        distanceKm:
          row.distance_km != null ? Math.round(Number(row.distance_km) * 10) / 10 : null,
      }));
  }

  async getHospitalBedSummary(hospitalId: string): Promise<BedSearchResult[]> {
    const [rows, registry] = await Promise.all([
      this.prisma.hospitalBedInventory.findMany({
        where: { hospitalId },
        orderBy: { category: 'asc' },
      }),
      this.prisma.hospitalRegistry.findUnique({ where: { hospitalId } }),
    ]);

    return rows.map((r) => ({
      hospitalId: r.hospitalId,
      hospitalName: registry?.name ?? null,
      city: registry?.city ?? null,
      address: registry?.address ?? null,
      category: r.category,
      availableCount: r.availableCount,
      occupiedCount: r.occupiedCount,
      totalCount: r.totalCount,
      occupancyPercent:
        r.totalCount > 0 ? Math.round((r.occupiedCount / r.totalCount) * 100) : 0,
      stalenessStatus: r.stalenessStatus,
      lastUpdatedAt: r.lastUpdatedAt,
      distanceKm: null,
    }));
  }

  // C-18 / FR-NBH: one row per hospital from registry, aggregated bed occupancy, geo-sorted.
  async searchNearbyHospitals(query: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<NearbyHospitalResult[]> {
    const hasGeo = query.lat != null && query.lng != null;
    const radiusKm = query.radiusKm ?? 25;

    if (hasGeo) {
      return this.searchNearbyHospitalsWithGeo(query.lat!, query.lng!, radiusKm);
    }

    const hospitals = await this.prisma.hospitalRegistry.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    const inventory = await this.prisma.hospitalBedInventory.findMany({
      where: { hospitalId: { in: hospitals.map((h) => h.hospitalId) } },
    });
    const byHospital = groupInventory(inventory);

    return hospitals.map((h) => {
      const beds = byHospital.get(h.hospitalId) ?? emptyAgg();
      return {
        hospitalId: h.hospitalId,
        name: h.name,
        address: h.address,
        city: h.city,
        state: h.state,
        lat: h.lat,
        lng: h.lng,
        distanceKm: null,
        ...beds,
        specialtyLabel: specialtyFromBeds(beds.categories),
      };
    });
  }

  private async searchNearbyHospitalsWithGeo(
    lat: number,
    lng: number,
    radiusKm: number,
  ): Promise<NearbyHospitalResult[]> {
    const latDelta = radiusKm / 111.0;
    const lngDelta = radiusKm / (111.0 * Math.cos((lat * Math.PI) / 180));

    type RawHospital = {
      hospital_id: string;
      name: string;
      address: string | null;
      city: string | null;
      state: string | null;
      lat: number;
      lng: number;
      distance_km: number;
    };

    const hospitals = await this.prisma.$queryRawUnsafe<RawHospital[]>(
      `
      SELECT
        r.hospital_id,
        r.name,
        r.address,
        r.city,
        r.state,
        r.lat,
        r.lng,
        6371.0 * 2.0 * ASIN(SQRT(
          POWER(SIN(RADIANS((r.lat - $1) / 2.0)), 2) +
          COS(RADIANS($1)) * COS(RADIANS(r.lat)) *
          POWER(SIN(RADIANS((r.lng - $2) / 2.0)), 2)
        )) AS distance_km
      FROM beds.hospital_registry r
      WHERE r.is_active = TRUE
        AND r.lat BETWEEN $3 AND $4
        AND r.lng BETWEEN $5 AND $6
      ORDER BY distance_km ASC
      `,
      lat,
      lng,
      lat - latDelta,
      lat + latDelta,
      lng - lngDelta,
      lng + lngDelta,
    );

    const inRadius = hospitals.filter((h) => Number(h.distance_km) <= radiusKm);
    const inventory = await this.prisma.hospitalBedInventory.findMany({
      where: { hospitalId: { in: inRadius.map((h) => h.hospital_id) } },
    });
    const byHospital = groupInventory(inventory);

    return inRadius.map((h) => {
      const beds = byHospital.get(h.hospital_id) ?? emptyAgg();
      return {
        hospitalId: h.hospital_id,
        name: h.name,
        address: h.address,
        city: h.city,
        state: h.state,
        lat: Number(h.lat),
        lng: Number(h.lng),
        distanceKm: Math.round(Number(h.distance_km) * 10) / 10,
        ...beds,
        specialtyLabel: specialtyFromBeds(beds.categories),
      };
    });
  }

  // C-19 / FR-NBH-001: registry profile + per-category bed summary.
  async getHospitalProfile(hospitalId: string, geo?: { lat: number; lng: number }): Promise<HospitalProfile | null> {
    const registry = await this.prisma.hospitalRegistry.findUnique({ where: { hospitalId } });
    if (!registry || !registry.isActive) return null;

    const beds = await this.getHospitalBedSummary(hospitalId);
    const agg = beds.reduce(
      (acc, b) => {
        acc.availableCount += b.availableCount;
        acc.occupiedCount += b.occupiedCount;
        acc.totalCount += b.totalCount;
        return acc;
      },
      { availableCount: 0, occupiedCount: 0, totalCount: 0 },
    );

    let distanceKm: number | null = null;
    if (geo) {
      distanceKm =
        Math.round(
          haversineKm(geo.lat, geo.lng, registry.lat, registry.lng) * 10,
        ) / 10;
    }

    const categories = beds.map((b) => b.category);
    return {
      hospitalId: registry.hospitalId,
      name: registry.name,
      address: registry.address,
      city: registry.city,
      state: registry.state,
      lat: registry.lat,
      lng: registry.lng,
      distanceKm,
      availableCount: agg.availableCount,
      occupiedCount: agg.occupiedCount,
      totalCount: agg.totalCount,
      occupancyPercent:
        agg.totalCount > 0 ? Math.round((agg.occupiedCount / agg.totalCount) * 100) : 0,
      specialtyLabel: specialtyFromBeds(categories),
      services: servicesFromCategories(categories),
      beds,
    };
  }
}

export interface NearbyHospitalResult {
  hospitalId: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  distanceKm: number | null;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  occupancyPercent: number;
  categories: string[];
  specialtyLabel: string;
}

export interface HospitalProfile extends Omit<NearbyHospitalResult, 'categories'> {
  services: string[];
  beds: BedSearchResult[];
}

type InventoryAgg = {
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  occupancyPercent: number;
  categories: string[];
};

function emptyAgg(): InventoryAgg {
  return { availableCount: 0, occupiedCount: 0, totalCount: 0, occupancyPercent: 0, categories: [] };
}

function groupInventory(
  rows: Array<{
    hospitalId: string;
    category: string;
    availableCount: number;
    occupiedCount: number;
    totalCount: number;
  }>,
): Map<string, InventoryAgg> {
  const map = new Map<string, InventoryAgg>();
  for (const r of rows) {
    const cur = map.get(r.hospitalId) ?? emptyAgg();
    cur.availableCount += r.availableCount;
    cur.occupiedCount += r.occupiedCount;
    cur.totalCount += r.totalCount;
    cur.categories.push(r.category);
    map.set(r.hospitalId, cur);
  }
  for (const [, v] of map) {
    v.occupancyPercent =
      v.totalCount > 0 ? Math.round((v.occupiedCount / v.totalCount) * 100) : 0;
  }
  return map;
}

function specialtyFromBeds(categories: string[]): string {
  if (categories.length >= 4) return 'Multi-specialty';
  if (categories.includes('ICU') || categories.includes('VENTILATOR')) return 'Critical care';
  if (categories.includes('MATERNITY') || categories.includes('NICU')) return 'Maternity / NICU';
  return 'General';
}

function servicesFromCategories(categories: string[]): string[] {
  const map: Record<string, string> = {
    GENERAL: 'General ward',
    ICU: 'ICU',
    VENTILATOR: 'Ventilator',
    NICU: 'NICU',
    ISOLATION: 'Isolation',
    MATERNITY: 'Maternity',
  };
  const services = categories.map((c) => map[c] ?? c);
  if (categories.includes('ICU') || categories.includes('VENTILATOR')) {
    services.unshift('Trauma Center');
  }
  if (!services.includes('Diagnostics')) services.push('Diagnostics');
  if (!services.includes('Pharmacy')) services.push('Pharmacy');
  return Array.from(new Set(services));
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
