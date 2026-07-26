// C-17 — Teleconsult Session (Module 3)
// Consent-gated per Module 3 §5 Privacy — strictest consent tier before video starts.
// States: Connecting, In-session, Ended
import Link from 'next/link'

export default function TeleconsultPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col" style={{ background: '#1B2422', color: '#fff' }}>
        {/* Video placeholder */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className="w-[120px] h-[120px] rounded-pill flex items-center justify-center"
            style={{ background: '#5B6B68' }}
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#EAE5DC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
            </svg>
          </div>
        </div>

        {/* Session info */}
        <div className="text-center text-[13px] pb-4" style={{ color: '#D8D3C8' }}>
          Dr. Anjali Rao · 04:12
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 pb-10">
          {/* Mute */}
          <button
            className="w-[52px] h-[52px] rounded-pill flex items-center justify-center"
            style={{ background: '#5B6B68' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="10" rx="3"/>
              <path d="M5 11a7 7 0 0014 0"/><path d="M12 18v3"/>
            </svg>
          </button>

          {/* End call */}
          <Link href="/search/doctor-detail">
            <button
              className="w-[52px] h-[52px] rounded-pill flex items-center justify-center"
              style={{ background: '#C62E2E' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2C9.5 21 3 14.5 3 6a2 2 0 012-2z"/>
              </svg>
            </button>
          </Link>

          {/* Video toggle */}
          <button
            className="w-[52px] h-[52px] rounded-pill flex items-center justify-center"
            style={{ background: '#5B6B68' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="7" width="13" height="10" rx="2"/>
              <path d="M16 10l5-2v8l-5-2z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
