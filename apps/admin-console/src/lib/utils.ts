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
