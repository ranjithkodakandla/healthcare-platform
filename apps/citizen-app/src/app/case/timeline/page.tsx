// C-10 — Case Timeline (§A3.2)
// Immutable, append-only, human-readable event log. No edit affordance ever.
// Exportable as a shareable summary. GT-07 consent-scoped visibility per viewer role.
import { BackHeader } from '@/components/ui/BackHeader'
import { FilterChip } from '@/components/ui/FilterChip'

const EVENTS = [
  { time: '12:41 PM', text: 'Ambulance arrival confirmed at pickup location', color: '#0E6B3A' },
  { time: '12:22 PM', text: 'Ambulance dispatched — Suresh M., KA-01 AB 4521', color: '#0F766E' },
  { time: '12:14 PM', text: 'Bed hold placed — Apollo Hospital, ICU', color: '#D98C0E' },
  { time: '12:11 PM', text: 'Case created — Critical severity ambulance request', color: '#B3261E' },
]

export default function CaseTimelinePage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader
        title="Case Timeline"
        backHref="/case/dashboard"
        action={
          <button className="text-xs font-semibold" style={{ color: '#0F766E' }}>Share</button>
        }
      />

      {/* Filter chips */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto flex-shrink-0">
        <FilterChip label="All" active />
        <FilterChip label="Ambulance" />
        <FilterChip label="Bed" />
        <FilterChip label="Insurance" />
      </div>

      {/* Timeline list */}
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        <div className="relative">
          {/* Vertical line */}
          <div
            className="absolute left-[5px] top-2 bottom-4 w-0.5"
            style={{ background: '#EAE5DC' }}
          />

          {EVENTS.map((ev, i) => (
            <div key={i} className="flex gap-4 py-3 relative">
              <div
                className="w-[10px] h-[10px] rounded-pill mt-1 flex-shrink-0 z-10"
                style={{ background: ev.color }}
              />
              <div>
                <div className="text-[11px]" style={{ color: '#7A8884' }}>{ev.time}</div>
                <div className="text-[13px]" style={{ color: '#1B2422' }}>{ev.text}</div>
              </div>
            </div>
          ))}

          <div className="text-center text-xs py-3" style={{ color: '#7A8884' }}>
            Loading earlier events…
          </div>
        </div>
      </div>
    </div>
  )
}
