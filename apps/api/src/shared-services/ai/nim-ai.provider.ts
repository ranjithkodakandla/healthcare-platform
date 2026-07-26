import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiCapability, CaseSeverity } from '@sahayak/shared-constants';
import { AiProvider, AiProviderRequest } from './ai-provider.interface';

// NVIDIA NIM (OpenAI-compatible chat completions) — used when NVIDIA_API_KEY is set.
@Injectable()
export class NimAiProvider implements AiProvider {
  private readonly logger = new Logger(NimAiProvider.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('NVIDIA_API_KEY'));
  }

  async invoke<T>(request: AiProviderRequest, timeoutMs: number): Promise<T> {
    const apiKey = this.config.get<string>('NVIDIA_API_KEY');
    if (!apiKey) throw new Error('NVIDIA_API_KEY not configured');

    const baseUrl = (
      this.config.get<string>('NVIDIA_API_BASE_URL') ?? 'https://integrate.api.nvidia.com/v1'
    ).replace(/\/$/, '');
    const model =
      this.config.get<string>('NVIDIA_AI_MODEL') ?? 'meta/llama-3.1-8b-instruct';

    const { system, user } = this.buildPrompt(request);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.1,
          max_tokens: 512,
          stream: false,
        }),
        signal: controller.signal,
      });

      const json = (await res.json().catch(() => ({}))) as {
        choices?: Array<{ message?: { content?: string } }>;
        error?: { message?: string };
      };

      if (!res.ok) {
        throw new Error(
          `NVIDIA NIM HTTP ${res.status}: ${json.error?.message ?? res.statusText}`,
        );
      }

      const content = json.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new Error('NVIDIA NIM response missing message content');
      }

      return this.parseResult<T>(request.capability, content);
    } finally {
      clearTimeout(timer);
    }
  }

  private buildPrompt(request: AiProviderRequest): { system: string; user: string } {
    const system =
      'You are Sahayak AI Coordination Layer. Reply with ONLY valid compact JSON. ' +
      'Never give medical diagnosis or clinical treatment advice.';

    if (request.capability === AiCapability.MATCHING_RANKING) {
      return {
        system,
        user:
          'Reorder hospital bed candidates for an emergency citizen search. ' +
          'Prefer nearer distanceKm, FRESH over STALE, then higher availableCount. ' +
          'Return JSON exactly: {"orderedKeys":["hospitalId::category",...]}\n' +
          `Candidates:\n${JSON.stringify(request.input)}`,
      };
    }

    if (request.capability === AiCapability.TRIAGE_INTAKE) {
      const severities = Object.values(CaseSeverity).join('|');
      return {
        system,
        user:
          `Classify emergency intake severity. Allowed values: ${severities}. ` +
          'This is routing priority only, not a diagnosis. ' +
          'Return JSON exactly: {"severity":"<VALUE>"}\n' +
          `Input:\n${JSON.stringify(request.input)}`,
      };
    }

    return {
      system,
      user:
        `Capability ${request.capability}. Return a JSON object in {"result": ...} form.\n` +
        `Input:\n${JSON.stringify(request.input)}`,
    };
  }

  private parseResult<T>(capability: AiCapability, content: string): T {
    const jsonText = this.extractJson(content);
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      this.logger.warn(`NIM returned non-JSON for ${capability}: ${content.slice(0, 160)}`);
      throw new Error('NVIDIA NIM returned non-JSON content');
    }

    if (capability === AiCapability.MATCHING_RANKING) {
      const obj = parsed as { orderedKeys?: string[]; result?: { orderedKeys?: string[] } };
      const orderedKeys = obj.orderedKeys ?? obj.result?.orderedKeys;
      if (!Array.isArray(orderedKeys)) {
        throw new Error('NVIDIA NIM MATCHING_RANKING missing orderedKeys');
      }
      return { orderedKeys } as T;
    }

    if (capability === AiCapability.TRIAGE_INTAKE) {
      const obj = parsed as { severity?: string; result?: { severity?: string } };
      const severity = obj.severity ?? obj.result?.severity;
      if (!severity || !Object.values(CaseSeverity).includes(severity as CaseSeverity)) {
        throw new Error('NVIDIA NIM TRIAGE_INTAKE missing/invalid severity');
      }
      return { severity } as T;
    }

    const wrapped = parsed as { result?: T };
    if (wrapped && typeof wrapped === 'object' && 'result' in wrapped) {
      return wrapped.result as T;
    }
    return parsed as T;
  }

  private extractJson(content: string): string {
    const trimmed = content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return fenced[1].trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
    return trimmed;
  }
}
