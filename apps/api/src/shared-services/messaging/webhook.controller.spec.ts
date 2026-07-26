import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookController } from './webhook.controller';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { IvrAdapter } from './ivr.adapter';
import { InboundMessageHandler } from './inbound-message.handler';

describe('WebhookController Meta verify', () => {
  function controllerWith(env: Record<string, string | undefined>): WebhookController {
    const config = {
      get: <T>(key: string) => env[key] as T,
    } as ConfigService;
    return new WebhookController(
      {} as WhatsAppAdapter,
      {} as IvrAdapter,
      {} as InboundMessageHandler,
      config,
    );
  }

  it('returns hub.challenge when verify token matches', () => {
    const ctrl = controllerWith({ WA_WEBHOOK_VERIFY_TOKEN: 'secret' });
    const sends: Array<{ status: number; body: string }> = [];
    const res = {
      status(code: number) {
        sends.push({ status: code, body: '' });
        return this;
      },
      type() {
        return this;
      },
      send(body: string) {
        sends[sends.length - 1].body = body;
        return this;
      },
    };
    ctrl.verifyWhatsApp('subscribe', 'secret', '12345', res as never);
    expect(sends).toEqual([{ status: 200, body: '12345' }]);
  });

  it('rejects bad verify token', () => {
    const ctrl = controllerWith({ WA_WEBHOOK_VERIFY_TOKEN: 'secret' });
    expect(() =>
      ctrl.verifyWhatsApp('subscribe', 'wrong', '12345', {
        status: () => ({ type: () => ({ send: () => undefined }) }),
      } as never),
    ).toThrow(UnauthorizedException);
  });
});
