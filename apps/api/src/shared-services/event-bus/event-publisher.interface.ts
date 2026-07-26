// M6: cross-module signalling for case.*/resource_hold.* events goes through this
// interface, never a direct EventEmitter2 call from a module — so the in-process
// implementation can be swapped for Redis Streams later without touching callers.
export interface EventPublisher {
  publish<T extends object>(eventName: string, payload: T): void;
}

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
