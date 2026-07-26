import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  AI_PLATFORM_ENDPOINT: z.string().optional(),
  // M8 / E-09 — AI call timeout (ms). Default 2000 per PRD.
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(2000),
  // NVIDIA NIM (OpenAI-compatible). When NVIDIA_API_KEY is set, preferred over AI_PLATFORM_ENDPOINT.
  NVIDIA_API_KEY: z.string().optional(),
  NVIDIA_API_BASE_URL: z.string().optional(),
  NVIDIA_AI_MODEL: z.string().optional(),
  // Optional: Firebase Auth (DL-001). AuthModule falls back to NotConfiguredAuthProvider
  // when FIREBASE_PROJECT_ID is unset (GT-11 visible degradation).
  // FIREBASE_SERVICE_ACCOUNT_JSON: raw service-account JSON, or the sentinel "ADC" to use
  // Application Default Credentials (required when org policy blocks SA key creation).
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  // Optional shared secret for /v1/webhook/* (WhatsApp/IVR). When unset, webhooks
  // accept requests in local stub mode (M14). Set in staging/prod.
  WEBHOOK_SHARED_SECRET: z.string().optional(),
  // Messaging outbound (M14 / E-10). When unset, WhatsApp/IVR adapters stub send().
  // Meta Cloud API:
  WA_ACCESS_TOKEN: z.string().optional(),
  WA_PHONE_NUMBER_ID: z.string().optional(),
  WA_API_VERSION: z.string().optional(),
  // Twilio WhatsApp (alternative to Meta):
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),
  // Exotel SMS used for IVR reply path:
  EXOTEL_ACCOUNT_SID: z.string().optional(),
  EXOTEL_API_KEY: z.string().optional(),
  EXOTEL_API_TOKEN: z.string().optional(),
  EXOTEL_SMS_FROM: z.string().optional(),
  EXOTEL_SUBDOMAIN: z.string().optional(),
  // Comma-separated browser origins allowed to call the API (Cloud Run frontends).
  // Empty → localhost defaults for local Next apps.
  CORS_ORIGINS: z.string().optional(),
  // Meta WhatsApp Cloud API webhook verify token (GET hub.challenge).
  WA_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateConfig(raw: Record<string, unknown>): AppConfig {
  const result = configSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Config validation failed (fail-fast per M10): ${issues}`);
  }
  return result.data;
}
