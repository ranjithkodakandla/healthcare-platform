import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:   'bg-[#1A1D1F] text-white hover:bg-[#0B5C66]',
  secondary: 'bg-[#DEF3F5] text-[#0B5C66] hover:bg-[#c8edf0]',
  outline:   'border border-[#C7CDD0] text-[#4A5054] bg-white hover:bg-[#F2F4F5]',
  ghost:     'text-[#0B5C66] hover:bg-[#DEF3F5]',
  danger:    'bg-[#FBE3E3] text-[#C62E2E] hover:bg-[#f5c8c8]',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 py-2 text-sm',
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', children, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        props.disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
