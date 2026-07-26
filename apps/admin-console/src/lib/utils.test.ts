import { cn, statusVariant } from './utils';

describe('admin utils', () => {
  it('cn and statusVariant', () => {
    expect(cn('a', null, 'b', false && 'c')).toBe('a b');
    expect(statusVariant('success').color).toContain('success');
    expect(statusVariant('danger').bg).toContain('danger');
    expect(statusVariant('neutral').color).toBeTruthy();
  });
});
