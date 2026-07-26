import { resolveCorsOrigins } from './cors-origins';

describe('resolveCorsOrigins', () => {
  it('returns defaults when unset', () => {
    const origins = resolveCorsOrigins(undefined);
    expect(origins.length).toBeGreaterThan(3);
    expect(origins.some((o) => o.includes('sahayak-dev-citizen'))).toBe(true);
  });

  it('parses comma-separated overrides', () => {
    expect(resolveCorsOrigins(' https://a.example ,https://b.example ')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });
});
