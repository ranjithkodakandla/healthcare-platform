import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { ConsentService } from './consent.service';

// Phase 2 exit criterion: every consent action produces an audit_log row (GT-06/GT-07).
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('ConsentService', () => {
  let service: ConsentService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuditModule],
      providers: [ConsentService],
    }).compile();

    service = moduleRef.get(ConsentService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('grants, checks, and revokes consent, auditing both actions', async () => {
    const granterId = `citizen:${randomUUID()}`;
    const granteeId = `provider:${randomUUID()}`;
    const purpose = 'CASE_DATA_SHARING';

    expect(await service.isGranted(granterId, granteeId, purpose)).toBe(false);

    const grant = await service.grant({ granterId, granteeId, purpose });
    expect(await service.isGranted(granterId, granteeId, purpose)).toBe(true);

    await service.revoke(grant.id, granterId);
    expect(await service.isGranted(granterId, granteeId, purpose)).toBe(false);

    const auditRows = await prisma.auditLog.findMany({
      where: { entityType: 'ConsentGrant', entityId: grant.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(auditRows.map((r) => r.action)).toEqual(['CONSENT_GRANTED', 'CONSENT_REVOKED']);
  });
});
