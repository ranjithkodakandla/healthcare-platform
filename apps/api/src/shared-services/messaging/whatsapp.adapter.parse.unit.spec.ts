import { WhatsAppAdapter } from './whatsapp.adapter';

describe('WhatsAppAdapter.parseInbound + send error paths', () => {
  const adapter = new WhatsAppAdapter({ get: () => undefined } as never);

  it('parses Twilio, Meta, stub, and null payloads', () => {
    expect(
      adapter.parseInbound({ Body: 'HELP', From: 'whatsapp:+9198', MessageSid: 'SM1' }),
    ).toEqual(
      expect.objectContaining({ from: '+9198', body: 'HELP', externalId: 'SM1' }),
    );
    expect(
      adapter.parseInbound({
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [{ from: '9198', text: { body: 'BEDS' }, id: 'm1' }],
                },
              },
            ],
          },
        ],
      }),
    ).toEqual(expect.objectContaining({ body: 'BEDS', externalId: 'm1' }));
    expect(
      adapter.parseInbound({
        entry: [{ changes: [{ value: { messages: [{ from: '9198', body: 'x' }] } }] }],
      }),
    ).toEqual(expect.objectContaining({ body: 'x' }));
    expect(
      adapter.parseInbound({
        entry: [{ changes: [{ value: { messages: [{ from: '9198' }] } }] }],
      }),
    ).toBeNull();
    expect(adapter.parseInbound({ from: 'a', body: 'b', id: '1' })).toEqual(
      expect.objectContaining({ from: 'a', body: 'b' }),
    );
    expect(adapter.parseInbound({})).toBeNull();
  });

  it('handles Meta/Twilio fetch throws and missing message id', async () => {
    const original = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as never;
    const meta = new WhatsAppAdapter({
      get: (k: string) =>
        ({ WA_ACCESS_TOKEN: 't', WA_PHONE_NUMBER_ID: '1' } as Record<string, string>)[k],
    } as never);
    await expect(meta.send({ channel: 'whatsapp', to: '1', body: 'x' })).resolves.toEqual({
      accepted: false,
      stub: false,
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as never;
    await expect(meta.send({ channel: 'whatsapp', to: '+1', body: 'x' })).resolves.toEqual(
      expect.objectContaining({ accepted: true, stub: false }),
    );

    const twilio = new WhatsAppAdapter({
      get: (k: string) =>
        ({
          TWILIO_ACCOUNT_SID: 'AC',
          TWILIO_AUTH_TOKEN: 'tok',
          TWILIO_WHATSAPP_FROM: '+100',
        } as Record<string, string>)[k],
    } as never);
    global.fetch = jest.fn().mockRejectedValue(new Error('net')) as never;
    await expect(twilio.send({ channel: 'whatsapp', to: '9198', body: 'x' })).resolves.toEqual({
      accepted: false,
      stub: false,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'err',
      json: async () => ({ message: 'bad' }),
    }) as never;
    await expect(twilio.send({ channel: 'whatsapp', to: 'whatsapp:+9198', body: 'x' })).resolves.toEqual({
      accepted: false,
      stub: false,
    });
    global.fetch = original;
  });
});
