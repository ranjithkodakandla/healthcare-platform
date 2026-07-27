import { Module } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { ProviderSecondaryController } from './provider-secondary.controller';
import { ProviderSecondaryService } from './provider-secondary.service';
import { ProviderUserService } from './provider-user.service';
import { ProviderConfigService } from './provider-config.service';
import { ProviderAuditService } from './provider-audit.service';
import { ProviderDoctorService } from './provider-doctor.service';
import { ProviderDiagnosticsService } from './provider-diagnostics.service';
import { ProviderCaseService } from './provider-case.service';
import { BedsModule } from '../modules/beds/beds.module';
import { AuthModule } from '../shared-services/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { CoreModule } from '../core/core.module';
import { ResourceCoordinationModule } from '../resource-coordination/resource-coordination.module';

@Module({
  imports: [BedsModule, AuthModule, PrismaModule, AuditModule, CoreModule, ResourceCoordinationModule],
  controllers: [ProviderController, ProviderSecondaryController],
  providers: [
    ProviderSecondaryService,
    ProviderUserService,
    ProviderConfigService,
    ProviderAuditService,
    ProviderDoctorService,
    ProviderDiagnosticsService,
    ProviderCaseService,
  ],
  exports: [ProviderSecondaryService],
})
export class ProvidersModule {}
