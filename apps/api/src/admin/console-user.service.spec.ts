import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { ConsoleRole } from '@sahayak/shared-constants';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule } from '../shared-services/audit/audit.module';
import { ConsoleUserService } from './console-user.service';

const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('ConsoleUserService', () => {
  let service: ConsoleUserService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuditModule],
      providers: [ConsoleUserService],
    }).compile();

    service = moduleRef.get(ConsoleUserService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a console user with an audited role assignment', async () => {
    const email = `${randomUUID()}@sahayak-internal.example`;

    const user = await service.createConsoleUser({
      email,
      role: ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      actor: 'console-admin-1',
    });

    expect(user.role).toBe(ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST);

    const auditRows = await prisma.auditLog.findMany({
      where: { entityType: 'ConsoleUser', entityId: user.id },
    });
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].action).toBe('CONSOLE_USER_CREATED');
  });
});
