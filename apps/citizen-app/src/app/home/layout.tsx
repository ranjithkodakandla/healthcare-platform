'use client'

import { usePathname } from 'next/navigation'
import { MobileShell } from '@/components/shell/MobileShell'
import { BottomNav } from '@/components/shell/BottomNav'

/** Hide bottom nav on focused emergency flows (UX Spec §10). */
const HIDE_NAV = /^\/home\/(triage|searching|tracking|arrival)/

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const hideNav = HIDE_NAV.test(pathname)

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">{children}</div>
      {!hideNav && <BottomNav />}
    </MobileShell>
  )
}
