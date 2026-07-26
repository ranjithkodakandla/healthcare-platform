import { Module } from '@nestjs/common';
import { BedInventoryService, InventoryStalenessCheckJob } from './bed-inventory.service';
import { IncomingPatientsService, ClinicalAckService } from './incoming-patients.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../shared-services/audit/audit.module';
import { EventBusModule } from '../../shared-services/event-bus/event-bus.module';

@Module({
  imports: [PrismaModule, AuditModule, EventBusModule],
  providers: [
    BedInventoryService,
    InventoryStalenessCheckJob,
    IncomingPatientsService,
    ClinicalAckService,
  ],
  exports: [BedInventoryService, IncomingPatientsService, ClinicalAckService],
})
export class BedsModule {}
