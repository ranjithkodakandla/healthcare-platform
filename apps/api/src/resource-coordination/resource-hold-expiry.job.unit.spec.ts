import { ResourceHoldExpiryJob } from './resource-hold-expiry.job';

describe('ResourceHoldExpiryJob (unit)', () => {
  it('expires overdue holds and skips concurrent losers', async () => {
    const prisma = {
      resourceHold: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'h1', version: 1 },
          { id: 'h2', version: 2 },
        ]),
        updateMany: jest
          .fn()
          .mockResolvedValueOnce({ count: 1 })
          .mockResolvedValueOnce({ count: 0 }),
      },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const events = { publish: jest.fn() };
    const job = new ResourceHoldExpiryJob(prisma as never, audit as never, events as never);
    await expect(job.expireOverdueHolds()).resolves.toBe(2);
    expect(audit.record).toHaveBeenCalledTimes(1);
    expect(events.publish).toHaveBeenCalledTimes(1);

    prisma.resourceHold.findMany.mockResolvedValueOnce([]);
    await expect(job.expireOverdueHolds()).resolves.toBe(0);
  });
});
