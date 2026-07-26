// C-11 — Human Coordinator Escalation (GT-08)
// Always-reachable, never a dead-end form.
// Shows live coordinator connection status so citizen always sees forward progress.
// GT-08 — never more than one tap/click from any Case-related screen.
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

export default function CoordinatorPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Coordinator" backHref="/case/dashboard" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        {/* Headset avatar */}
        <div
          className="w-[76px] h-[76px] rounded-pill flex items-center justify-center text-3xl"
          style={{ background: '#E9F3F0' }}
        >
          🎧
        </div>

        <h2 className="text-[18px] font-bold" style={{ color: '#1B2422' }}>
          Connecting you to a coordinator…
        </h2>
        <p className="text-sm" style={{ color: '#5B6B68' }}>
          Position in queue: <strong>2</strong> · est. wait <strong>40s</strong>
        </p>

        {/* Case context auto-attached */}
        <div
          className="w-full border rounded-card p-3 text-left mt-2"
          style={{ borderColor: '#EAE5DC' }}
        >
          <p className="text-[11px] font-semibold uppercase mb-1" style={{ color: '#7A8884' }}>
            Case context attached
          </p>
          <p className="text-[13px]" style={{ color: '#1B2422' }}>
            Critical · Ambulance en route · Bed hold pending, Apollo Hospital
          </p>
        </div>

        <Link href="/case/dashboard" className="text-sm mt-3" style={{ color: '#7A8884' }}>
          Cancel
        </Link>
      </div>
    </div>
  )
}
