// C-08 — Ambulance Arrival Confirmation (§1.12)
// §1.21 — Case transitions to next stage (bed leg becomes primary) on confirmation.
import Link from 'next/link'

export default function AmbulanceArrivalPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-5" style={{ background: '#fff' }}>
        {/* Quiet success illustration */}
        <div
          className="w-20 h-20 rounded-pill flex items-center justify-center"
          style={{ background: '#DFF5E9' }}
        >
          <span className="text-4xl" style={{ color: '#1E9E5C' }}>✓</span>
        </div>

        <h2 className="text-xl font-bold" style={{ color: '#1B2422' }}>Ambulance has arrived</h2>
        <p className="text-sm leading-relaxed" style={{ color: '#5B6B68' }}>
          Confirm arrival so we can move to securing your hospital bed.
        </p>

        <Link href="/case/dashboard" className="w-full mt-3">
          <button
            className="w-full h-14 rounded-pill text-base font-bold text-white"
            style={{ background: '#0F766E' }}
          >
            Confirm Arrival
          </button>
        </Link>

        <button className="text-sm" style={{ color: '#7A8884' }}>Ambulance hasn&apos;t arrived yet</button>
      </div>
    </div>
  )
}
