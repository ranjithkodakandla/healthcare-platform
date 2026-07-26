import { IvrAdapter } from './ivr.adapter';

describe('IvrAdapter parse + send', () => {
  it('parses Exotel/Twilio/stub shapes', () => {
    const adapter = new IvrAdapter({ get: () => undefined } as never);
    expect(adapter.parseInbound({ CallFrom: '1', Digits: '2', CallSid: 'c' })).toEqual(
      expect.objectContaining({ body: '2', from: '1' }),
    );
    expect(adapter.parseInbound({ CallFrom: '1', digits: '3' })).toEqual(
      expect.objectContaining({ body: '3' }),
    );
    expect(adapter.parseInbound({ CallFrom: '1', body: 'HELP' })).toEqual(
      expect.objectContaining({ body: 'HELP' }),
    );
    expect(adapter.parseInbound({ CallFrom: '1' })).toEqual(expect.objectContaining({ body: '1' }));
    expect(adapter.parseInbound({ From: '9', Digits: '0', CallSid: 'c' })).toEqual(
      expect.objectContaining({ body: '0' }),
    );
    expect(adapter.parseInbound({ from: 'a', body: 'b', id: '1' })).toEqual(
      expect.objectContaining({ from: 'a' }),
    );
    expect(adapter.parseInbound({})).toBeNull();
  });

  it('send stub and Exotel success/failure', async () => {
    const stub = new IvrAdapter({ get: () => undefined } as never);
    await expect(stub.send({ channel: 'ivr', to: '1', body: 'hi' })).resolves.toEqual(
      expect.objectContaining({ stub: true, accepted: true }),
    );

    const original = global.fetch;
    const live = new IvrAdapter({
      get: (k: string) =>
        ({
          EXOTEL_ACCOUNT_SID: 'sid',
          EXOTEL_API_KEY: 'k',
          EXOTEL_API_TOKEN: 't',
          EXOTEL_SMS_FROM: 'SAHAYAK',
          EXOTEL_SUBDOMAIN: 'api.exotel.com',
        } as Record<string, string>)[k],
    } as never);
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ SMSMessage: { Sid: 'SM1' } }),
    }) as never;
    await expect(live.send({ channel: 'ivr', to: '+91', body: 'x' })).resolves.toEqual({
      accepted: true,
      externalId: 'SM1',
      stub: false,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      json: async () => ({ RestException: { Message: 'bad' } }),
    }) as never;
    await expect(live.send({ channel: 'ivr', to: '91', body: 'x' })).resolves.toEqual({
      accepted: false,
      stub: false,
    });
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as never;
    await expect(live.send({ channel: 'ivr', to: '91', body: 'x' })).resolves.toEqual({
      accepted: false,
      stub: false,
    });
    global.fetch = original;
  });
});
