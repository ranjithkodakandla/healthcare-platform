// C-13 — Bed Detail + Hold Confirmation (FR-BED-003)
// BR-04 — ICU/Vent requires provider Clinical Lead acknowledgment before confirming.
// General beds auto-confirm in one step.
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const CATEGORIES = [
  { label: 'ICU', count: '3 available · requires ack', selected: true, needsAck: true },
  { label: 'General', count: '12 available', selected: false, needsAck: false },
  { label: 'Maternity', count: '5 available', selected: false, needsAck: false },
  { label: 'NICU', count: '2 available · requires ack', selected: false, needsAck: true },
]

export default function BedDetailPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      {/* Map/photo placeholder */}
      <div
        className="h-[120px] flex-shrink-0"
        style={{ background: 'repeating-linear-gradient(135deg,#E9F3F0,#E9F3F0 10px,#FBF8F3 10px,#FBF8F3 20px)' }}
      />

      <div className="flex-1 overflow-y-auto p-5">
        <h2 className="text-[18px] font-bold mb-1" style={{ color: '#1B2422' }}>Apollo Hospital</h2>
        <p className="text-xs mb-4" style={{ color: '#5B6B68' }}>Bannerghatta Road, Bengaluru · 2.4 km</p>

        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
          Select bed category
        </p>

        <div className="flex flex-col gap-2">
          {CATEGORIES.map((cat) => (
            <Card key={cat.label} selected={cat.selected} className="p-3 flex justify-between items-center">
              <span className="text-[13px] font-semibold" style={{ color: '#1B2422' }}>{cat.label}</span>
              <span
                className="text-xs font-bold"
                style={{ color: cat.needsAck ? '#8A5A00' : '#0E6B3A' }}
              >
                {cat.count}
              </span>
            </Card>
          ))}
        </div>
      </div>

      {/* Place hold CTA */}
      <div className="p-5 border-t flex-shrink-0" style={{ borderColor: '#EAE5DC' }}>
        <Link href="/search/bed-hold">
          <button
            className="w-full h-[52px] rounded-pill text-[15px] font-bold text-white"
            style={{ background: '#0F766E' }}
          >
            Place Hold — ICU Bed
          </button>
        </Link>
      </div>
    </div>
  )
}
