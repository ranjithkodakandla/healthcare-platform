import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { ConsentModule } from '../consent/consent.module';
import { PrivacyController } from './privacy.controller';
import { PrivacyService } from './privacy.service';
import { RetentionJob } from './retention.job';

@Module({
  imports: [PrismaModule, AuditModule, AuthModule, ConsentModule],
  controllers: [PrivacyController],
  providers: [PrivacyService, RetentionJob],
  exports: [PrivacyService],
})
export class PrivacyModule {}
