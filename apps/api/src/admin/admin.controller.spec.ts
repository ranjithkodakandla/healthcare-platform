import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ConsoleRole, ProviderType, Role } from '@sahayak/shared-constants';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusModule } from '../shared-services/event-bus/event-bus.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { AuthModule } from '../shared-services/auth/auth.module';
import { AdminController } from './admin.controller';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { ConsoleUserService } from './console-user.service';

// I7 ABAC layer: RolesGuard (Role.ADMIN) is bypassed here by calling the controller
// method directly with a fabricated principal — the point of this test is proving
// ConsoleUserService.requireConsoleRole actually blocks/allows correctly, which is
// independent of whether the bearer token was real (still blocked, DL-007).
const describeDb = process.env.SKIP_DB_INTEGRATION === '1' ? describe.skip : describe;
describeDb('AdminController — ConsoleRole authorization layer', () => {
  let controller: AdminController;
  let consoleUsers: ConsoleUserService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, EventBusModule, AuditModule, AuthModule],
      controllers: [AdminController],
      providers: [ProviderOnboardingService, ConsoleUserService],
    }).compile();

    controller = moduleRef.get(AdminController);
    consoleUsers = moduleRef.get(ConsoleUserService);
    prisma = moduleRef.get(PrismaService);
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('allows a PROVIDER_ONBOARDING_SPECIALIST to create a provider application', async () => {
    const uid = randomUUID();
    await consoleUsers.createConsoleUser({
      email: `${uid}@sahayak-internal.example`,
      role: ConsoleRole.PROVIDER_ONBOARDING_SPECIALIST,
      actor: 'test-setup',
      firebaseUid: uid,
    });

    const result = await controller.createApplication(
      { providerType: ProviderType.HOSPITAL, legalName: 'Test Hospital' },
      { uid, role: Role.ADMIN },
    );

    expect((result.data as { legalName: string }).legalName).toBe('Test Hospital');
  });

  it('rejects a SUPPORT_AGENT from creating a provider application', async () => {
    const uid = randomUUID();
    await consoleUsers.createConsoleUser({
      email: `${uid}@sahayak-internal.example`,
      role: ConsoleRole.SUPPORT_AGENT,
      actor: 'test-setup',
      firebaseUid: uid,
    });

    await expect(
      controller.createApplication(
        { providerType: ProviderType.HOSPITAL, legalName: 'Test Hospital 2' },
        { uid, role: Role.ADMIN },
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects an unknown uid entirely', async () => {
    await expect(
      controller.createApplication(
        { providerType: ProviderType.HOSPITAL, legalName: 'Test Hospital 3' },
        { uid: randomUUID(), role: Role.ADMIN },
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
