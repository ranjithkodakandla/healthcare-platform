import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InboundMessage,
  MessagingChannelAdapter,
  OutboundMessage,
  SendResult,
} from './messaging-channel.adapter';
import { maskLogText, maskPhone } from '../privacy/log-mask.util';

// WhatsApp Business API adapter (Meta Cloud API / Twilio).
// Without credentials, send() stays stubbed (local/dev). When WA_* or TWILIO_*
// env vars are set, send() posts to the live provider (M14).
@Injectable()
export class WhatsAppAdapter implements MessagingChannelAdapter {
  readonly channel = 'whatsapp' as const;
  private readonly logger = new Logger(WhatsAppAdapter.name);

  constructor(private readonly config: ConfigService) {}

  parseInbound(payload: Record<string, unknown>): InboundMessage | null {
    // Twilio WhatsApp: Body + From (whatsapp:+91…)
    if (typeof payload.Body === 'string' && typeof payload.From === 'string') {
      return {
        channel: 'whatsapp',
        from: String(payload.From).replace(/^whatsapp:/, ''),
        body: payload.Body.trim(),
        externalId: typeof payload.MessageSid === 'string' ? payload.MessageSid : undefined,
        raw: payload,
      };
    }

    // Meta Cloud API / 360dialog nested entry
    const entry = (payload.entry as Array<{ changes?: Array<{ value?: Record<string, unknown> }> }>)?.[0];
    const value = entry?.changes?.[0]?.value;
    const msg = (value?.messages as Array<Record<string, unknown>>)?.[0];
    if (msg && typeof msg.from === 'string') {
      const text =
        typeof (msg.text as { body?: string } | undefined)?.body === 'string'
          ? (msg.text as { body: string }).body
          : typeof msg.body === 'string'
            ? msg.body
            : '';
      if (!text) return null;
      return {
        channel: 'whatsapp',
        from: msg.from,
        body: text.trim(),
        externalId: typeof msg.id === 'string' ? msg.id : undefined,
        raw: payload,
      };
    }

    // Simple JSON stub used by local/dev tests
    if (typeof payload.from === 'string' && typeof payload.body === 'string') {
      return {
        channel: 'whatsapp',
        from: payload.from,
        body: payload.body.trim(),
        externalId: typeof payload.id === 'string' ? payload.id : undefined,
        raw: payload,
      };
    }

    return null;
  }

  async send(message: OutboundMessage): Promise<SendResult> {
    const metaToken = this.config.get<string>('WA_ACCESS_TOKEN');
    const metaPhoneId = this.config.get<string>('WA_PHONE_NUMBER_ID');
    if (metaToken && metaPhoneId) {
      return this.sendViaMeta(message, metaToken, metaPhoneId);
    }

    const twilioSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const twilioToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const twilioFrom = this.config.get<string>('TWILIO_WHATSAPP_FROM');
    if (twilioSid && twilioToken && twilioFrom) {
      return this.sendViaTwilio(message, twilioSid, twilioToken, twilioFrom);
    }

    const externalId = `wa-stub-${Date.now()}`;
    this.logger.log(
      `[STUB] WhatsApp → ${maskPhone(message.to)}: ${maskLogText(message.body.slice(0, 80))}`,
    );
    return { accepted: true, externalId, stub: true };
  }

  private async sendViaMeta(
    message: OutboundMessage,
    token: string,
    phoneNumberId: string,
  ): Promise<SendResult> {
    const version = this.config.get<string>('WA_API_VERSION') ?? 'v21.0';
    const to = message.to.replace(/^whatsapp:/, '').replace(/^\+/, '');
    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message.body },
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        messages?: Array<{ id?: string }>;
        error?: { message?: string };
      };
      if (!res.ok) {
        this.logger.error(`Meta WhatsApp send failed ${res.status}: ${json.error?.message ?? res.statusText}`);
        return { accepted: false, stub: false };
      }
      const externalId = json.messages?.[0]?.id ?? `wa-meta-${Date.now()}`;
      this.logger.log(`WhatsApp (Meta) → ${maskPhone(to)}: accepted id=${externalId}`);
      return { accepted: true, externalId, stub: false };
    } catch (err) {
      this.logger.error(`Meta WhatsApp send error: ${(err as Error).message}`);
      return { accepted: false, stub: false };
    }
  }

  private async sendViaTwilio(
    message: OutboundMessage,
    accountSid: string,
    authToken: string,
    from: string,
  ): Promise<SendResult> {
    const toRaw = message.to.replace(/^whatsapp:/, '');
    const to = toRaw.startsWith('+') ? `whatsapp:${toRaw}` : `whatsapp:+${toRaw}`;
    const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({ To: to, From: fromAddr, Body: message.body });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      const json = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
      if (!res.ok) {
        this.logger.error(`Twilio WhatsApp send failed ${res.status}: ${json.message ?? res.statusText}`);
        return { accepted: false, stub: false };
      }
      const externalId = json.sid ?? `wa-twilio-${Date.now()}`;
      this.logger.log(`WhatsApp (Twilio) → ${maskPhone(to)}: accepted id=${externalId}`);
      return { accepted: true, externalId, stub: false };
    } catch (err) {
      this.logger.error(`Twilio WhatsApp send error: ${(err as Error).message}`);
      return { accepted: false, stub: false };
    }
  }
}
