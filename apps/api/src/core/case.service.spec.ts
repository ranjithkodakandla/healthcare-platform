import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from '@sahayak/shared-constants';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusModule } from '../shared-services/event-bus/event-bus.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { AiModule } from '../shared-services/ai/ai.module';
import { CaseService } from './case.service';
import { GuestAccessService } from './guest-access.service';

// Phase 1 exit criterion: a case.created event is observable end-to-end through the
// in-process event bus, and every write is visible in the audit log. Runs against
// the real local Postgres (see TD-001 re: eventual Testcontainers migration).
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('CaseService', () => {
  let service: CaseService;
  let prisma: PrismaService;
  let emitter: EventEmitter2;

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

    service = moduleRef.get(CaseService);
    prisma = moduleRef.get(PrismaService);
    emitter = moduleRef.get(EventEmitter2);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a Case with a human-readable case number, an initial timeline event, an audit row, and emits case.created', async () => {
    const received: Array<{ caseId: string; caseNumber: string }> = [];
    emitter.on(DomainEvent.CASE_CREATED, (payload) => received.push(payload));

    const created = await service.createCase({ actor: 'test-suite', initiatorId: 'user-123' });

    expect(created.caseNumber).toMatch(/^HCC-\d{4}-\d{7}$/);
    expect(created.status).toBe('INITIATED');
    expect(created.caseType).toBe('EMERGENCY');

    const timeline = await service.getTimeline(created.id);
    expect(timeline.map((e) => e.type)).toEqual(
      expect.arrayContaining([DomainEvent.CASE_CREATED, DomainEvent.CASE_SEVERITY_CLASSIFIED]),
    );
    expect(created.severity).toBeTruthy();

    const auditRows = await prisma.auditLog.findMany({
      where: { entityType: 'Case', entityId: created.id },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('CASE_CREATED');

    expect(received).toContainEqual({ caseId: created.id, caseNumber: created.caseNumber });
  });
});
