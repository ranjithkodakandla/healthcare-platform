import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProviderSecondaryService } from './provider-secondary.service';

describe('ProviderSecondaryService (unit)', () => {
  function build() {
    const prisma = {
      ambulanceDriver: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'd1',
            vehicleReg: 'KA',
            displayName: null,
            driverUid: 'drv',
            vehicleType: 'BLS',
            fleetStatus: 'AVAILABLE',
            isOnDuty: true,
            lastLat: 1,
            lastLng: 2,
            lastPingAt: new Date(),
          },
        ]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'd1' }),
      },
      pharmacyStock: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            medicineName: 'Insulin',
            category: 'General',
            stockCount: 5,
            lowThreshold: 10,
            criticalThreshold: 2,
            lastUpdatedAt: new Date(),
          },
          {
            id: 's2',
            medicineName: 'X',
            category: 'General',
            stockCount: 1,
            lowThreshold: 10,
            criticalThreshold: 2,
            lastUpdatedAt: new Date(),
          },
          {
            id: 's3',
            medicineName: 'Y',
            category: 'General',
            stockCount: 20,
            lowThreshold: 10,
            criticalThreshold: 2,
            lastUpdatedAt: new Date(),
          },
        ]),
        upsert: jest.fn().mockResolvedValue({
          id: 's1',
          medicineName: 'Insulin',
          category: 'General',
          stockCount: 3,
          lowThreshold: 10,
          criticalThreshold: 2,
        }),
      },
      bloodPreAlert: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'a1',
            sourceType: 'AI_PREALERT',
            bloodGroup: 'O+',
            units: 2,
            urgency: 'HIGH',
            reason: 'r',
            caseId: 'c1',
          },
          {
            id: 'a2',
            sourceType: 'EXPLICIT_REQUEST',
            bloodGroup: 'A+',
            units: 1,
            urgency: 'MED',
            reason: 'r',
            caseId: 'c2',
          },
        ]),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'a1', status: 'ACKNOWLEDGED' }),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    return { service: new ProviderSecondaryService(prisma as never, audit as never), prisma, audit };
  }

  it('fleet/pharmacy/blood flows', async () => {
    const { service, prisma } = build();
    const fleet = await service.getFleet('op');
    expect(fleet[0].driverName).toBe('drv');

    await expect(service.updateFleetStatus('op', 'd1', 'BAD', 'a')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    prisma.ambulanceDriver.findFirst.mockResolvedValueOnce(null);
    await expect(service.updateFleetStatus('op', 'd1', 'AVAILABLE', 'a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.ambulanceDriver.findFirst.mockResolvedValueOnce({ id: 'd1' });
    await service.updateFleetStatus('op', 'd1', 'AVAILABLE', 'a');
    prisma.ambulanceDriver.findFirst.mockResolvedValueOnce({ id: 'd1' });
    await service.updateFleetStatus('op', 'd1', 'MAINTENANCE', 'a');

    const stock = await service.getPharmacyStock('p1', 'ins');
    expect(stock.map((s) => s.flag)).toEqual(expect.arrayContaining(['Low', 'Critical', 'OK']));
    await service.getPharmacyStock('p1');
    await expect(
      service.updatePharmacyStock('p1', [{ medicineName: 'X', stockCount: -1 }], 'a'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await service.updatePharmacyStock('p1', [{ medicineName: 'Insulin', stockCount: 3 }], 'a');

    const alerts = await service.getBloodPreAlerts('bb1');
    expect(alerts.aiPreAlerts).toHaveLength(1);
    expect(alerts.explicitRequests).toHaveLength(1);
    prisma.bloodPreAlert.findFirst.mockResolvedValueOnce(null);
    await expect(service.acknowledgeBloodAlert('bb1', 'a1', 'a')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    prisma.bloodPreAlert.findFirst.mockResolvedValueOnce({ id: 'a1', bloodGroup: 'O+' });
    await service.acknowledgeBloodAlert('bb1', 'a1', 'a');
  });
});
