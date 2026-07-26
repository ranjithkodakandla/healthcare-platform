import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrivacyService } from './privacy.service';

@Injectable()
export class RetentionJob implements OnModuleInit {
  private readonly logger = new Logger(RetentionJob.name);

  constructor(private readonly privacy: PrivacyService) {}

  async onModuleInit() {
    try {
      await this.privacy.ensureRetentionDefaults();
    } catch (err) {
      this.logger.warn(`Retention defaults seed skipped: ${(err as Error).message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async nightly() {
    try {
      const n = await this.privacy.applyLocationRetention();
      if (n > 0) this.logger.log(`Location retention coarsened ${n} case(s)`);
    } catch (err) {
      this.logger.error(`Retention job failed: ${(err as Error).message}`);
    }
  }
}
