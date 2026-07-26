import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EVENT_PUBLISHER } from './event-publisher.interface';
import { InProcessEventPublisher } from './in-process-event-publisher';

@Global()
@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [{ provide: EVENT_PUBLISHER, useClass: InProcessEventPublisher }],
  exports: [EVENT_PUBLISHER],
})
export class EventBusModule {}
