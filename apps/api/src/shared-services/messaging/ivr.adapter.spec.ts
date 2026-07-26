import { ConfigService } from '@nestjs/config';
import { IvrAdapter } from './ivr.adapter';

describe('IvrAdapter.send', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function adapterWith(env: Record<string, string | undefined>): IvrAdapter {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new IvrAdapter(config);
  }

  it('stubs when Exotel credentials are missing', async () => {
    const adapter = adapterWith({});
    const result = await adapter.send({
      channel: 'ivr',
      to: '+919999999999',
      body: 'Press 1',
    });
    expect(result.accepted).toBe(true);
    expect(result.stub).toBe(true);
    expect(result.externalId).toMatch(/^ivr-stub-/);
  });

  it('posts to Exotel SMS when EXOTEL_* are set', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ SMSMessage: { Sid: 'SM123' } }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = adapterWith({
      EXOTEL_ACCOUNT_SID: 'sahayak',
      EXOTEL_API_KEY: 'key',
      EXOTEL_API_TOKEN: 'token',
      EXOTEL_SMS_FROM: 'SAHYAK',
      EXOTEL_SUBDOMAIN: 'api.in.exotel.com',
    });
    const result = await adapter.send({
      channel: 'ivr',
      to: '+919876543210',
      body: 'Case created',
    });

    expect(result).toEqual({ accepted: true, externalId: 'SM123', stub: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.in.exotel.com/v1/Accounts/sahayak/Sms/send.json',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
