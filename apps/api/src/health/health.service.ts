import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client as PgClient } from 'pg';
import Redis from 'ioredis';

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  checks: {
    postgres: 'up' | 'down';
    redis: 'up' | 'down';
    aiPlatform: 'up' | 'down' | 'not_configured';
  };
}

// Raw `pg`/`ioredis` connectivity checks, not Prisma: /health only needs to prove
// reachability, and Prisma has no models to generate a client against until Phase 1
// adds the first domain entities (Case, ResourceHold).
@Injectable()
export class HealthService {
  constructor(private readonly config: ConfigService) {}

  async check(): Promise<HealthCheckResult> {
    const [postgres, redis] = await Promise.all([this.checkPostgres(), this.checkRedis()]);
    const aiPlatform =
      this.config.get<string>('NVIDIA_API_KEY') || this.config.get<string>('AI_PLATFORM_ENDPOINT')
        ? 'up'
        : 'not_configured';

    const status = postgres === 'up' && redis === 'up' ? 'ok' : 'degraded';
    return { status, checks: { postgres, redis, aiPlatform } };
  }

  private async checkPostgres(): Promise<'up' | 'down'> {
    const client = new PgClient({
      connectionString: this.config.get<string>('DATABASE_URL'),
      connectionTimeoutMillis: 2000,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      return 'up';
    } catch {
      return 'down';
    } finally {
      await client.end().catch(() => undefined);
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    const redis = new Redis(this.config.get<string>('REDIS_URL')!, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    try {
      await redis.connect();
      await redis.ping();
      return 'up';
    } catch {
      return 'down';
    } finally {
      redis.disconnect();
    }
  }
}
