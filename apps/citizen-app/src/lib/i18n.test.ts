import {
  fmt,
  getStoredLang,
  normalizeLang,
  setStoredLang,
  t,
  LANG_STORAGE_KEY,
} from './i18n';

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('normalizes unknown languages to en', () => {
    expect(normalizeLang('xx')).toBe('en');
    expect(normalizeLang('hi')).toBe('hi');
  });

  it('reads and writes stored language', () => {
    expect(getStoredLang()).toBe('en');
    setStoredLang('hi');
    expect(localStorage.getItem(LANG_STORAGE_KEY)).toBe('hi');
    expect(getStoredLang()).toBe('hi');
  });

  it('returns string packs and formats templates', () => {
    expect(t('en').emergency).toBeTruthy();
    expect(t('hi').emergency).toBeTruthy();
    expect(fmt('Q {n} of {total}', { n: 1, total: 3 })).toBe('Q 1 of 3');
    expect(fmt('missing {x}', {})).toBe('missing {x}');
  });
});
