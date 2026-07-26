/** Critical-path i18n — strings loaded from JSON packs. */
import strings from './i18n-strings.json';
import meta from './i18n-meta.json';

export type LangCode = 'en' | 'hi' | 'kn' | 'ta' | 'te' | 'ml' | 'mr' | 'bn';
export const LANG_STORAGE_KEY = 'sahayak_language';
export type CriticalStrings = typeof strings.en;

export const LANGUAGE_META = meta as { code: LangCode; native: string; cta: string }[];

export function normalizeLang(code: string | null | undefined): LangCode {
  if (code && code in strings) return code as LangCode;
  return 'en';
}

export function getStoredLang(): LangCode {
  if (typeof window === 'undefined') return 'en';
  try {
    return normalizeLang(localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    return 'en';
  }
}

export function setStoredLang(code: LangCode): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
}

export function t(lang: LangCode): CriticalStrings {
  return (strings as Record<string, CriticalStrings>)[lang] ?? strings.en;
}

export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`));
}
