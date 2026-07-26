import { CitizenDirectoryService } from './citizen-directory.service';

describe('CitizenDirectoryService (unit)', () => {
  function build() {
    const prisma = {
      doctorProfile: { findMany: jest.fn().mockResolvedValue([]) },
      pharmacyStock: {
        findMany: jest.fn().mockResolvedValue([
          { pharmacyId: 'p1', medicineName: 'Insulin', stockCount: 0, lowThreshold: 5 },
          { pharmacyId: 'p2', medicineName: 'Insulin', stockCount: 3, lowThreshold: 5 },
          { pharmacyId: 'p3', medicineName: 'Insulin', stockCount: 20, lowThreshold: 5 },
        ]),
      },
      pharmacyRegistry: {
        findMany: jest.fn().mockResolvedValue([
          { pharmacyId: 'p1', name: 'A', address: null, city: null, lat: 28.6, lng: 77.2, is24x7: true },
          { pharmacyId: 'p2', name: 'B', address: null, city: null, lat: null, lng: null, is24x7: false },
          { pharmacyId: 'p3', name: 'C', address: null, city: null, lat: 28.61, lng: 77.21, is24x7: false },
        ]),
      },
      bloodBankStock: {
        findMany: jest.fn().mockResolvedValue([
          { bloodBankId: 'b1', name: 'BB', bloodGroup: 'O+', component: 'WBC', unitsAvailable: 2, city: 'D', lat: 1, lng: 2 },
          { bloodBankId: 'b2', name: 'BB2', bloodGroup: 'O+', component: 'WBC', unitsAvailable: 0, city: 'D', lat: 1, lng: 2 },
        ]),
      },
      diagnosticOffering: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'd1', centerName: 'C', testName: 'CBC', priceInr: 1, nextSlotAt: new Date(), city: 'D', lat: 1, lng: 2 },
        ]),
      },
      cancerCenter: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'c1', name: 'Onco', modalities: 'Radiation, Chemo', city: 'D', lat: 1, lng: 2 },
        ]),
      },
      insurancePreAuth: {
        findFirst: jest.fn(),
      },
    };
    return { service: new CitizenDirectoryService(prisma as never), prisma };
  }

  it('covers search surfaces and preauth', async () => {
    const { service, prisma } = build();
    prisma.doctorProfile.findMany.mockResolvedValueOnce([
      {
        id: 'd1',
        name: 'Dr',
        specialty: 'Cardio',
        hospitalName: 'H',
        nextSlotAt: new Date(),
        isTeleconsult: true,
        city: 'D',
        lat: 1,
        lng: 2,
      },
    ]);
    await service.searchDoctors({ specialty: 'Cardio', q: 'Dr', lat: 1, lng: 2 });
    await service.searchDoctors({});
    const pharmacies = await service.searchPharmacies({ medicine: 'Insulin', lat: 28.6, lng: 77.2 });
    expect(pharmacies.map((p) => p.status)).toEqual(
      expect.arrayContaining(['Out of stock', 'Low stock', 'In stock']),
    );
    const blood = await service.searchBloodBanks({ bloodGroup: 'O+', lat: 1, lng: 2 });
    expect(blood[0].variant).toBe('available');
    expect(blood[1].variant).toBe('full');
    await service.searchDiagnostics({ q: 'cbc', lat: 1, lng: 2 });
    await service.searchDiagnostics({});
    await service.searchCancerCenters({ modality: 'radiation', lat: 1, lng: 2 });
    await service.searchCancerCenters({});
    prisma.insurancePreAuth.findFirst
      .mockResolvedValueOnce({ id: 'pa1' })
      .mockResolvedValueOnce({ id: 'pa2' });
    expect(await service.getLatestPreAuth('case-1')).toEqual({ id: 'pa1' });
    prisma.insurancePreAuth.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'pa2' });
    expect(await service.getLatestPreAuth('case-1')).toEqual({ id: 'pa2' });
    await service.getLatestPreAuth();
  });
});
