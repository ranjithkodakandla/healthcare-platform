import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  selected?: boolean
}

export function Card({ children, className, style, onClick, selected }: CardProps) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        'rounded-card border',
        onClick && 'cursor-pointer active:opacity-80',
        className,
      )}
      style={{
        borderColor: selected ? '#0F766E' : '#EAE5DC',
        borderWidth: selected ? '1.5px' : '1px',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
