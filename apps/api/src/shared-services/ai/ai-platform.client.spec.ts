import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AiCapability, DomainEvent } from '@sahayak/shared-constants';
import { EventBusModule } from '../event-bus/event-bus.module';
import { AiPlatformClient } from './ai-platform.client';
import { AI_PROVIDER, AiProvider } from './ai-provider.interface';
import { AiModule } from './ai.module';

describe('AiPlatformClient', () => {
  let client: AiPlatformClient;
  let emitter: EventEmitter2;
  let provider: AiProvider;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ AI_TIMEOUT_MS: 50 })],
        }),
        EventBusModule,
        AiModule,
      ],
    }).compile();

    client = moduleRef.get(AiPlatformClient);
    provider = moduleRef.get(AI_PROVIDER);
    emitter = moduleRef.get(EventEmitter2);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses fallback and emits AI_FALLBACK_USED when endpoint is unset', async () => {
    jest.spyOn(provider, 'isConfigured').mockReturnValue(false);
    const fallbacks: string[] = [];
    emitter.on(DomainEvent.AI_FALLBACK_USED, (p) => fallbacks.push(p.reason));

    const result = await client.execute({
      capability: AiCapability.MATCHING_RANKING,
      input: {},
      fallback: () => ({ orderedKeys: ['a::ICU'] }),
    });

    expect(result.usedFallback).toBe(true);
    expect(result.value).toEqual({ orderedKeys: ['a::ICU'] });
    expect(fallbacks).toContain('not_configured');
  });

  it('uses fallback on HTTP error', async () => {
    jest.spyOn(provider, 'isConfigured').mockReturnValue(true);
    jest.spyOn(provider, 'invoke').mockRejectedValue(new Error('AI platform HTTP 500: Server Error'));

    const result = await client.execute({
      capability: AiCapability.TRIAGE_INTAKE,
      input: { text: 'x' },
      fallback: () => ({ severity: 'ROUTINE' }),
    });

    expect(result.usedFallback).toBe(true);
    expect(result.value).toEqual({ severity: 'ROUTINE' });
  });

  it('uses fallback on timeout/abort', async () => {
    jest.spyOn(provider, 'isConfigured').mockReturnValue(true);
    jest.spyOn(provider, 'invoke').mockRejectedValue(new Error('The operation was aborted'));

    const events: Array<{ capability: string }> = [];
    emitter.on(DomainEvent.AI_FALLBACK_USED, (p) => events.push(p));

    const result = await client.execute({
      capability: AiCapability.MATCHING_RANKING,
      input: {},
      fallback: async () => ({ orderedKeys: ['fallback'] }),
      timeoutMs: 10,
    });

    expect(result.usedFallback).toBe(true);
    expect(result.value.orderedKeys).toEqual(['fallback']);
    expect(events.some((e) => e.capability === AiCapability.MATCHING_RANKING)).toBe(true);
  });

  it('returns provider result without fallback on success', async () => {
    jest.spyOn(provider, 'isConfigured').mockReturnValue(true);
    jest.spyOn(provider, 'invoke').mockResolvedValue({ orderedKeys: ['ai-pick'] });

    const result = await client.execute({
      capability: AiCapability.MATCHING_RANKING,
      input: {},
      fallback: () => ({ orderedKeys: ['should-not-run'] }),
    });

    expect(result.usedFallback).toBe(false);
    expect(result.value).toEqual({ orderedKeys: ['ai-pick'] });
  });
});
