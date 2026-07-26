import { AmbulanceOfferDispatchJob } from './ambulance-offer-dispatch.job';

describe('AmbulanceOfferDispatchJob (unit)', () => {
  function build() {
    const tx = {
      ambulanceOffer: {
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    const prisma = {
      ambulanceOffer: {
        findMany: jest.fn(),
      },
      ambulanceRequest: {
        findMany: jest.fn(),
      },
      ambulanceDriver: {
        findFirst: jest.fn(),
      },
      $queryRawUnsafe: jest.fn(),
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const job = new AmbulanceOfferDispatchJob(prisma as never, audit as never, events as never);
    return { job, prisma, events };
  }

  it('processExpiredOffers expires pending offers', async () => {
    const { job, prisma, events } = build();
    prisma.ambulanceOffer.findMany.mockResolvedValue([
      { id: 'o1', requestId: 'r1', request: { caseId: 'c1' } },
    ]);
    await job.processExpiredOffers();
    expect(events.publish).toHaveBeenCalled();
  });

  it('dispatchNextOffers creates geo and non-geo offers and handles no drivers', async () => {
    const { job, prisma } = build();
    prisma.ambulanceRequest.findMany.mockResolvedValue([
      { id: 'r1', caseId: 'c1', pickupLat: 28.6, pickupLng: 77.2 },
      { id: 'r2', caseId: 'c2', pickupLat: null, pickupLng: null },
      { id: 'r3', caseId: 'c3', pickupLat: null, pickupLng: null },
    ]);
    prisma.ambulanceOffer.findMany
      .mockResolvedValueOnce([{ driverId: 'd0' }]) // tried for r1
      .mockResolvedValueOnce([]) // r2
      .mockResolvedValueOnce([]); // r3
    prisma.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'd1', driver_uid: 'drv1' }]);
    prisma.ambulanceDriver.findFirst
      .mockResolvedValueOnce({ id: 'd2', driverUid: 'drv2' })
      .mockResolvedValueOnce(null);
    await job.dispatchNextOffers();
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
