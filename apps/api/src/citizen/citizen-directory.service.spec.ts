import { CitizenDirectoryService } from './citizen-directory.service';

describe('CitizenDirectoryService', () => {
  const prisma = {
    doctorProfile: { findMany: jest.fn() },
    pharmacyStock: { findMany: jest.fn() },
    pharmacyRegistry: { findMany: jest.fn() },
    bloodBankStock: { findMany: jest.fn() },
    diagnosticOffering: { findMany: jest.fn() },
    cancerCenter: { findMany: jest.fn() },
    insurancePreAuth: { findFirst: jest.fn() },
  };
  const service = new CitizenDirectoryService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('returns doctors ordered with distance when lat/lng provided', async () => {
    prisma.doctorProfile.findMany.mockResolvedValue([
      { id: '1', name: 'A', specialty: 'Cardiology', hospitalName: 'X', nextSlotAt: null, isTeleconsult: false, city: 'BLR', lat: 12.9, lng: 77.6 },
      { id: '2', name: 'B', specialty: 'Cardiology', hospitalName: 'Y', nextSlotAt: null, isTeleconsult: false, city: 'BLR', lat: 13.5, lng: 77.6 },
    ]);
    const rows = await service.searchDoctors({ specialty: 'Cardiology', lat: 12.9, lng: 77.6 });
    expect(rows[0].id).toBe('1');
    expect(rows[0].distanceKm).toBe(0);
  });

  it('maps pharmacy stock status flags', async () => {
    prisma.pharmacyStock.findMany.mockResolvedValue([
      { pharmacyId: 'p1', medicineName: 'Insulin', stockCount: 40, lowThreshold: 10 },
      { pharmacyId: 'p2', medicineName: 'Insulin', stockCount: 0, lowThreshold: 10 },
    ]);
    prisma.pharmacyRegistry.findMany.mockResolvedValue([
      { pharmacyId: 'p1', name: 'MedPlus', address: 'K', city: 'BLR', lat: 12.9, lng: 77.6, is24x7: true },
      { pharmacyId: 'p2', name: 'Fortis', address: 'B', city: 'BLR', lat: 12.8, lng: 77.5, is24x7: false },
    ]);
    const rows = await service.searchPharmacies({ medicine: 'Insulin' });
    expect(rows.find((r) => r.pharmacyId === 'p1')?.status).toBe('In stock');
    expect(rows.find((r) => r.pharmacyId === 'p2')?.status).toBe('Out of stock');
  });

  it('filters cancer centres by modality', async () => {
    prisma.cancerCenter.findMany.mockResolvedValue([
      { id: '1', name: 'HCG', modalities: 'Radiation,Chemotherapy', city: 'BLR', lat: null, lng: null },
      { id: '2', name: 'Kidwai', modalities: 'Surgical Oncology', city: 'BLR', lat: null, lng: null },
    ]);
    const rows = await service.searchCancerCenters({ modality: 'Radiation' });
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('HCG');
  });
});
