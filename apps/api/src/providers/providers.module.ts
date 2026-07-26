import { Module } from '@nestjs/common';
import { ProviderController } from './provider.controller';
import { ProviderSecondaryController } from './provider-secondary.controller';
import { ProviderSecondaryService } from './provider-secondary.service';
import { BedsModule } from '../modules/beds/beds.module';
import { AuthModule } from '../shared-services/auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [BedsModule, AuthModule, PrismaModule],
  controllers: [ProviderController, ProviderSecondaryController],
  providers: [ProviderSecondaryService],
  exports: [ProviderSecondaryService],
})
export class ProvidersModule {}
