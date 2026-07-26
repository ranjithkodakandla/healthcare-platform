import { ConfigService } from '@nestjs/config';
import { AiCapability } from '@sahayak/shared-constants';
import { NimAiProvider } from './nim-ai.provider';

describe('NimAiProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function providerWith(env: Record<string, string | undefined>): NimAiProvider {
    return new NimAiProvider({
      get: (key: string) => env[key],
    } as unknown as ConfigService);
  }

  it('isConfigured only when NVIDIA_API_KEY is set', () => {
    expect(providerWith({}).isConfigured()).toBe(false);
    expect(providerWith({ NVIDIA_API_KEY: 'nvapi-x' }).isConfigured()).toBe(true);
  });

  it('parses MATCHING_RANKING JSON from chat completions', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"orderedKeys":["h1::ICU","h2::GENERAL"]}' } }],
      }),
    }) as unknown as typeof fetch;

    const provider = providerWith({
      NVIDIA_API_KEY: 'nvapi-test',
      NVIDIA_AI_MODEL: 'meta/llama-3.1-8b-instruct',
    });
    const result = await provider.invoke<{ orderedKeys: string[] }>(
      {
        capability: AiCapability.MATCHING_RANKING,
        input: { candidates: [] },
      },
      2000,
    );

    expect(result.orderedKeys).toEqual(['h1::ICU', 'h2::GENERAL']);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://integrate.api.nvidia.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer nvapi-test' }),
      }),
    );
  });

  it('parses TRIAGE_INTAKE severity', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"severity":"URGENT"}\n```' } }],
      }),
    }) as unknown as typeof fetch;

    const provider = providerWith({ NVIDIA_API_KEY: 'nvapi-test' });
    const result = await provider.invoke<{ severity: string }>(
      { capability: AiCapability.TRIAGE_INTAKE, input: { text: 'ambulance needed' } },
      2000,
    );
    expect(result.severity).toBe('URGENT');
  });
});
