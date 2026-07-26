import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCapability, DomainEvent } from '@sahayak/shared-constants';
import { EVENT_PUBLISHER, EventPublisher } from '../event-bus/event-publisher.interface';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';

export interface AiExecuteOptions<T> {
  capability: AiCapability;
  input: unknown;
  /** Mandatory GT-11 / M8 fallback — invoked on timeout, error, or unset endpoint. */
  fallback: () => T | Promise<T>;
  timeoutMs?: number;
  /** Optional correlation for ai.fallback_used payload */
  context?: Record<string, unknown>;
}

export interface AiExecuteResult<T> {
  value: T;
  usedFallback: boolean;
}

// M8 single chokepoint — every module AI call routes here; never call Vertex/Gemini directly.
@Injectable()
export class AiPlatformClient {
  private readonly logger = new Logger(AiPlatformClient.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AiProvider,
    private readonly config: ConfigService,
    @Inject(EVENT_PUBLISHER) private readonly events: EventPublisher,
  ) {}

  async execute<T>(opts: AiExecuteOptions<T>): Promise<AiExecuteResult<T>> {
    const timeoutMs =
      opts.timeoutMs ?? this.config.get<number>('AI_TIMEOUT_MS') ?? 2000;

    if (!this.provider.isConfigured()) {
      return this.useFallback(opts, 'not_configured', timeoutMs);
    }

    try {
      const value = await this.provider.invoke<T>(
        { capability: opts.capability, input: opts.input },
        timeoutMs,
      );
      return { value, usedFallback: false };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'unknown_error';
      this.logger.warn(`AI ${opts.capability} failed (${reason}); invoking fallback`);
      return this.useFallback(opts, reason, timeoutMs);
    }
  }

  private async useFallback<T>(
    opts: AiExecuteOptions<T>,
    reason: string,
    timeoutMs: number,
  ): Promise<AiExecuteResult<T>> {
    const value = await opts.fallback();
    this.events.publish(DomainEvent.AI_FALLBACK_USED, {
      capability: opts.capability,
      reason,
      timeoutMs,
      ...(opts.context ?? {}),
    });
    return { value, usedFallback: true };
  }
}
