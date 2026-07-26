import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusModule } from '../shared-services/event-bus/event-bus.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { ResourceCoordinationService } from './resource-coordination.service';

// Phase 1 exit criterion: a concurrency test can create 10 simultaneous holds
// against a count-of-1 resource and exactly one succeeds. Runs against the real
// local Postgres (docker-compose) — Testcontainers migration is tracked as debt
// once M21's full integration suite is built out.
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('ResourceCoordinationService concurrency', () => {
  let service: ResourceCoordinationService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventBusModule, AuditModule],
      providers: [ResourceCoordinationService],
    }).compile();

    service = moduleRef.get(ResourceCoordinationService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows exactly one of 10 simultaneous holds against a count-of-1 resource', async () => {
    const resourceType = 'TEST_RESOURCE';
    const resourceId = randomUUID();

    await service.ensureCapacity(resourceType, resourceId, 1);

    const attempts = Array.from({ length: 10 }, () =>
      service
        .createHold({
          resourceType,
          resourceOwnerId: resourceId,
          ttlSeconds: 60,
          actor: 'test-suite',
        })
        .then(() => 'fulfilled' as const)
        .catch(() => 'rejected' as const),
    );

    const results = await Promise.all(attempts);
    const fulfilled = results.filter((r) => r === 'fulfilled').length;
    const rejected = results.filter((r) => r === 'rejected').length;

    expect(fulfilled).toBe(1);
    expect(rejected).toBe(9);

    const activeHolds = await prisma.resourceHold.count({
      where: { resourceType, resourceOwnerId: resourceId, status: { in: ['PENDING', 'CONFIRMED'] } },
    });
    expect(activeHolds).toBe(1);
  });
});
