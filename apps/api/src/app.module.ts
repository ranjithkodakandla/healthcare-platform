import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateConfig } from './config.schema';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { EventBusModule } from './shared-services/event-bus/event-bus.module';
import { AuditModule } from './shared-services/audit/audit.module';
import { CoreModule } from './core/core.module';
import { ResourceCoordinationModule } from './resource-coordination/resource-coordination.module';
import { AuthModule } from './shared-services/auth/auth.module';
import { ConsentModule } from './shared-services/consent/consent.module';
import { AdminModule } from './admin/admin.module';
import { ProvidersModule } from './providers/providers.module';
import { CitizenModule } from './citizen/citizen.module';
import { MessagingModule } from './shared-services/messaging/messaging.module';
import { AiModule } from './shared-services/ai/ai.module';
import { PrivacyModule } from './shared-services/privacy/privacy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig,
    }),
    // Baseline abuse protection (OWASP API) — 120 req/min per IP default.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    EventBusModule,
    AuditModule,
    ConsentModule,
    PrivacyModule,
    AiModule,
    HealthModule,
    AuthModule,
    CoreModule,
    ResourceCoordinationModule,
    AdminModule,
    ProvidersModule,
    CitizenModule,
    MessagingModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
