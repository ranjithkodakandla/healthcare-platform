import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { WebhookController } from './webhook.controller';

describe('WebhookController (unit)', () => {
  function build(secret?: string, verify?: string) {
    const whatsapp = {
      parseInbound: jest.fn(),
    };
    const ivr = {
      parseInbound: jest.fn(),
    };
    const handler = {
      handle: jest.fn().mockResolvedValue({
        intent: 'HELP',
        reply: 'ok',
        send: { stub: true },
        data: { x: 1 },
      }),
    };
    const config = {
      get: jest.fn((k: string) => {
        if (k === 'WEBHOOK_SHARED_SECRET') return secret;
        if (k === 'WA_WEBHOOK_VERIFY_TOKEN') return verify;
        return undefined;
      }),
    };
    const controller = new WebhookController(
      whatsapp as never,
      ivr as never,
      handler as never,
      config as never,
    );
    return { controller, whatsapp, ivr, handler };
  }

  it('verifyWhatsApp challenge and reject', () => {
    const { controller } = build(undefined, 'tok');
    const res = { status: jest.fn().mockReturnThis(), type: jest.fn().mockReturnThis(), send: jest.fn() };
    controller.verifyWhatsApp('subscribe', 'tok', '123', res as never);
    expect(res.send).toHaveBeenCalledWith('123');
    expect(() => controller.verifyWhatsApp('x', 'bad', '1', res as never)).toThrow(
      UnauthorizedException,
    );
  });

  it('whatsapp and ivr inbound with secret checks', async () => {
    const open = build();
    open.whatsapp.parseInbound.mockReturnValueOnce(null);
    await expect(open.controller.whatsappInbound({})).rejects.toBeInstanceOf(BadRequestException);
    open.whatsapp.parseInbound.mockReturnValueOnce({ channel: 'whatsapp', from: '1', body: 'HELP' });
    await open.controller.whatsappInbound({});

    const secured = build('sec');
    await expect(secured.controller.whatsappInbound({}, 'wrong')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    secured.whatsapp.parseInbound.mockReturnValueOnce({ channel: 'whatsapp', from: '1', body: 'HELP' });
    await secured.controller.whatsappInbound({}, 'sec');

    open.ivr.parseInbound.mockReturnValueOnce(null);
    await expect(open.controller.ivrInbound({})).rejects.toBeInstanceOf(BadRequestException);
    open.ivr.parseInbound.mockReturnValueOnce({ channel: 'ivr', from: '1', body: '1' });
    const result = await open.controller.ivrInbound({});
    expect(result.data.intent).toBe('HELP');
  });
});
