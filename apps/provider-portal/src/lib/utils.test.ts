import {
  BED_CATEGORY_LABEL,
  cn,
  formatRelativeTime,
  occupancyColor,
  SEVERITY_BG,
  SEVERITY_COLORS,
} from './utils';

describe('provider utils', () => {
  it('cn and maps', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c');
    expect(SEVERITY_COLORS.CRITICAL).toBeTruthy();
    expect(SEVERITY_BG.URGENT).toBeTruthy();
    expect(BED_CATEGORY_LABEL.ICU).toBe('ICU');
  });

  it('formatRelativeTime and occupancyColor', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('just now');
    expect(formatRelativeTime(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 min ago');
    expect(formatRelativeTime(new Date(Date.now() - 2 * 3600000).toISOString())).toBe('2h ago');
    expect(formatRelativeTime(new Date(Date.now() - 48 * 3600000).toISOString())).toBe('2d ago');
    expect(occupancyColor(95)).toBe('#C62E2E');
    expect(occupancyColor(80)).toBe('#D98C0E');
    expect(occupancyColor(10)).toBe('#1A1D1F');
  });
});
