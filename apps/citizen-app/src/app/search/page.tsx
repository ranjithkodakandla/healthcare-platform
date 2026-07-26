// Search hub — routes into each service search
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const SERVICES = [
  { label: 'Beds', icon: '🏥', href: '/search/beds', desc: 'Find available hospital beds by category' },
  { label: 'Doctors', icon: '👨‍⚕️', href: '/search/doctors', desc: 'Search by specialty, book a slot' },
  { label: 'Hospitals', icon: '🏨', href: '/search/hospitals', desc: 'Browse nearby hospitals by distance' },
  { label: 'Pharmacy', icon: '💊', href: '/search/pharmacy', desc: 'Search medicine stock near you' },
  { label: 'Blood Bank', icon: '🩸', href: '/search/blood-bank', desc: 'Search by blood group across blood banks' },
  { label: 'Insurance', icon: '🛡️', href: '/search/insurance', desc: 'Track pre-authorization status' },
  { label: 'Diagnostics', icon: '🔬', href: '/search/diagnostics', desc: 'Book tests, view results' },
  { label: 'Cancer', icon: '🎗️', href: '/search/cancer', desc: 'Find oncology centres by modality' },
]

export default function SearchHubPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F4F1EA' }}>
      <div className="px-5 pt-10 pb-3 flex-shrink-0" style={{ background: '#F4F1EA' }}>
        <h1 className="text-xl font-bold mb-3" style={{ color: '#1B2422' }}>Find Healthcare</h1>
        <div
          className="h-11 border rounded-btn flex items-center px-3 gap-2"
          style={{ borderColor: '#D8D3C8', background: '#fff' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>
          </svg>
          <span className="text-sm" style={{ color: '#7A8884' }}>Search beds, doctors, medicine…</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <div className="flex flex-col gap-3">
          {SERVICES.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="p-4 bg-white flex items-center gap-4 active:opacity-70">
                <div
                  className="w-12 h-12 rounded-card flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ background: '#E9F3F0' }}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="text-[15px] font-bold" style={{ color: '#1B2422' }}>{s.label}</div>
                  <div className="text-xs" style={{ color: '#5B6B68' }}>{s.desc}</div>
                </div>
                <svg className="ml-auto flex-shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7A8884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
