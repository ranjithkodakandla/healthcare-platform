// M14 — MessagingChannelAdapter: single internal interface for WhatsApp / IVR / SMS.
// Module code never talks to Exotel or WhatsApp Business API directly — only to this
// adapter — so adding a future regional messaging app is one adapter, not N integrations.

export type MessagingChannel = 'whatsapp' | 'ivr' | 'sms';

export interface InboundMessage {
  channel: MessagingChannel;
  /** E.164 phone or provider-assigned channel id */
  from: string;
  /** Raw user text / DTMF digits */
  body: string;
  /** Provider message id (Twilio SID, 360dialog wamid, Exotel CallSid) */
  externalId?: string;
  /** Opaque provider payload for audit */
  raw?: Record<string, unknown>;
}

export interface OutboundMessage {
  channel: MessagingChannel;
  to: string;
  body: string;
}

export interface SendResult {
  accepted: boolean;
  externalId?: string;
  /** Stub mode always returns true with a synthetic id until credentials are wired */
  stub: boolean;
}

export const MESSAGING_CHANNEL_ADAPTER = Symbol('MESSAGING_CHANNEL_ADAPTER');

export interface MessagingChannelAdapter {
  readonly channel: MessagingChannel;
  /** Parse provider webhook body into a normalised inbound message (null = ignore). */
  parseInbound(payload: Record<string, unknown>): InboundMessage | null;
  /** Send a reply. Stub implementations log + return synthetic acceptance. */
  send(message: OutboundMessage): Promise<SendResult>;
}
