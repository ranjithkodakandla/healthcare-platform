// C-14 — Bed Hold Status (§2.19)
// BR-02 hold countdown pattern, reused across every ResourceHold type.
// States: Pending (countdown), Confirmed, Expired → re-search offered
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

export default function BedHoldPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Bed Hold Status" backHref="/search/bed-detail" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        {/* Hold status badge */}
        <div
          className="text-xs font-bold uppercase px-3 py-[5px] rounded"
          style={{ color: '#8A5A00', background: '#FBF0D9' }}
        >
          Pending clinical acknowledgment
        </div>

        {/* Countdown — neutral→warning→danger (BR-02) */}
        <div className="text-[40px] font-bold" style={{ color: '#8A5A00' }}>
          04:12
        </div>

        <p className="text-[13px]" style={{ color: '#5B6B68' }}>
          Apollo Hospital is confirming ICU bed availability with their Clinical Lead
        </p>

        <div className="w-full h-px" style={{ background: '#EAE5DC' }} />

        <p className="text-xs" style={{ color: '#7A8884' }}>
          If not confirmed in time, we&apos;ll automatically search nearby alternatives.
        </p>

        <Link href="/case/dashboard" className="text-[13px] font-semibold mt-2" style={{ color: '#0F766E' }}>
          Back to Case Dashboard
        </Link>
      </div>
    </div>
  )
}
