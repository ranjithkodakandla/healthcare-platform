// C-21 — Pharmacy Stock Hold + Fulfillment (FR-PHR-001)
// States: Hold placed, Ready for pickup, Fulfilled
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

export default function PharmacyHoldPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Medicine Hold" backHref="/search/pharmacy" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        <div
          className="text-xs font-bold uppercase px-3 py-[5px] rounded"
          style={{ color: '#8A5A00', background: '#FBF0D9' }}
        >
          Hold placed · MedPlus Koramangala
        </div>

        {/* Countdown — BR-02 pattern */}
        <div className="text-[34px] font-bold" style={{ color: '#8A5A00' }}>28:41</div>

        <p className="text-[13px]" style={{ color: '#5B6B68' }}>
          Insulin (10ml) reserved — pick up before hold expires
        </p>

        <div className="w-full h-px" style={{ background: '#EAE5DC' }} />

        <div className="text-xs font-bold" style={{ color: '#0E6B3A' }}>✓ Ready for pickup</div>

        <div className="mt-2 flex flex-col gap-2 w-full">
          <button
            className="w-full h-12 rounded-pill text-sm font-bold text-white"
            style={{ background: '#0F766E' }}
          >
            Confirm Pickup
          </button>
          <Link href="/case/dashboard" className="text-xs font-semibold text-center block" style={{ color: '#7A8884' }}>
            Back to Case Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
