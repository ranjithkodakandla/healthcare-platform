import { ProviderSecondaryService } from './provider-secondary.service';

describe('ProviderSecondaryService', () => {
  const prisma = {
    ambulanceDriver: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    pharmacyStock: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    bloodPreAlert: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ProviderSecondaryService(prisma as never, audit as never);

  beforeEach(() => jest.clearAllMocks());

  it('maps fleet roster rows', async () => {
    prisma.ambulanceDriver.findMany.mockResolvedValue([
      {
        id: 'd1',
        vehicleReg: 'KA-01-C',
        displayName: 'Mohan R.',
        driverUid: 'u1',
        vehicleType: 'ALS',
        fleetStatus: 'AVAILABLE',
        isOnDuty: true,
        lastLat: 1,
        lastLng: 2,
        lastPingAt: new Date(),
      },
    ]);
    const rows = await service.getFleet('hosp-apollo-blr');
    expect(rows[0].driverName).toBe('Mohan R.');
    expect(rows[0].fleetStatus).toBe('AVAILABLE');
  });

  it('flags pharmacy stock levels', async () => {
    prisma.pharmacyStock.findMany.mockResolvedValue([
      { id: '1', medicineName: 'Morphine', category: 'Analgesic', stockCount: 2, lowThreshold: 10, criticalThreshold: 3, lastUpdatedAt: new Date() },
      { id: '2', medicineName: 'Saline', category: 'IV Fluid', stockCount: 60, lowThreshold: 15, criticalThreshold: 5, lastUpdatedAt: new Date() },
    ]);
    const rows = await service.getPharmacyStock('hosp-apollo-blr');
    expect(rows[0].flag).toBe('Critical');
    expect(rows[1].flag).toBe('OK');
  });

  it('splits blood alerts into AI vs explicit columns', async () => {
    prisma.bloodPreAlert.findMany.mockResolvedValue([
      { id: 'a', bloodGroup: 'O-', units: 2, sourceType: 'AI_PREALERT', urgency: 'PROACTIVE', reason: 'x', caseId: null },
      { id: 'b', bloodGroup: 'O+', units: 4, sourceType: 'EXPLICIT_REQUEST', urgency: 'CRITICAL', reason: 'y', caseId: 'c1' },
    ]);
    const data = await service.getBloodPreAlerts('hosp-apollo-blr');
    expect(data.aiPreAlerts).toHaveLength(1);
    expect(data.explicitRequests).toHaveLength(1);
  });
});
