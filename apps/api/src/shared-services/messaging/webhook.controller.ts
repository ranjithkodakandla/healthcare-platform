import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { IvrAdapter } from './ivr.adapter';
import { InboundMessageHandler } from './inbound-message.handler';

// Entry channels 3 & 4 (PRD Part B / L2): WhatsApp + IVR terminate here, then
// route through MessagingChannelAdapter → same Case/Bed services as REST (M14).
// Auth: shared secret header when WEBHOOK_SHARED_SECRET is set; open in local
// stub mode so Twilio/Exotel can be pointed at ngrok without Firebase (DL-007).
@ApiTags('Messaging Webhooks')
@Controller('v1/webhook')
export class WebhookController {
  constructor(
    private readonly whatsapp: WhatsAppAdapter,
    private readonly ivr: IvrAdapter,
    private readonly handler: InboundMessageHandler,
    private readonly config: ConfigService,
  ) {}

  // Meta Cloud API subscription handshake — must return hub.challenge as plain text.
  @Get('whatsapp')
  @ApiOperation({ summary: 'Meta WhatsApp webhook verification (hub.challenge)' })
  verifyWhatsApp(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    const expected = this.config.get<string>('WA_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && verifyToken === expected && challenge) {
      return res.status(HttpStatus.OK).type('text/plain').send(challenge);
    }
    throw new UnauthorizedException('WhatsApp webhook verification failed');
  }

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'WhatsApp Business API inbound webhook (Twilio / 360dialog / Meta)' })
  @ApiHeader({ name: 'x-webhook-secret', required: false })
  async whatsappInbound(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.assertWebhookSecret(secret);
    const msg = this.whatsapp.parseInbound(body ?? {});
    if (!msg) {
      throw new BadRequestException(
        'Unrecognised WhatsApp payload — expected Body/From or Meta Cloud API shape',
      );
    }
    const result = await this.handler.handle(msg, this.whatsapp);
    return {
      data: {
        channel: 'whatsapp',
        intent: result.intent,
        reply: result.reply,
        send: result.send,
        ...(result.data ? { result: result.data } : {}),
      },
      meta: { stub: result.send.stub },
    };
  }

  @Post('ivr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'IVR / Exotel inbound webhook (DTMF → same intents as WhatsApp)' })
  @ApiHeader({ name: 'x-webhook-secret', required: false })
  async ivrInbound(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') secret?: string,
  ) {
    this.assertWebhookSecret(secret);
    const msg = this.ivr.parseInbound(body ?? {});
    if (!msg) {
      throw new BadRequestException('Unrecognised IVR payload — expected CallFrom/Digits or From/Digits');
    }
    const result = await this.handler.handle(msg, this.ivr);
    return {
      data: {
        channel: 'ivr',
        intent: result.intent,
        reply: result.reply,
        send: result.send,
        ...(result.data ? { result: result.data } : {}),
      },
      meta: { stub: result.send.stub },
    };
  }

  private assertWebhookSecret(provided?: string): void {
    const expected = this.config.get<string>('WEBHOOK_SHARED_SECRET');
    if (!expected) return; // open stub mode for local/dev
    if (provided !== expected) {
      throw new UnauthorizedException('Invalid or missing X-Webhook-Secret');
    }
  }
}
