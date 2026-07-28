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
 * Sanitizes input text by stripping ALL HTML/XML tags, script content, and inline event
 * handlers, while safely preserving plain text and multi-byte Unicode characters
 * (e.g. ñ, é, 中文, 🚑, &, 100%).
 *
 * Used for internal-notes display AND for cleaning the textarea value loaded from the DB,
 * so neither the read-only panel nor the editable field ever shows raw HTML markup.
 */
export function sanitizeHtmlInput(input: string | null | undefined): string {
  if (!input) return '';
  return input
    // 1. Remove complete <script>…</script> blocks (including multi-line)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // 2. Remove all remaining HTML/XML tags (e.g. <b>, </b>, <br/>, etc.)
    .replace(/<[^>]*>/g, '')
    // 3. Strip javascript: URIs
    .replace(/javascript\s*:/gi, '')
    // 4. Strip inline event handlers (onclick="…", onmouseover='…', etc.)
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .trim();
}
