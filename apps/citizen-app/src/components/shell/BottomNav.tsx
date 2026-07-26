'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/home/dashboard',
    match: '/home',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11l8-7 8 7"/><path d="M6 10v9h5v-5h2v5h5v-9"/>
      </svg>
    ),
  },
  {
    href: '/case/dashboard',
    match: '/case',
    label: 'Cases',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4h6v2H9z"/>
        <path d="M9.5 13.5s2.5-1.7 2.5-3.3a1.6 1.6 0 00-2.5-1.3A1.6 1.6 0 007 10.2c0 1.6 2.5 3.3 2.5 3.3z"/>
      </svg>
    ),
  },
  {
    href: '/search',
    match: '/search',
    label: 'Search',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>
      </svg>
    ),
  },
  {
    href: '/account/profile',
    match: '/account',
    label: 'Profile',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="h-[68px] flex-shrink-0 flex items-center justify-around border-t"
      style={{
        borderColor: '#EAE5DC',
        background: '#FFFFFF',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Main"
    >
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.match)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-col items-center justify-center gap-1 min-w-[64px] min-h-12 px-2"
            style={{ color: active ? '#0F766E' : '#7A8884' }}
            aria-current={active ? 'page' : undefined}
          >
            {item.icon}
            <span className="text-xs font-semibold">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
