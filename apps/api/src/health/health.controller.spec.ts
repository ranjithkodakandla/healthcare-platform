import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  it('reports degraded status when postgres/redis are unreachable', async () => {
    process.env.DATABASE_URL = 'postgresql://invalid:invalid@localhost:1/invalid';
    process.env.REDIS_URL = 'redis://localhost:1';

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    const controller = moduleRef.get(HealthController);
    const result = await controller.check();

    expect(result.status).toBe('degraded');
    expect(result.checks.postgres).toBe('down');
    expect(result.checks.redis).toBe('down');
  });
});
