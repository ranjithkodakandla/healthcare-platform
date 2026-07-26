'use client'

// C-04 — Home
// Emergency action is never gated behind a loading state.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const SEARCH_GRID = [
  { label: 'Find bed', href: '/search/beds', icon: 'bed' },
  { label: 'Doctor', href: '/search/doctors', icon: 'doctor' },
  { label: 'Pharmacy', href: '/search/pharmacy', icon: 'pharmacy' },
  { label: 'Blood bank', href: '/search/blood-bank', icon: 'blood' },
  { label: 'Labs', href: '/search/diagnostics', icon: 'labs' },
  { label: 'Insurance', href: '/search/insurance', icon: 'insurance' },
  { label: 'Hospitals', href: '/search/hospitals', icon: 'hospital' },
  { label: 'Cancer care', href: '/search/cancer', icon: 'cancer' },
]

function ServiceIcon({ name }: { name: string }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: '#0F766E',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  switch (name) {
    case 'bed':
      return (
        <svg {...common}>
          <path d="M3 11h18v6H3z" />
          <path d="M5 11V8a2 2 0 012-2h4v5" />
          <path d="M3 17v2M21 17v2" />
        </svg>
      )
    case 'doctor':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3" />
          <path d="M6 20v-1a4 4 0 014-4h4a4 4 0 014 4v1" />
          <path d="M12 11v4M10 13h4" />
        </svg>
      )
    case 'pharmacy':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
    case 'blood':
      return (
        <svg {...common}>
          <path d="M12 3s6 6.2 6 10a6 6 0 11-12 0c0-3.8 6-10 6-10z" />
        </svg>
      )
    case 'labs':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6l-5 9a2 2 0 001.7 3h10.6a2 2 0 001.7-3l-5-9V3" />
        </svg>
      )
    case 'insurance':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z" />
        </svg>
      )
    case 'hospital':
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      )
  }
}

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HomeDashboardPage() {
  const [displayName, setDisplayName] = useState('Guest')
  const [activeCase, setActiveCase] = useState<{ id: string; number: string } | null>(null)

  useEffect(() => {
    try {
      const storedName = localStorage.getItem('sahayak_display_name')
      const guest = localStorage.getItem('sahayak_guest_mode') === '1'
      if (storedName) setDisplayName(storedName)
      else if (guest) setDisplayName('Guest')
      else setDisplayName('there')

      const id = localStorage.getItem('sahayak_active_case_id')
      const number = localStorage.getItem('sahayak_active_case_number')
      if (id && number) setActiveCase({ id, number })
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F4F1EA' }}>
      <div className="px-5 pt-10 pb-4 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#7A8884' }}>{greetingForNow()}</p>
          <h1 className="text-xl font-bold" style={{ color: '#1B2422' }}>{displayName}</h1>
        </div>
        <Link
          href="/account/profile"
          aria-label="Open profile"
          className="w-12 h-12 rounded-pill flex items-center justify-center text-base font-bold"
          style={{ background: '#0F766E', color: '#fff' }}
        >
          {displayName === 'Guest' || displayName === 'there' ? 'G' : displayName.slice(0, 1).toUpperCase()}
        </Link>
      </div>

      <div className="px-5 mb-4 flex-shrink-0 flex flex-col gap-2">
        <Link href="/home/triage" className="block">
          <span
            className="w-full h-16 rounded-card text-lg font-bold text-white flex items-center justify-center gap-3 shadow-md"
            style={{ background: '#B3261E' }}
            role="button"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2" y="9" width="14" height="8" rx="1"/><path d="M16 12h4l2 3v2h-6z"/>
              <circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>
              <path d="M7 11v4M5 13h4"/>
            </svg>
            Emergency — request ambulance
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/home/triage?patient=child"
            className="min-h-12 rounded-card text-sm font-bold flex items-center justify-center px-2"
            style={{ background: '#FBE3E3', color: '#8C1D1D', border: '1px solid #B3261E' }}
            onClick={() => {
              try {
                localStorage.setItem('sahayak_patient_is_child', '1')
              } catch {
                /* ignore */
              }
            }}
          >
            Child emergency
          </Link>
          <Link
            href="/search/beds?category=NICU"
            className="min-h-12 rounded-card text-sm font-bold flex items-center justify-center px-2"
            style={{ background: '#fff', color: '#0F766E', border: '1px solid #0F766E' }}
          >
            Find paediatric bed
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <p className="text-sm font-semibold mb-2" style={{ color: '#5B6B68' }}>Your care</p>
        {activeCase ? (
          <Link href={`/case/dashboard?caseId=${activeCase.id}`}>
            <Card className="p-4 mb-5 bg-white" style={{ background: '#fff' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: '#7A8884' }}>
                    Case {activeCase.number}
                  </p>
                  <p className="text-base font-bold" style={{ color: '#1B2422' }}>Open request</p>
                </div>
                <Badge variant="pending">Active</Badge>
              </div>
              <p className="text-sm" style={{ color: '#5B6B68' }}>
                Tap to see ambulance, bed, and next steps.
              </p>
            </Card>
          </Link>
        ) : (
          <Card className="p-4 mb-5 bg-white" style={{ background: '#fff' }}>
            <p className="text-base font-bold mb-1" style={{ color: '#1B2422' }}>No active request</p>
            <p className="text-sm" style={{ color: '#5B6B68' }}>
              If something happens, use the red emergency button above. For non-urgent care, pick a service below.
            </p>
          </Card>
        )}

        <p className="text-sm font-semibold mb-3" style={{ color: '#5B6B68' }}>Find care nearby</p>
        <div className="grid grid-cols-2 gap-3">
          {SEARCH_GRID.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="min-h-16 rounded-card px-3 py-3 flex items-center gap-3"
              style={{ background: '#fff', border: '1px solid #EAE5DC' }}
            >
              <div
                className="w-11 h-11 rounded-card flex items-center justify-center flex-shrink-0"
                style={{ background: '#E9F3F0' }}
              >
                <ServiceIcon name={item.icon} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#1B2422' }}>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
