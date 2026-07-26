// C-28 — CHRONIC_MANAGEMENT Case View (Module 9)
// Cyclical status machine (DIAGNOSIS_INTAKE → … → SURVEILLANCE) rather than one-time resolution.
// States: Diagnosis intake, Active treatment, Surveillance (ongoing)
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { Card } from '@/components/ui/Card'

const CARE_STAGES = ['Intake', 'Treatment', 'Surveillance', 'Next review']
const CURRENT_STAGE = 2 // 0-indexed = "Surveillance"

const ACTIONS = [
  { title: 'Quarterly HbA1c review', detail: 'Due in 12 days · Diagnostic booking available', href: '/search/diagnostics' },
  { title: 'Endocrinologist follow-up', detail: 'Last visit: 3 weeks ago', href: '/search/doctors' },
]

export default function ChronicManagementPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Chronic Care" backHref="/account/profile" />

      {/* Case header */}
      <div
        className="px-5 py-4 flex-shrink-0"
        style={{ background: '#3E7C8A', color: '#fff' }}
      >
        <div className="text-[11px] font-bold uppercase tracking-wide opacity-85">
          Chronic management · Ongoing
        </div>
        <div className="text-base font-bold mt-1">Type 2 Diabetes Management</div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Care stage progress tracker (cyclical) */}
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
          Care stage
        </p>
        <div className="flex items-center gap-1 mb-1">
          {CARE_STAGES.map((stage, i) => (
            <div
              key={stage}
              className="flex-1 h-[6px] rounded-full"
              style={{
                background: i < CURRENT_STAGE ? '#1E9E5C' : i === CURRENT_STAGE ? '#3E7C8A' : '#EAE5DC',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between text-[10px] mb-5" style={{ color: '#7A8884' }}>
          {CARE_STAGES.map((stage, i) => (
            <div key={stage} style={{ color: i === CURRENT_STAGE ? '#3E7C8A' : '#7A8884', fontWeight: i === CURRENT_STAGE ? 700 : 400 }}>
              {stage}
            </div>
          ))}
        </div>

        {/* Pending actions */}
        <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
          Actions due
        </p>
        <div className="flex flex-col gap-3">
          {ACTIONS.map((action) => (
            <Link key={action.title} href={action.href}>
              <Card className="p-3 bg-white">
                <div className="text-[13px] font-bold" style={{ color: '#1B2422' }}>{action.title}</div>
                <div className="text-xs mt-[2px]" style={{ color: '#5B6B68' }}>{action.detail}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
