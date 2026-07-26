import { Injectable } from '@nestjs/common';
import { AiProvider, AiProviderRequest } from './ai-provider.interface';
import { HttpAiProvider } from './http-ai.provider';
import { NimAiProvider } from './nim-ai.provider';

// Prefer NVIDIA NIM when NVIDIA_API_KEY is set; else custom AI_PLATFORM_ENDPOINT.
@Injectable()
export class CompositeAiProvider implements AiProvider {
  constructor(
    private readonly nim: NimAiProvider,
    private readonly http: HttpAiProvider,
  ) {}

  private active(): AiProvider | null {
    if (this.nim.isConfigured()) return this.nim;
    if (this.http.isConfigured()) return this.http;
    return null;
  }

  isConfigured(): boolean {
    return this.active() != null;
  }

  invoke<T>(request: AiProviderRequest, timeoutMs: number): Promise<T> {
    const provider = this.active();
    if (!provider) throw new Error('No AI provider configured');
    return provider.invoke<T>(request, timeoutMs);
  }
}
