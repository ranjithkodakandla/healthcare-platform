'use client'

// C-31 — Driver: Go On-Duty / Incoming Offer
import { useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'

export default function DriverDispatchPage() {
  const [onDuty, setOnDuty] = useState(true)

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Ambulance driver" backHref="/onboarding/guest" />

      <div className="flex-1 overflow-y-auto p-5">
        <div className="mb-5">
          <h1 className="text-xl font-bold mb-1" style={{ color: '#1B2422' }}>Driver tools</h1>
          <p className="text-sm" style={{ color: '#5B6B68' }}>
            Go on duty to receive nearby emergency offers. You have 20 seconds to accept.
          </p>
        </div>

        <div className="flex justify-between items-center mb-5 min-h-14">
          <div className="text-base font-bold" style={{ color: '#1B2422' }}>On duty</div>
          <button
            type="button"
            role="switch"
            aria-checked={onDuty}
            onClick={() => setOnDuty((v) => !v)}
            className="relative min-h-11 min-w-[52px] rounded-full px-1"
            style={{ background: onDuty ? '#1E9E5C' : '#D8D3C8', width: 52, height: 32 }}
          >
            <span
              className="block w-6 h-6 rounded-full bg-white"
              style={{ marginLeft: onDuty ? 20 : 0, transition: 'margin 120ms' }}
            />
            <span className="sr-only">{onDuty ? 'On duty' : 'Off duty'}</span>
          </button>
        </div>

        {onDuty ? (
          <div
            className="rounded-[14px] p-4"
            style={{ border: '2px solid #B3261E', background: '#FBE3E3' }}
          >
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-bold uppercase" style={{ color: '#8C1D1D' }}>New offer</div>
              <div className="text-[22px] font-bold" style={{ color: '#8C1D1D' }} aria-live="polite">00:17</div>
            </div>
            <div className="text-base font-bold mb-1" style={{ color: '#1B2422' }}>
              Pickup: MG Road, 2.1 km away
            </div>
            <div className="text-sm mb-4" style={{ color: '#5B6B68' }}>Critical · Chest pain</div>

            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 h-14 rounded-card text-[15px] font-bold border"
                style={{ borderColor: '#B3261E', color: '#B3261E', background: '#fff', borderWidth: '1.5px' }}
              >
                Decline
              </button>
              <Link href="/driver/navigate" className="flex-1">
                <span
                  className="w-full h-14 rounded-card text-[15px] font-bold text-white flex items-center justify-center"
                  style={{ background: '#B3261E' }}
                  role="button"
                >
                  Accept
                </span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="rounded-card p-4" style={{ background: '#F4F1EA' }}>
            <p className="text-base font-bold mb-1" style={{ color: '#1B2422' }}>You are off duty</p>
            <p className="text-sm" style={{ color: '#5B6B68' }}>
              Turn on duty when you are ready to receive offers.
            </p>
          </div>
        )}

        <Link
          href="/driver/navigate"
          className="mt-5 block min-h-12 text-center text-base font-semibold leading-[48px]"
          style={{ color: '#0F766E' }}
        >
          Open navigation tools
        </Link>
      </div>
    </div>
  )
}
