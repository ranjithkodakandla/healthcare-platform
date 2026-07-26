import { Module } from '@nestjs/common';
import { ProviderOnboardingService } from './provider-onboarding.service';
import { ConsoleUserService } from './console-user.service';
import { AdminOpsService } from './admin-ops.service';
import { AdminController } from './admin.controller';
import { AdminStatsController } from './admin-stats.controller';
import { AdminOpsController } from './admin-ops.controller';
import { AuthModule } from '../shared-services/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { HealthModule } from '../health/health.module';

@Module({
  imports: [AuthModule, PrismaModule, HealthModule],
  controllers: [AdminController, AdminStatsController, AdminOpsController],
  providers: [ProviderOnboardingService, ConsoleUserService, AdminOpsService],
  exports: [ProviderOnboardingService, ConsoleUserService, AdminOpsService],
})
export class AdminModule {}
