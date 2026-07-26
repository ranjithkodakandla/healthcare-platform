import { ProviderConfigService } from './provider-config.service';

describe('ProviderConfigService', () => {
  it('reads the hold_expiry config group ordered by label', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { label: 'CRITICAL bed hold expiry', value: '30 min' },
      { label: 'PLANNED bed hold expiry', value: '120 min' },
    ]);
    const service = new ProviderConfigService({ platformConfig: { findMany } } as never);

    const rows = await service.getHoldExpiryConfig();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupKey: 'hold_expiry' } }),
    );
    expect(rows).toEqual([
      { label: 'CRITICAL bed hold expiry', value: '30 min' },
      { label: 'PLANNED bed hold expiry', value: '120 min' },
    ]);
  });
});
