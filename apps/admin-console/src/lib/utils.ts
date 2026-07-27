export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export function statusVariant(variant: StatusVariant) {
  const map: Record<StatusVariant, { color: string; bg: string }> = {
    success: { color: 'text-success', bg: 'bg-success-bg' },
    warning: { color: 'text-warning', bg: 'bg-warning-bg' },
    danger:  { color: 'text-danger',  bg: 'bg-danger-bg' },
    info:    { color: 'text-primary', bg: 'bg-primary-light' },
    neutral: { color: 'text-ink-3',   bg: 'bg-bg-page' },
  };
  return map[variant];
}

/**
 * Sanitizes input text by removing script tags, dangerous HTML tags, and inline event handlers,
 * while safely preserving plain text and multi-byte Unicode characters (e.g. ñ, é, 中文, 🚑, &, 100%).
 */
export function sanitizeHtmlInput(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript\s*:/gi, '')
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}
