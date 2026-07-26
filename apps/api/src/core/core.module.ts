import { Module } from '@nestjs/common';
import { CaseService } from './case.service';
import { GuestAccessService } from './guest-access.service';

@Module({
  providers: [CaseService, GuestAccessService],
  exports: [CaseService, GuestAccessService],
})
export class CoreModule {}
