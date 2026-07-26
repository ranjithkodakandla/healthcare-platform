import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider, AiProviderRequest } from './ai-provider.interface';

export interface AiProviderResponse<T> {
  result: T;
}

// Generic HTTP bridge to AI_PLATFORM_ENDPOINT (custom microservice shape).
@Injectable()
export class HttpAiProvider implements AiProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('AI_PLATFORM_ENDPOINT'));
  }

  async invoke<T>(request: AiProviderRequest, timeoutMs: number): Promise<T> {
    const endpoint = this.config.get<string>('AI_PLATFORM_ENDPOINT');
    if (!endpoint) {
      throw new Error('AI_PLATFORM_ENDPOINT not configured');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`AI platform HTTP ${res.status}: ${res.statusText}`);
      }
      const json = (await res.json()) as AiProviderResponse<T>;
      if (json == null || !('result' in json)) {
        throw new Error('AI platform response missing result');
      }
      return json.result;
    } finally {
      clearTimeout(timer);
    }
  }
}
