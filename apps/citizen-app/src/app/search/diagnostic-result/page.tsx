// C-26 — Diagnostic Result View (FR-DIAG-001)
// States: Pending, Ready — result view, Downloaded
import { BackHeader } from '@/components/ui/BackHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

export default function DiagnosticResultPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Diagnostic Result" backHref="/search/diagnostics" />

      <div className="flex-1 overflow-y-auto p-5">
        <Card className="p-4 mb-4">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-bold" style={{ color: '#1B2422' }}>MRI Brain</div>
            <Badge variant="confirmed">Ready</Badge>
          </div>
          <div className="text-xs" style={{ color: '#5B6B68' }}>Apollo Diagnostics · Reported 18 Jul, 2026</div>
        </Card>

        <div
          className="rounded-card p-4 mb-4 border"
          style={{ borderColor: '#EAE5DC', background: '#F4F1EA' }}
        >
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: '#7A8884' }}>Report summary</p>
          <p className="text-[13px]" style={{ color: '#1B2422' }}>
            No acute intracranial abnormality. Normal brain parenchyma. No midline shift. Ventricles are normal in size.
          </p>
        </div>

        <p className="text-xs" style={{ color: '#7A8884' }}>
          Full report available as PDF. Shared automatically with your treating physician per your consent settings.
        </p>
      </div>

      <div className="p-5 border-t flex-shrink-0" style={{ borderColor: '#EAE5DC' }}>
        <button
          className="w-full h-[52px] rounded-pill text-[15px] font-bold text-white"
          style={{ background: '#0F766E' }}
        >
          Download Report (PDF)
        </button>
      </div>
    </div>
  )
}
