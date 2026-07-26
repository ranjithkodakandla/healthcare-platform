import { BedCategory, BedInventoryStatus } from '@sahayak/shared-constants';
import { CitizenBedSearchService } from './citizen-bed-search.service';

describe('CitizenBedSearchService (unit)', () => {
  const now = new Date();

  function build() {
    const prisma = {
      hospitalBedInventory: {
        findMany: jest.fn(),
      },
      hospitalRegistry: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
    };
    const ai = {
      execute: jest.fn(async ({ fallback }) => ({ value: fallback() })),
    };
    const service = new CitizenBedSearchService(prisma as never, ai as never);
    return { service, prisma, ai };
  }

  it('searchBeds without geo maps rows and ranks via AI when multiple', async () => {
    const { service, prisma, ai } = build();
    prisma.hospitalBedInventory.findMany.mockResolvedValue([
      {
        hospitalId: 'h1',
        category: 'ICU',
        availableCount: 2,
        occupiedCount: 1,
        totalCount: 3,
        stalenessStatus: BedInventoryStatus.FRESH,
        lastUpdatedAt: now,
      },
      {
        hospitalId: 'h2',
        category: 'GENERAL',
        availableCount: 5,
        occupiedCount: 0,
        totalCount: 5,
        stalenessStatus: BedInventoryStatus.STALE,
        lastUpdatedAt: now,
      },
    ]);
    const results = await service.searchBeds({ category: BedCategory.ICU, freshOnly: true });
    expect(results).toHaveLength(2);
    expect(ai.execute).toHaveBeenCalled();
    expect(results[0].occupancyPercent).toBe(33);
  });

  it('searchBeds with geo filters by radius and category clause', async () => {
    const { service, prisma } = build();
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        hospital_id: 'h1',
        name: 'City',
        address: 'A',
        city: 'Delhi',
        category: 'ICU',
        available_count: 1,
        occupied_count: 0,
        total_count: 1,
        staleness_status: 'FRESH',
        last_updated_at: now,
        distance_km: 2.22,
      },
      {
        hospital_id: 'h2',
        name: null,
        address: null,
        city: null,
        category: 'ICU',
        available_count: 1,
        occupied_count: 0,
        total_count: 0,
        staleness_status: 'FRESH',
        last_updated_at: now,
        distance_km: 50,
      },
      {
        hospital_id: 'h3',
        name: null,
        address: null,
        city: null,
        category: 'ICU',
        available_count: 1,
        occupied_count: 0,
        total_count: 1,
        staleness_status: 'FRESH',
        last_updated_at: now,
        distance_km: null,
      },
    ]);
    const results = await service.searchBeds({
      lat: 28.6,
      lng: 77.2,
      radiusKm: 10,
      category: BedCategory.ICU,
      freshOnly: true,
    });
    expect(results.map((r) => r.hospitalId)).toEqual(['h1', 'h3']);
    expect(results[0].distanceKm).toBe(2.2);
  });

  it('getHospitalBedSummary joins registry', async () => {
    const { service, prisma } = build();
    prisma.hospitalBedInventory.findMany.mockResolvedValue([
      {
        hospitalId: 'h1',
        category: 'GENERAL',
        availableCount: 1,
        occupiedCount: 1,
        totalCount: 2,
        stalenessStatus: 'FRESH',
        lastUpdatedAt: now,
      },
    ]);
    prisma.hospitalRegistry.findUnique.mockResolvedValue({
      hospitalId: 'h1',
      name: 'Apollo',
      city: 'Delhi',
      address: 'X',
    });
    const rows = await service.getHospitalBedSummary('h1');
    expect(rows[0].hospitalName).toBe('Apollo');
    expect(rows[0].occupancyPercent).toBe(50);
  });

  it('searchNearbyHospitals without geo aggregates inventory', async () => {
    const { service, prisma } = build();
    prisma.hospitalRegistry.findMany.mockResolvedValue([
      {
        hospitalId: 'h1',
        name: 'A',
        address: null,
        city: 'C',
        state: 'S',
        lat: 1,
        lng: 2,
        isActive: true,
      },
    ]);
    prisma.hospitalBedInventory.findMany.mockResolvedValue([
      { hospitalId: 'h1', category: 'ICU', availableCount: 1, occupiedCount: 1, totalCount: 2 },
      { hospitalId: 'h1', category: 'VENTILATOR', availableCount: 1, occupiedCount: 0, totalCount: 1 },
    ]);
    const rows = await service.searchNearbyHospitals({});
    expect(rows[0].specialtyLabel).toBe('Critical care');
    expect(rows[0].availableCount).toBe(2);
  });

  it('searchNearbyHospitals with geo filters radius', async () => {
    const { service, prisma } = build();
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        hospital_id: 'h1',
        name: 'Near',
        address: null,
        city: null,
        state: null,
        lat: 28.6,
        lng: 77.2,
        distance_km: 3.1,
      },
      {
        hospital_id: 'h2',
        name: 'Far',
        address: null,
        city: null,
        state: null,
        lat: 29,
        lng: 78,
        distance_km: 40,
      },
    ]);
    prisma.hospitalBedInventory.findMany.mockResolvedValue([]);
    const rows = await service.searchNearbyHospitals({ lat: 28.6, lng: 77.2, radiusKm: 10 });
    expect(rows).toHaveLength(1);
    expect(rows[0].distanceKm).toBe(3.1);
  });

  it('getHospitalProfile returns null when inactive and computes distance/services', async () => {
    const { service, prisma } = build();
    prisma.hospitalRegistry.findUnique.mockResolvedValue(null);
    expect(await service.getHospitalProfile('x')).toBeNull();

    prisma.hospitalRegistry.findUnique.mockResolvedValue({
      hospitalId: 'h1',
      name: 'A',
      address: 'Addr',
      city: 'C',
      state: 'S',
      lat: 28.61,
      lng: 77.21,
      isActive: true,
    });
    prisma.hospitalBedInventory.findMany.mockResolvedValue([
      {
        hospitalId: 'h1',
        category: 'MATERNITY',
        availableCount: 2,
        occupiedCount: 0,
        totalCount: 2,
        stalenessStatus: 'FRESH',
        lastUpdatedAt: now,
      },
      {
        hospitalId: 'h1',
        category: 'NICU',
        availableCount: 1,
        occupiedCount: 0,
        totalCount: 1,
        stalenessStatus: 'FRESH',
        lastUpdatedAt: now,
      },
      {
        hospitalId: 'h1',
        category: 'GENERAL',
        availableCount: 1,
        occupiedCount: 0,
        totalCount: 1,
        stalenessStatus: 'FRESH',
        lastUpdatedAt: now,
      },
      {
        hospitalId: 'h1',
        category: 'ISOLATION',
        availableCount: 1,
        occupiedCount: 0,
        totalCount: 1,
        stalenessStatus: 'FRESH',
        lastUpdatedAt: now,
      },
    ]);
    const profile = await service.getHospitalProfile('h1', { lat: 28.6, lng: 77.2 });
    expect(profile?.specialtyLabel).toBe('Multi-specialty');
    expect(profile?.services).toEqual(expect.arrayContaining(['Diagnostics', 'Pharmacy', 'Maternity']));
    expect(profile?.distanceKm).not.toBeNull();
  });
});
