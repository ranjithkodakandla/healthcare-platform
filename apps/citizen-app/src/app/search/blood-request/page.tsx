// C-23 — Blood Request / Donor Match Status (FR-BLD-001)
// States: Searching donor/inventory, Matched, Fulfilled
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

export default function BloodRequestPage() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Blood Request" backHref="/search/blood-bank" />

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        {/* Searching status */}
        <div
          className="text-xs font-bold uppercase px-3 py-[5px] rounded"
          style={{ color: '#0F766E', background: '#E9F3F0' }}
        >
          Searching donor &amp; inventory match
        </div>

        <div
          className="w-16 h-16 rounded-pill flex items-center justify-center text-2xl"
          style={{ background: '#FBE3E3' }}
        >
          🩸
        </div>

        <div className="text-sm font-semibold" style={{ color: '#1B2422' }}>O+ · 2 units requested</div>
        <p className="text-xs" style={{ color: '#5B6B68' }}>
          1 donor matched nearby · Red Cross Blood Bank confirming inventory
        </p>

        <div className="w-full h-px mt-2" style={{ background: '#EAE5DC' }} />

        {/* Countdown (BR-02 reused) */}
        <div className="text-[28px] font-bold" style={{ color: '#8A5A00' }}>12:30</div>
        <p className="text-xs" style={{ color: '#7A8884' }}>Hold expires if blood bank cannot confirm</p>

        <Link href="/case/dashboard" className="text-xs font-semibold" style={{ color: '#0F766E' }}>
          Back to Case Dashboard
        </Link>
      </div>
    </div>
  )
}
