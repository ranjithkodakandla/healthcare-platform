import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'emergency' | 'outline' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg' | 'pill'

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: 'text-white font-bold',
  emergency: 'text-white font-bold',
  outline: 'font-semibold border',
  ghost: 'font-semibold',
}

const VARIANT_BG: Record<ButtonVariant, { background?: string; borderColor?: string; color?: string }> = {
  primary: { background: '#0F766E' },
  emergency: { background: '#B3261E' },
  outline: { borderColor: '#D8D3C8', color: '#1B2422' },
  ghost: { color: '#0F766E' },
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-4 text-sm rounded-btn',
  md: 'h-12 px-5 text-sm rounded-btn',
  lg: 'h-[52px] px-6 text-[15px] rounded-btn',
  pill: 'h-14 px-6 text-base rounded-pill',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  style,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 transition-opacity active:opacity-80',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth && 'w-full',
        className,
      )}
      style={{ ...VARIANT_BG[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  )
}
