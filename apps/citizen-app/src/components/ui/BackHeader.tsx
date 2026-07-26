import Link from 'next/link'

interface BackHeaderProps {
  title: string
  backHref?: string
  action?: React.ReactNode
}

export function BackHeader({ title, backHref = '/home', action }: BackHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4 flex-shrink-0 border-b"
      style={{ borderColor: '#EAE5DC', background: '#FFFFFF' }}
    >
      <Link href={backHref} className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
        <span className="text-[17px] font-bold" style={{ color: '#1B2422' }}>{title}</span>
      </Link>
      {action && <div>{action}</div>}
    </div>
  )
}
