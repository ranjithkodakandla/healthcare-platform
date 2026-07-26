import { cn, severityBg, severityColor, STATUS_STYLES } from './utils';

describe('utils', () => {
  it('cn merges class names', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
  });

  it('severity helpers cover bands', () => {
    expect(severityColor('CRITICAL')).toBe('#8C1D1D');
    expect(severityColor('URGENT')).toBe('#D98C0E');
    expect(severityColor('MODERATE')).toBe('#0F766E');
    expect(severityColor('OTHER')).toBe('#5B6B68');
    expect(severityBg('CRITICAL')).toContain('179');
    expect(severityBg('URGENT')).toBe('#FBF0D9');
    expect(severityBg('MODERATE')).toBe('#E9F3F0');
  });

  it('STATUS_STYLES has expected keys', () => {
    expect(STATUS_STYLES.available.color).toBeTruthy();
    expect(STATUS_STYLES.stale.bg).toBeTruthy();
  });
});
