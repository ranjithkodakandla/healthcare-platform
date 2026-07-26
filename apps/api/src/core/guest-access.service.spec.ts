import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusModule } from '../shared-services/event-bus/event-bus.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { AiModule } from '../shared-services/ai/ai.module';
import { CaseService } from './case.service';
import { GuestAccessService } from './guest-access.service';

// Phase 2 exit criterion: a guest citizen can create exactly one untracked request
// (GT-10/BR-06), enforced server-side.
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('Guest access flow (GT-10/BR-06)', () => {
  let caseService: CaseService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        PrismaModule,
        EventBusModule,
        AuditModule,
        AiModule,
      ],
      providers: [CaseService, GuestAccessService],
    }).compile();

    caseService = moduleRef.get(CaseService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows exactly one active guest case per device, rejecting a second concurrent one', async () => {
    const deviceId = randomUUID();

    const first = await caseService.createGuestCase({ deviceId });
    expect(first.initiatorId).toBe(`guest:${deviceId}`);

    await expect(caseService.createGuestCase({ deviceId })).rejects.toMatchObject({
      response: { code: 'GUEST_ACTIVE_REQUEST_LIMIT_EXCEEDED' },
    });

    const activeCount = await prisma.case.count({
      where: { initiatorId: `guest:${deviceId}`, status: { in: ['INITIATED', 'IN_PROGRESS', 'STABILIZED'] } },
    });
    expect(activeCount).toBe(1);
  });

  it('allows a new guest case once the prior one reaches a terminal status', async () => {
    const deviceId = randomUUID();

    const first = await caseService.createGuestCase({ deviceId });
    await prisma.case.update({ where: { id: first.id }, data: { status: 'RESOLVED' } });

    const second = await caseService.createGuestCase({ deviceId });
    expect(second.id).not.toBe(first.id);
  });
});
