import { cn } from '@/lib/utils';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-[#DFF5E9] text-[#0E6B3A]',
  warning: 'bg-[#FBF0D9] text-[#8A5A00]',
  danger:  'bg-[#FBE3E3] text-[#C62E2E]',
  info:    'bg-[#DEF3F5] text-[#0B5C66]',
  neutral: 'bg-[#F2F4F5] text-[#4A5054]',
  primary: 'bg-[#1A1D1F] text-white',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold',
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
