import { CompositeAiProvider } from './composite-ai.provider';
import { AiCapability } from '@sahayak/shared-constants';

describe('CompositeAiProvider (unit)', () => {
  it('prefers NIM then HTTP and errors when none', async () => {
    const nim = {
      isConfigured: jest.fn().mockReturnValue(false),
      invoke: jest.fn(),
    };
    const http = {
      isConfigured: jest.fn().mockReturnValue(false),
      invoke: jest.fn(),
    };
    const provider = new CompositeAiProvider(nim as never, http as never);
    expect(provider.isConfigured()).toBe(false);
    expect(() =>
      provider.invoke({ capability: AiCapability.TRIAGE_INTAKE, input: {} }, 1),
    ).toThrow(/No AI provider/);

    http.isConfigured.mockReturnValue(true);
    http.invoke.mockResolvedValue('http');
    expect(provider.isConfigured()).toBe(true);
    await expect(
      provider.invoke({ capability: AiCapability.TRIAGE_INTAKE, input: {} }, 1),
    ).resolves.toBe('http');

    nim.isConfigured.mockReturnValue(true);
    nim.invoke.mockResolvedValue('nim');
    await expect(
      provider.invoke({ capability: AiCapability.TRIAGE_INTAKE, input: {} }, 1),
    ).resolves.toBe('nim');
  });
});
