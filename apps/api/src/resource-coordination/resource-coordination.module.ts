import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ResourceCoordinationService } from './resource-coordination.service';
import { ResourceHoldExpiryJob } from './resource-hold-expiry.job';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [ResourceCoordinationService, ResourceHoldExpiryJob],
  exports: [ResourceCoordinationService],
})
export class ResourceCoordinationModule {}
