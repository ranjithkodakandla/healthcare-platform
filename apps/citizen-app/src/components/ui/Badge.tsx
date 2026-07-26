import { cn } from '@/lib/utils'

type BadgeVariant = 'available' | 'low' | 'full' | 'pending' | 'confirmed' | 'stale' | 'emergency' | 'brand'

const VARIANTS: Record<BadgeVariant, { color: string; bg: string }> = {
  available: { color: '#0E6B3A', bg: '#DFF5E9' },
  low: { color: '#8A5A00', bg: '#FBF0D9' },
  full: { color: '#8C1D1D', bg: '#FBE3E3' },
  pending: { color: '#8A5A00', bg: '#FBF0D9' },
  confirmed: { color: '#0E6B3A', bg: '#DFF5E9' },
  stale: { color: '#7A8884', bg: '#EAE5DC' },
  emergency: { color: '#ff9a90', bg: 'rgba(179,38,30,0.25)' },
  brand: { color: '#0F766E', bg: '#E9F3F0' },
}

interface BadgeProps {
  variant?: BadgeVariant
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'brand', children, className }: BadgeProps) {
  const style = VARIANTS[variant]
  return (
    <span
      className={cn('inline-block text-[11px] font-bold px-2 py-[3px] rounded', className)}
      style={{ color: style.color, background: style.bg }}
    >
      {children}
    </span>
  )
}
