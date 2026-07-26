import { RetentionJob } from './retention.job';
import { PrivacyService } from './privacy.service';

describe('RetentionJob', () => {
  it('seeds defaults on init and runs location retention', async () => {
    const privacy = {
      ensureRetentionDefaults: jest.fn().mockResolvedValue(undefined),
      applyLocationRetention: jest.fn().mockResolvedValue(2),
    };
    const job = new RetentionJob(privacy as unknown as PrivacyService);
    await job.onModuleInit();
    expect(privacy.ensureRetentionDefaults).toHaveBeenCalled();
    await job.nightly();
    expect(privacy.applyLocationRetention).toHaveBeenCalled();
  });
});
