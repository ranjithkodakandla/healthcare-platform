jest.mock('pg', () => {
  const end = jest.fn().mockResolvedValue(undefined);
  const query = jest.fn();
  const connect = jest.fn();
  return {
    Client: jest.fn().mockImplementation(() => ({ connect, query, end })),
  };
});

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    ping: jest.fn(),
    disconnect: jest.fn(),
  }));
});

import { Client as PgClient } from 'pg';
import Redis from 'ioredis';
import { HealthService } from './health.service';

describe('HealthService (unit)', () => {
  it('reports ok/degraded and AI configured states', async () => {
    const pgInst = new (PgClient as unknown as jest.Mock)();
    const redisInst = new (Redis as unknown as jest.Mock)();
    (PgClient as unknown as jest.Mock).mockImplementation(() => pgInst);
    (Redis as unknown as jest.Mock).mockImplementation(() => redisInst);

    pgInst.connect.mockResolvedValue(undefined);
    pgInst.query.mockResolvedValue({});
    redisInst.connect.mockResolvedValue(undefined);
    redisInst.ping.mockResolvedValue('PONG');

    const ok = new HealthService({
      get: (k: string) =>
        ({
          DATABASE_URL: 'postgres://x',
          REDIS_URL: 'redis://x',
          NVIDIA_API_KEY: 'k',
        } as Record<string, string>)[k],
    } as never);
    await expect(ok.check()).resolves.toEqual(
      expect.objectContaining({ status: 'ok', checks: expect.objectContaining({ aiPlatform: 'up' }) }),
    );

    pgInst.connect.mockRejectedValueOnce(new Error('down'));
    redisInst.connect.mockRejectedValueOnce(new Error('down'));
    const degraded = new HealthService({
      get: (k: string) =>
        ({ DATABASE_URL: 'postgres://x', REDIS_URL: 'redis://x' } as Record<string, string>)[k],
    } as never);
    await expect(degraded.check()).resolves.toEqual(
      expect.objectContaining({
        status: 'degraded',
        checks: expect.objectContaining({ aiPlatform: 'not_configured' }),
      }),
    );
  });
});
