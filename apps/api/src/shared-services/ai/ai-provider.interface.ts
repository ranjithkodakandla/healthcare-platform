import { AiCapability } from '@sahayak/shared-constants';

export interface AiProviderRequest {
  capability: AiCapability;
  input: unknown;
}

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  isConfigured(): boolean;
  invoke<T>(request: AiProviderRequest, timeoutMs: number): Promise<T>;
}
