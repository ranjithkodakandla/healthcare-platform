// C-16 — Doctor Detail + Booking (FR-DOC-001)
// States: Detail, Slot selected, Booking confirmed
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

const SLOTS = ['4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM']

export default function DoctorDetailPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Dr. Anjali Rao" backHref="/search/doctors" />

      <div className="flex-1 overflow-y-auto p-5">
        {/* Doctor header */}
        <div className="flex gap-3 items-center mb-5">
          <div
            className="w-14 h-14 rounded-pill flex items-center justify-center flex-shrink-0"
            style={{ background: '#E9F3F0' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v5a4 4 0 008 0V3"/>
              <circle cx="19" cy="16" r="3"/>
              <path d="M12 12v2a5 5 0 01-10 0v-1" transform="translate(2,0)"/>
            </svg>
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: '#1B2422' }}>Dr. Anjali Rao</div>
            <div className="text-xs" style={{ color: '#5B6B68' }}>Cardiologist · 14 yrs experience</div>
            <div className="text-xs" style={{ color: '#5B6B68' }}>Apollo Hospital, Bannerghatta Road</div>
          </div>
        </div>

        {/* Slots */}
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
          Available slots — Today
        </p>
        <div className="flex gap-2 flex-wrap mb-6">
          {SLOTS.map((slot, i) => (
            <button
              key={slot}
              className="px-3 py-2 rounded-btn text-[13px] font-semibold"
              style={{
                border: i === 0 ? '1.5px solid #0F766E' : '1px solid #D8D3C8',
                color: i === 0 ? '#0F766E' : '#1B2422',
                background: '#fff',
              }}
            >
              {slot}
            </button>
          ))}
        </div>

        {/* Teleconsult option */}
        <div
          className="rounded-card p-3 flex items-center gap-3 border mb-4"
          style={{ borderColor: '#EAE5DC' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="7" width="13" height="10" rx="2"/>
            <path d="M16 10l5-2v8l-5-2z"/>
          </svg>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: '#1B2422' }}>Video Teleconsult available</div>
            <div className="text-xs" style={{ color: '#5B6B68' }}>Consent-gated per Module 3 privacy tier</div>
          </div>
          <Link href="/search/teleconsult" className="text-xs font-semibold" style={{ color: '#0F766E' }}>
            Join
          </Link>
        </div>
      </div>

      <div className="p-5 border-t flex-shrink-0" style={{ borderColor: '#EAE5DC' }}>
        <button
          className="w-full h-[52px] rounded-pill text-[15px] font-bold text-white"
          style={{ background: '#0F766E' }}
        >
          Confirm Booking — 4:30 PM
        </button>
      </div>
    </div>
  )
}
