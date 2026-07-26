import { ConflictException, NotFoundException } from '@nestjs/common';
import { ResourceHoldStatus } from '@sahayak/shared-constants';
import { ResourceCoordinationService } from './resource-coordination.service';

describe('ResourceCoordinationService (unit)', () => {
  function build() {
    const hold = {
      id: 'h1',
      status: ResourceHoldStatus.PENDING,
      version: 1,
      resourceType: 'BED',
      resourceOwnerId: 'hosp-1',
    };
    const tx = {
      $queryRaw: jest.fn(),
      resourceHold: {
        count: jest.fn(),
        create: jest.fn().mockResolvedValue(hold),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    const prisma = {
      resourceCapacity: { upsert: jest.fn().mockResolvedValue({ id: 'c1' }) },
      $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn() };
    const service = new ResourceCoordinationService(prisma as never, audit as never, events as never);
    return { service, prisma, audit, events, tx, hold };
  }

  it('ensureCapacity upserts', async () => {
    const { service, prisma } = build();
    await service.ensureCapacity('BED', 'hosp-1', 3);
    expect(prisma.resourceCapacity.upsert).toHaveBeenCalled();
  });

  it('createHold succeeds when capacity available', async () => {
    const { service, tx, events } = build();
    tx.$queryRaw.mockResolvedValue([{ id: 'cap', capacity: 2 }]);
    tx.resourceHold.count.mockResolvedValue(0);
    const result = await service.createHold({
      resourceType: 'BED',
      resourceOwnerId: 'hosp-1',
      ttlSeconds: 60,
      actor: 'u1',
      caseId: 'c1',
    });
    expect(result.id).toBe('h1');
    expect(events.publish).toHaveBeenCalled();
  });

  it('createHold throws when capacity missing', async () => {
    const { service, tx } = build();
    tx.$queryRaw.mockResolvedValue([]);
    await expect(
      service.createHold({
        resourceType: 'BED',
        resourceOwnerId: 'x',
        ttlSeconds: 10,
        actor: 'u',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('createHold throws when capacity exceeded', async () => {
    const { service, tx } = build();
    tx.$queryRaw.mockResolvedValue([{ id: 'cap', capacity: 1 }]);
    tx.resourceHold.count.mockResolvedValue(1);
    await expect(
      service.createHold({
        resourceType: 'BED',
        resourceOwnerId: 'x',
        ttlSeconds: 10,
        actor: 'u',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmHold and releaseHold transition', async () => {
    const { service, tx, hold } = build();
    tx.resourceHold.findUnique.mockResolvedValue(hold);
    tx.resourceHold.updateMany.mockResolvedValue({ count: 1 });
    tx.resourceHold.findUniqueOrThrow.mockResolvedValue({
      ...hold,
      status: ResourceHoldStatus.CONFIRMED,
    });
    await service.confirmHold('h1', 'actor');
    tx.resourceHold.findUnique.mockResolvedValue({
      ...hold,
      status: ResourceHoldStatus.CONFIRMED,
    });
    tx.resourceHold.findUniqueOrThrow.mockResolvedValue({
      ...hold,
      status: ResourceHoldStatus.RELEASED,
    });
    await service.releaseHold('h1', 'actor');
  });

  it('transitionHold rejects missing hold and bad state and concurrent edit', async () => {
    const { service, tx } = build();
    tx.resourceHold.findUnique.mockResolvedValue(null);
    await expect(service.confirmHold('missing', 'a')).rejects.toBeInstanceOf(NotFoundException);

    tx.resourceHold.findUnique.mockResolvedValue({
      id: 'h1',
      status: ResourceHoldStatus.CONFIRMED,
      version: 1,
    });
    await expect(service.confirmHold('h1', 'a')).rejects.toBeInstanceOf(ConflictException);

    tx.resourceHold.findUnique.mockResolvedValue({
      id: 'h1',
      status: ResourceHoldStatus.PENDING,
      version: 1,
    });
    tx.resourceHold.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.confirmHold('h1', 'a')).rejects.toBeInstanceOf(ConflictException);
  });
});
