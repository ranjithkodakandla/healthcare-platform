import { ConfigService } from '@nestjs/config';
import { WhatsAppAdapter } from './whatsapp.adapter';

describe('WhatsAppAdapter.send', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function adapterWith(env: Record<string, string | undefined>): WhatsAppAdapter {
    const config = {
      get: (key: string) => env[key],
    } as unknown as ConfigService;
    return new WhatsAppAdapter(config);
  }

  it('stubs when no credentials are configured', async () => {
    const adapter = adapterWith({});
    const result = await adapter.send({
      channel: 'whatsapp',
      to: '+919999999999',
      body: 'Hello',
    });
    expect(result.accepted).toBe(true);
    expect(result.stub).toBe(true);
    expect(result.externalId).toMatch(/^wa-stub-/);
  });

  it('posts to Meta Cloud API when WA_* are set', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.abc' }] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = adapterWith({
      WA_ACCESS_TOKEN: 'token',
      WA_PHONE_NUMBER_ID: '123456',
      WA_API_VERSION: 'v21.0',
    });
    const result = await adapter.send({
      channel: 'whatsapp',
      to: 'whatsapp:+919999999999',
      body: 'Beds nearby',
    });

    expect(result).toEqual({ accepted: true, externalId: 'wamid.abc', stub: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://graph.facebook.com/v21.0/123456/messages',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toBe('919999999999');
    expect(body.text.body).toBe('Beds nearby');
  });

  it('posts to Twilio when TWILIO_* are set (and Meta unset)', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: 'SMxxxx' }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const adapter = adapterWith({
      TWILIO_ACCOUNT_SID: 'ACxxx',
      TWILIO_AUTH_TOKEN: 'secret',
      TWILIO_WHATSAPP_FROM: 'whatsapp:+14155238886',
    });
    const result = await adapter.send({
      channel: 'whatsapp',
      to: '+919888888888',
      body: 'Ambulance',
    });

    expect(result).toEqual({ accepted: true, externalId: 'SMxxxx', stub: false });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.twilio.com/2010-04-01/Accounts/ACxxx/Messages.json',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns accepted:false when Meta API errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({ error: { message: 'Invalid OAuth' } }),
    }) as unknown as typeof fetch;

    const adapter = adapterWith({
      WA_ACCESS_TOKEN: 'bad',
      WA_PHONE_NUMBER_ID: '1',
    });
    const result = await adapter.send({
      channel: 'whatsapp',
      to: '919999999999',
      body: 'x',
    });
    expect(result).toEqual({ accepted: false, stub: false });
  });
});
