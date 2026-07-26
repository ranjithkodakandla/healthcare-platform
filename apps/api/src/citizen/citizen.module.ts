import { Module } from '@nestjs/common';
import { CitizenController } from './citizen.controller';
import { CitizenDirectoryController } from './citizen-directory.controller';
import { CitizenBedSearchService } from './citizen-bed-search.service';
import { CitizenAmbulanceService } from './citizen-ambulance.service';
import { CitizenDirectoryService } from './citizen-directory.service';
import { AmbulanceOfferDispatchJob } from './ambulance-offer-dispatch.job';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../shared-services/audit/audit.module';
import { EventBusModule } from '../shared-services/event-bus/event-bus.module';
import { AuthModule } from '../shared-services/auth/auth.module';
import { CoreModule } from '../core/core.module';
import { ResourceCoordinationModule } from '../resource-coordination/resource-coordination.module';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    EventBusModule,
    AuthModule,
    CoreModule,
    ResourceCoordinationModule,
  ],
  controllers: [CitizenController, CitizenDirectoryController],
  providers: [
    CitizenBedSearchService,
    CitizenAmbulanceService,
    CitizenDirectoryService,
    AmbulanceOfferDispatchJob,
  ],
  exports: [CitizenBedSearchService, CitizenAmbulanceService, CitizenDirectoryService],
})
export class CitizenModule {}
