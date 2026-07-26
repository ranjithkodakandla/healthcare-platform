import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventPublisher } from './event-publisher.interface';

@Injectable()
export class InProcessEventPublisher implements EventPublisher {
  constructor(private readonly emitter: EventEmitter2) {}

  publish<T extends object>(eventName: string, payload: T): void {
    this.emitter.emit(eventName, payload);
  }
}
