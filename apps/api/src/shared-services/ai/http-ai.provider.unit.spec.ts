import { HttpAiProvider } from './http-ai.provider';
import { AiCapability } from '@sahayak/shared-constants';

describe('HttpAiProvider (unit)', () => {
  const req = {
    capability: AiCapability.TRIAGE_INTAKE,
    input: {},
  };

  it('isConfigured reflects endpoint', () => {
    expect(new HttpAiProvider({ get: () => undefined } as never).isConfigured()).toBe(false);
    expect(new HttpAiProvider({ get: () => 'https://ai' } as never).isConfigured()).toBe(true);
  });

  it('invoke requires endpoint and parses result', async () => {
    const provider = new HttpAiProvider({ get: () => undefined } as never);
    await expect(provider.invoke(req, 100)).rejects.toThrow(/not configured/);

    const ok = new HttpAiProvider({ get: () => 'https://ai.example' } as never);
    const fetchMock = jest.spyOn(global, 'fetch' as never).mockResolvedValue({
      ok: true,
      json: async () => ({ result: { severity: 'CRITICAL' } }),
    } as never);
    await expect(ok.invoke(req, 1000)).resolves.toEqual({ severity: 'CRITICAL' });

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'err' } as never);
    await expect(ok.invoke(req, 1000)).rejects.toThrow(/HTTP 500/);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) } as never);
    await expect(ok.invoke(req, 1000)).rejects.toThrow(/missing result/);
    fetchMock.mockRestore();
  });
});
