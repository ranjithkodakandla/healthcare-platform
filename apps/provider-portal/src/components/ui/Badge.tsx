import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'warning' | 'danger' | 'success' | 'info' | 'muted';

const VARIANT_STYLES: Record<BadgeVariant, { color: string; bg: string }> = {
  default: { color: '#0B5C66', bg: '#DEF3F5' },
  warning: { color: '#8A5A00', bg: '#FBF0D9' },
  danger: { color: '#C62E2E', bg: '#FDEAEA' },
  success: { color: '#1E9E5C', bg: '#E6F5ED' },
  info: { color: '#4A5054', bg: '#F2F4F5' },
  muted: { color: '#7C8388', bg: '#F2F4F5' },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const { color, bg } = VARIANT_STYLES[variant];
  return (
    <span
      className={cn(
        'inline-flex items-center px-[8px] py-[3px] rounded-[4px]',
        'text-[11px] font-bold whitespace-nowrap',
        className,
      )}
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}
