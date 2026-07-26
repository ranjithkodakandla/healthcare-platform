import { validateConfig } from './config.schema';

describe('validateConfig', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
  };

  it('accepts minimal valid config with defaults', () => {
    const cfg = validateConfig(base);
    expect(cfg.PORT).toBe(3000);
    expect(cfg.AI_TIMEOUT_MS).toBe(2000);
    expect(cfg.NODE_ENV).toBe('development');
  });

  it('coerces PORT and AI_TIMEOUT_MS', () => {
    const cfg = validateConfig({ ...base, PORT: '4000', AI_TIMEOUT_MS: '1500', NODE_ENV: 'test' });
    expect(cfg.PORT).toBe(4000);
    expect(cfg.AI_TIMEOUT_MS).toBe(1500);
    expect(cfg.NODE_ENV).toBe('test');
  });

  it('fails fast when DATABASE_URL missing', () => {
    expect(() => validateConfig({ REDIS_URL: 'redis://x' })).toThrow(/Config validation failed/);
  });

  it('fails fast when REDIS_URL missing', () => {
    expect(() => validateConfig({ DATABASE_URL: 'postgresql://x' })).toThrow(/REDIS_URL/);
  });
});
