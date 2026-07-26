import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'bg-[#0B5C66] text-white hover:bg-[#094e57]',
  secondary: 'bg-transparent text-[#0B5C66] border border-[#0B5C66] hover:bg-[#DEF3F5]',
  ghost: 'bg-transparent text-[#4A5054] border border-[#C7CDD0] hover:bg-[#F2F4F5]',
  danger: 'bg-transparent text-[#C62E2E] border border-[#C62E2E] hover:bg-[#FDEAEA]',
  success: 'bg-[#1E9E5C] text-white hover:bg-[#188750]',
  warning: 'bg-transparent text-[#8A5A00] border border-[#D98C0E] hover:bg-[#FBF0D9]',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'min-h-11 h-11 px-3 text-[13px]',
  md: 'min-h-11 h-11 px-[18px] text-[14px]',
  lg: 'min-h-12 h-12 px-6 text-[15px]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-[8px] font-bold',
        'transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
