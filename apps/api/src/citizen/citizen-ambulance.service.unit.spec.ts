import { NotFoundException } from '@nestjs/common';
import { CaseSeverity } from '@sahayak/shared-constants';
import { CitizenAmbulanceService } from './citizen-ambulance.service';

describe('CitizenAmbulanceService (unit)', () => {
  function build() {
    const tx = {
      ambulanceRequest: {
        create: jest.fn().mockResolvedValue({
          id: 'r1',
          caseId: 'c1',
          severity: CaseSeverity.URGENT,
        }),
        update: jest.fn(),
      },
      ambulanceOffer: { update: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      $queryRawUnsafe: jest.fn(),
      ambulanceRequest: {
        findFirst: jest.fn(),
      },
      ambulanceOffer: {
        findUnique: jest.fn(),
      },
      ambulanceDriver: {
        findUnique: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new CitizenAmbulanceService(prisma as never, audit as never, events as never);
    return { service, prisma, tx, audit, events };
  }

  it('createRequest audits and publishes', async () => {
    const { service, events } = build();
    const req = await service.createRequest({
      caseId: 'c1',
      actorId: 'u1',
      pickupLat: 1,
      pickupLng: 2,
      severity: CaseSeverity.URGENT,
    });
    expect(req.id).toBe('r1');
    expect(events.publish).toHaveBeenCalled();
  });

  it('searchAvailableDrivers maps distances', async () => {
    const { service, prisma } = build();
    prisma.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'd1',
        driver_uid: 'drv',
        vehicle_reg: 'KA01',
        vehicle_type: 'BLS',
        is_on_duty: true,
        distance_km: 1.25,
      },
      {
        id: 'd2',
        driver_uid: 'drv2',
        vehicle_reg: 'KA02',
        vehicle_type: 'ALS',
        is_on_duty: true,
        distance_km: null,
      },
    ]);
    const rows = await service.searchAvailableDrivers(28.6, 77.2, 5);
    expect(rows[0].distanceKm).toBe(1.3);
    expect(rows[1].distanceKm).toBeNull();
  });

  it('getRequestByCaseId throws when missing', async () => {
    const { service, prisma } = build();
    prisma.ambulanceRequest.findFirst.mockResolvedValue(null);
    await expect(service.getRequestByCaseId('c1')).rejects.toBeInstanceOf(NotFoundException);
    prisma.ambulanceRequest.findFirst.mockResolvedValue({ id: 'r1' });
    await expect(service.getRequestByCaseId('c1')).resolves.toEqual({ id: 'r1' });
  });

  it('driverAcceptOffer validates and locks assignment', async () => {
    const { service, prisma, events } = build();
    prisma.ambulanceOffer.findUnique.mockResolvedValueOnce(null);
    await expect(service.driverAcceptOffer('o1', 'drv')).rejects.toBeInstanceOf(NotFoundException);

    prisma.ambulanceOffer.findUnique.mockResolvedValueOnce({
      id: 'o1',
      status: 'PENDING',
      requestId: 'r1',
      request: { caseId: 'c1' },
    });
    prisma.ambulanceDriver.findUnique.mockResolvedValueOnce(null);
    await expect(service.driverAcceptOffer('o1', 'drv')).rejects.toBeInstanceOf(NotFoundException);

    prisma.ambulanceOffer.findUnique.mockResolvedValueOnce({
      id: 'o1',
      status: 'PENDING',
      requestId: 'r1',
      request: { caseId: 'c1' },
    });
    prisma.ambulanceDriver.findUnique.mockResolvedValueOnce({ id: 'd1', driverUid: 'drv' });
    await service.driverAcceptOffer('o1', 'drv');
    expect(events.publish).toHaveBeenCalled();
  });
});
