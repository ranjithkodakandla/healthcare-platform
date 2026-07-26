// C-32 — Driver: Navigate + Handoff (FR-AMB-004)
// Turn-by-turn navigation to pickup/hospital plus structured triage handoff form.
// Minimal typing — structured form only.
// States: Navigating to pickup, Navigating to hospital, Handoff form
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

const HANDOFF_TAGS = ['Conscious', 'Breathing normally', 'No visible bleeding']

export default function DriverNavigatePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Navigate" backHref="/driver/dispatch" />

      {/* Map with turn instruction overlay */}
      <div
        className="relative flex items-center justify-center flex-1"
        style={{
          background: 'repeating-linear-gradient(135deg,#E9F3F0,#E9F3F0 10px,#FBF8F3 10px,#FBF8F3 20px)',
          minHeight: 0,
          maxHeight: '55%',
        }}
      >
        <span className="text-xs font-mono" style={{ color: '#0F766E', background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
          turn-by-turn navigation (FR-AMB-004)
        </span>

        {/* Turn instruction */}
        <div
          className="absolute top-4 left-4 right-4 rounded-card p-3"
          style={{ background: '#1B2422', color: '#fff' }}
        >
          <div className="text-sm font-bold">Turn right onto Hosur Road</div>
          <div className="text-xs opacity-80">400m · then continue 1.2 km</div>
        </div>
      </div>

      {/* Triage handoff panel */}
      <div className="p-4 border-t flex-shrink-0" style={{ borderColor: '#EAE5DC', background: '#fff' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
          Triage handoff to ER
        </p>
        <div className="flex gap-2 flex-wrap mb-3">
          {HANDOFF_TAGS.map((tag) => (
            <div
              key={tag}
              className="px-3 py-[5px] rounded text-xs"
              style={{ background: '#F4F1EA', color: '#1B2422' }}
            >
              {tag}
            </div>
          ))}
          <button
            className="px-3 py-[5px] rounded text-xs border"
            style={{ borderColor: '#D8D3C8', color: '#5B6B68' }}
          >
            + Add note
          </button>
        </div>

        <Link href="/driver/dispatch">
          <button
            className="w-full h-12 rounded-btn text-sm font-bold text-white"
            style={{ background: '#0F766E' }}
          >
            Send Handoff to ER
          </button>
        </Link>
      </div>
    </div>
  )
}
