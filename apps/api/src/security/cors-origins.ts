const DEFAULT_ORIGINS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3000',
  'https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app',
  'https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app',
  'https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app',
  'https://sahayak-dev-citizen-202307619999.asia-south1.run.app',
  'https://sahayak-dev-provider-202307619999.asia-south1.run.app',
  'https://sahayak-dev-admin-202307619999.asia-south1.run.app',
];

/** Parse CORS_ORIGINS env (comma-separated) or return safe Cloud Run + local defaults. */
export function resolveCorsOrigins(raw?: string): string[] {
  if (!raw?.trim()) return [...DEFAULT_ORIGINS];
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
