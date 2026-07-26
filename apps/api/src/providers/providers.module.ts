import { Module } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { ProviderSecondaryController } from './provider-secondary.controller';
import { ProviderSecondaryService } from './provider-secondary.service';
import { ProviderUserService } from './provider-user.service';
import { ProviderConfigService } from './provider-config.service';
import { ProviderAuditService } from './provider-audit.service';
import { BedsModule } from '../modules/beds/beds.module';
import { AuthModule } from '../shared-services/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../shared-services/audit/audit.module';

@Module({
  imports: [BedsModule, AuthModule, PrismaModule, AuditModule],
  controllers: [ProviderController, ProviderSecondaryController],
  providers: [ProviderSecondaryService, ProviderUserService, ProviderConfigService, ProviderAuditService],
  exports: [ProviderSecondaryService],
})
export class ProvidersModule {}
