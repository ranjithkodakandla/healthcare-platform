import { BadRequestException } from '@nestjs/common';
import { BedCategory } from '@sahayak/shared-constants';
import { BedInventoryService, InventoryStalenessCheckJob } from './bed-inventory.service';

describe('BedInventoryService (unit)', () => {
  function build() {
    const tx = {
      hospitalBedInventory: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
          id: 'r1',
          hospitalId: 'h1',
          category: BedCategory.GENERAL,
          availableCount: 1,
          occupiedCount: 1,
          totalCount: 2,
          stalenessStatus: 'FRESH',
          lastUpdatedAt: new Date(),
          version: 1,
        }),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
      hospitalBedInventory: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn() };
    return {
      service: new BedInventoryService(prisma as never, audit as never, events as never, config as never),
      prisma,
      tx,
      events,
    };
  }

  it('validates counts and updates inventory', async () => {
    const { service, tx, events } = build();
    await expect(
      service.updateBedCounts('h1', 'a', [
        { category: BedCategory.GENERAL, availableCount: -1, occupiedCount: 0, totalCount: 1 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateBedCounts('h1', 'a', [
        { category: BedCategory.GENERAL, availableCount: 2, occupiedCount: 2, totalCount: 3 },
      ]),
    ).rejects.toBeInstanceOf(BadRequestException);

    await service.updateBedCounts(
      'h1',
      'a',
      [{ category: BedCategory.GENERAL, availableCount: 2, occupiedCount: 2, totalCount: 3 }],
      'override',
    );
    tx.hospitalBedInventory.findUnique.mockResolvedValueOnce({
      availableCount: 1,
      occupiedCount: 1,
      totalCount: 2,
    });
    await service.updateBedCounts('h1', 'a', [
      { category: BedCategory.ICU, availableCount: 1, occupiedCount: 0, totalCount: 1 },
    ]);
    expect(events.publish).toHaveBeenCalled();
    await service.getBedInventory('h1');
    expect(await service.isInventoryFresh('h1')).toBe(true);
  });
});

describe('InventoryStalenessCheckJob (unit)', () => {
  it('marks stale rows and emits per hospital', async () => {
    const prisma = {
      hospitalBedInventory: {
        findMany: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: '1', hospitalId: 'h1', category: 'ICU' },
            { id: '2', hospitalId: 'h1', category: 'GENERAL' },
            { id: '3', hospitalId: 'h2', category: 'ICU' },
          ]),
        updateMany: jest.fn(),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const config = { get: jest.fn().mockReturnValue(6) };
    const job = new InventoryStalenessCheckJob(
      prisma as never,
      audit as never,
      events as never,
      config as never,
    );
    await job.markStaleInventory();
    await job.markStaleInventory();
    expect(events.publish).toHaveBeenCalledTimes(2);
  });
});
