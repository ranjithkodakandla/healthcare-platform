import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InboundMessage,
  MessagingChannelAdapter,
  OutboundMessage,
  SendResult,
} from './messaging-channel.adapter';
import { maskLogText, maskPhone } from '../privacy/log-mask.util';

// Exotel / Twilio Voice IVR adapter.
// Inbound: DTMF digit strings → same intents as WhatsApp text (M14 DTO parity).
// Outbound: when Exotel SMS creds are set, reply via SMS (call webhook replies
// cannot reliably TTS mid-flow); otherwise stub.
@Injectable()
export class IvrAdapter implements MessagingChannelAdapter {
  readonly channel = 'ivr' as const;
  private readonly logger = new Logger(IvrAdapter.name);

  constructor(private readonly config: ConfigService) {}

  parseInbound(payload: Record<string, unknown>): InboundMessage | null {
    // Exotel: CallFrom + Digits / CustomField
    if (typeof payload.CallFrom === 'string') {
      const digits =
        typeof payload.Digits === 'string'
          ? payload.Digits
          : typeof payload.digits === 'string'
            ? payload.digits
            : '';
      return {
        channel: 'ivr',
        from: payload.CallFrom,
        body: digits || (typeof payload.body === 'string' ? payload.body : '1'),
        externalId: typeof payload.CallSid === 'string' ? payload.CallSid : undefined,
        raw: payload,
      };
    }

    // Twilio Voice
    if (typeof payload.From === 'string' && (payload.Digits != null || payload.body != null)) {
      return {
        channel: 'ivr',
        from: String(payload.From),
        body: String(payload.Digits ?? payload.body ?? '').trim(),
        externalId: typeof payload.CallSid === 'string' ? payload.CallSid : undefined,
        raw: payload,
      };
    }

    if (typeof payload.from === 'string' && typeof payload.body === 'string') {
      return {
        channel: 'ivr',
        from: payload.from,
        body: payload.body.trim(),
        externalId: typeof payload.id === 'string' ? payload.id : undefined,
        raw: payload,
      };
    }

    return null;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const sid = this.config.get<string>('EXOTEL_ACCOUNT_SID');
    const apiKey = this.config.get<string>('EXOTEL_API_KEY');
    const apiToken = this.config.get<string>('EXOTEL_API_TOKEN');
    const from = this.config.get<string>('EXOTEL_SMS_FROM');
    if (sid && apiKey && apiToken && from) {
      return this.sendViaExotelSms(message, sid, apiKey, apiToken, from);
    }

    const externalId = `ivr-stub-${Date.now()}`;
    this.logger.log(
      `[STUB] IVR TTS/SMS → ${maskPhone(message.to)}: ${maskLogText(message.body.slice(0, 80))}`,
    );
    return { accepted: true, externalId, stub: true };
  }

  private async sendViaExotelSms(
    message: OutboundMessage,
    accountSid: string,
    apiKey: string,
    apiToken: string,
    from: string,
  ): Promise<SendResult> {
    const subdomain = this.config.get<string>('EXOTEL_SUBDOMAIN') ?? 'api.exotel.com';
    const to = message.to.replace(/^\+/, '');
    const url = `https://${subdomain}/v1/Accounts/${accountSid}/Sms/send.json`;
    const body = new URLSearchParams({
      From: from,
      To: to,
      Body: message.body,
    });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const json = (await res.json().catch(() => ({}))) as {
        SMSMessage?: { Sid?: string };
        RestException?: { Message?: string };
        message?: string;
      };
      if (!res.ok) {
        const errMsg = json.RestException?.Message ?? json.message ?? res.statusText;
        this.logger.error(`Exotel SMS send failed ${res.status}: ${errMsg}`);
        return { accepted: false, stub: false };
      }
      const externalId = json.SMSMessage?.Sid ?? `exotel-${Date.now()}`;
      this.logger.log(`IVR reply via Exotel SMS → ${maskPhone(to)}: accepted id=${externalId}`);
      return { accepted: true, externalId, stub: false };
    } catch (err) {
      this.logger.error(`Exotel SMS send error: ${(err as Error).message}`);
      return { accepted: false, stub: false };
    }
  }
}
