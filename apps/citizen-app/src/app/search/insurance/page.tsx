'use client'

// C-24 — Insurance / Pre-Auth Status (FR-INS-001)
import { useEffect, useState } from 'react'
import { BackHeader } from '@/components/ui/BackHeader'
import { Card } from '@/components/ui/Card'
import { citizenApi, type InsurancePreAuth } from '@/lib/api'

const FLOW = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED'] as const

export default function InsurancePage() {
  const [preAuth, setPreAuth] = useState<InsurancePreAuth | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const caseId = typeof window !== 'undefined' ? localStorage.getItem('sahayak_active_case_id') ?? undefined : undefined
    citizenApi.insurance.getPreAuth(caseId)
      .then((res) => setPreAuth(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load pre-auth'))
      .finally(() => setLoading(false))
  }, [])

  const status = preAuth?.status ?? 'SUBMITTED'
  const activeIdx = Math.max(0, FLOW.indexOf(status as typeof FLOW[number]))

  const steps = [
    { num: activeIdx >= 0 ? '✓' : '1', label: 'Submitted', active: activeIdx >= 0, done: activeIdx >= 0 },
    { num: activeIdx >= 1 ? (status === 'UNDER_REVIEW' ? '2' : '✓') : '2', label: 'Under review by insurer', active: activeIdx >= 1, done: activeIdx > 1 },
    { num: '3', label: status === 'REJECTED' ? 'Rejected' : 'Approved', active: activeIdx >= 2 || status === 'REJECTED', done: status === 'APPROVED' },
  ]

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Insurance / Pre-Auth" backHref="/search" />

      <div className="flex-1 overflow-y-auto p-5">
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Loading pre-auth…</p>}
        {error && <p className="text-[12px] mb-3" style={{ color: '#C62E2E' }}>{error}</p>}

        <Card className="p-4 mb-5 flex gap-3">
          <div className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#E9F3F0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div className="text-[13px] font-bold mb-1" style={{ color: '#1B2422' }}>
              {preAuth?.insurerName ?? 'No pre-auth on file'}
            </div>
            <div className="text-xs" style={{ color: '#5B6B68' }}>
              {preAuth
                ? `Policy ending ${preAuth.policyLast4 ?? '————'} · ${preAuth.hospitalName ?? 'Hospital TBA'}, Cashless`
                : 'Submit a pre-auth from a case to track status here'}
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          {steps.map((step) => (
            <div key={step.label} className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-pill flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{
                  background: step.done || step.active ? '#0F766E' : '#EAE5DC',
                  color: step.done || step.active ? '#fff' : '#7A8884',
                }}
              >
                {step.num}
              </div>
              <div className="text-sm font-semibold" style={{ color: step.active ? '#1B2422' : '#7A8884' }}>
                {step.label}
              </div>
            </div>
          ))}
        </div>

        {status === 'REJECTED' && preAuth?.rejectionReason && (
          <p className="text-[12px] mt-4" style={{ color: '#C62E2E' }}>Reason: {preAuth.rejectionReason}</p>
        )}
      </div>
    </div>
  )
}
