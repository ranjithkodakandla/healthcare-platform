import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppAdapter } from './whatsapp.adapter';
import { IvrAdapter } from './ivr.adapter';
import { InboundMessageHandler } from './inbound-message.handler';
import { WebhookController } from './webhook.controller';
import { CoreModule } from '../../core/core.module';
import { CitizenModule } from '../../citizen/citizen.module';
import { BedsModule } from '../../modules/beds/beds.module';
import { PrismaModule } from '../../prisma/prisma.module';

// M14: /shared-services/messaging — WhatsApp + IVR adapters + webhook entry points.
@Module({
  imports: [ConfigModule, CoreModule, CitizenModule, BedsModule, PrismaModule],
  controllers: [WebhookController],
  providers: [WhatsAppAdapter, IvrAdapter, InboundMessageHandler],
  exports: [WhatsAppAdapter, IvrAdapter, InboundMessageHandler],
})
export class MessagingModule {}
