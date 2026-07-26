import { cn } from '@/lib/utils'

interface MobileShellProps {
  children: React.ReactNode
  className?: string
  noPad?: boolean
  bg?: string
}

// All app screens are wrapped in this shell — max 390px, white background,
// matches the phone frame in the Citizen App wireframe (340px content in a 360px frame).
export function MobileShell({ children, className, noPad, bg }: MobileShellProps) {
  return (
    <div
      className="mobile-shell"
      style={{ background: bg ?? '#FFFFFF' }}
    >
      <div className={cn('flex-1 flex flex-col overflow-hidden', !noPad && '', className)}>
        {children}
      </div>
    </div>
  )
}
