'use client'

// C-07 — Ambulance Live Tracking (FR-AMB-003)
// Polls GET /v1/citizen/ambulances/by-case/:caseId every 3 seconds.
// BR-04: locked assignment shown — no reassignment UI.
// caseId from URL ?caseId= (set by C-05 after case creation).
// Suspense wrapper required for useSearchParams() in Next.js App Router.
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { citizenApi, type AmbulanceRequest } from '@/lib/api'

const POLL_INTERVAL_MS = 3000 // FR-AMB-003

const STATUS_LABEL: Record<string, string> = {
  SEARCHING: 'Finding an ambulance…',
  MATCHED: 'Ambulance matched — on the way',
  EN_ROUTE_PICKUP: 'Ambulance is on the way to you',
  ARRIVED_PICKUP: 'Ambulance has arrived!',
  EN_ROUTE_HOSPITAL: 'En route to hospital',
  ARRIVED_HOSPITAL: 'Arrived at hospital',
  COMPLETED: 'Trip completed',
  CANCELLED: 'Trip cancelled',
}

const VEHICLE_TYPE_LABEL: Record<string, string> = {
  BASIC_LIFE_SUPPORT: 'Basic Life Support ambulance',
  ADVANCED_LIFE_SUPPORT: 'Advanced Life Support ambulance',
  PATIENT_TRANSPORT: 'Patient Transport vehicle',
}

function AmbulanceTrackingContent() {
  const params = useSearchParams()
  const caseId = params.get('caseId') ?? (typeof window !== 'undefined' ? localStorage.getItem('sahayak_active_case_id') : null) ?? ''

  const [request, setRequest] = useState<AmbulanceRequest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const eta =
    request && typeof (request as { etaMinutes?: number }).etaMinutes === 'number'
      ? `${(request as { etaMinutes?: number }).etaMinutes} min`
      : '—'

  async function fetchStatus() {
    if (!caseId) return
    try {
      const res = await citizenApi.ambulances.getRequestByCaseId(caseId)
      setRequest(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No active ambulance request')
    }
  }

  useEffect(() => {
    fetchStatus()
    intervalRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  // Stop polling once terminal state reached
  useEffect(() => {
    const terminal = ['COMPLETED', 'CANCELLED', 'ARRIVED_HOSPITAL']
    if (request && terminal.includes(request.status)) {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [request])

  const statusLabel = request ? (STATUS_LABEL[request.status] ?? request.status) : 'Loading…'
  const driver = request?.driver

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      {/* Map placeholder */}
      <div
        className="flex-1 relative flex items-center justify-center flex-shrink-0"
        style={{
          background: 'repeating-linear-gradient(135deg,#E9F3F0,#E9F3F0 10px,#FBF8F3 10px,#FBF8F3 20px)',
          minHeight: 0,
        }}
      >
        <span className="text-xs font-mono" style={{ color: '#0F766E', background: '#fff', padding: '4px 8px', borderRadius: '4px' }}>
          map view — live route (3s refresh · FR-AMB-003)
        </span>

        {/* ETA + status overlay */}
        <div
          className="absolute top-4 left-4 right-4 rounded-card p-3 shadow-md"
          style={{ background: '#fff' }}
        >
          {request?.status === 'SEARCHING' ? (
            <div>
              <div className="text-[15px] font-bold" style={{ color: '#1B2422' }}>Finding driver…</div>
              <div className="text-xs mt-0.5" style={{ color: '#5B6B68' }}>Goal: match an ambulance within 90 seconds</div>
            </div>
          ) : (
            <div>
              <div className="text-[22px] font-bold" style={{ color: '#1B2422' }}>{eta}</div>
              <div className="text-xs" style={{ color: '#5B6B68' }}>{statusLabel}</div>
            </div>
          )}
        </div>
      </div>

      {/* Driver card + cancel */}
      <div
        className="p-4 border-t flex-shrink-0"
        style={{ borderColor: '#EAE5DC', background: '#fff' }}
      >
        {error && (
          <p className="text-[12px] mb-3 text-center" style={{ color: '#C62E2E' }}>{error}</p>
        )}

        {driver ? (
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-11 h-11 rounded-pill flex items-center justify-center flex-shrink-0"
              style={{ background: '#E9F3F0' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold" style={{ color: '#1B2422' }}>
                {driver.vehicleReg}
              </div>
              <div className="text-xs" style={{ color: '#5B6B68' }}>
                {VEHICLE_TYPE_LABEL[driver.vehicleType] ?? driver.vehicleType}
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-pill flex items-center justify-center text-xl"
              style={{ background: '#E9F3F0' }}
            >
              📞
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 py-2">
            <div className="w-2 h-2 rounded-full bg-[#D98C0E] animate-pulse" />
            <p className="text-sm" style={{ color: '#5B6B68' }}>
              {statusLabel}
            </p>
          </div>
        )}

        <Link href="/home/arrival">
          <button
            className="w-full h-12 rounded-btn border text-sm font-semibold"
            style={{ borderColor: '#C62E2E', color: '#C62E2E', background: 'transparent' }}
          >
            Cancel request
          </button>
        </Link>
      </div>
    </div>
  )
}

export default function AmbulanceTrackingPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px]" style={{ color: '#7A8884' }}>Loading…</p>
        </div>
      </div>
    }>
      <AmbulanceTrackingContent />
    </Suspense>
  )
}
