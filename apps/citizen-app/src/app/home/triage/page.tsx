'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { citizenApi, getCurrentPosition, getOrCreateDeviceId } from '@/lib/api'
import { fmt, getStoredLang, t } from '@/lib/i18n'

type TriageState = {
  isConscious: boolean | null
  isBreathing: boolean | null
  hasVisibleBleeding: boolean | null
}

function TriageInner() {
  const router = useRouter()
  const params = useSearchParams()
  const lang = getStoredLang()
  const s = t(lang)
  const isChild =
    params.get('patient') === 'child' ||
    (typeof window !== 'undefined' && localStorage.getItem('sahayak_patient_is_child') === '1')

  const questions = useMemo(
    () => [
      {
        key: 'isConscious' as const,
        q: s.qConscious,
        hint: s.hConscious,
        opts: [
          { label: s.aAwake, value: true },
          { label: s.aUnresponsive, value: false },
        ],
      },
      {
        key: 'isBreathing' as const,
        q: s.qBreathing,
        hint: s.hBreathing,
        opts: [
          { label: s.aBreathingOk, value: true },
          { label: s.aBreathingBad, value: false },
        ],
      },
      {
        key: 'hasVisibleBleeding' as const,
        q: s.qBleeding,
        hint: s.hBleeding,
        opts: [
          { label: s.aNoBleed, value: false },
          { label: s.aHeavyBleed, value: true },
        ],
      },
    ],
    [s],
  )

  const [step, setStep] = useState(0)
  const [triage, setTriage] = useState<TriageState>({
    isConscious: null,
    isBreathing: null,
    hasVisibleBleeding: null,
  })
  const [location, setLocation] = useState<{ lat?: number; lng?: number; address: string }>({
    address: s.locationFinding,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isChild) {
      try {
        localStorage.setItem('sahayak_patient_is_child', '1')
      } catch {
        /* ignore */
      }
    }
  }, [isChild])

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: s.locationReady,
        })
      })
      .catch(() => setLocation({ address: s.locationOff }))
  }, [s.locationOff, s.locationReady])

  const current = questions[step]

  async function submitCase(nextTriage: TriageState) {
    setSubmitting(true)
    setError(null)
    try {
      const deviceId = getOrCreateDeviceId()
      const address = isChild
        ? `${location.address} · paediatric`
        : location.address
      const result = await citizenApi.cases.createGuest({
        deviceId,
        location: {
          lat: location.lat,
          lng: location.lng,
          address,
          patientIsChild: isChild,
        },
        triage: {
          isConscious: nextTriage.isConscious!,
          isBreathing: nextTriage.isBreathing!,
          hasVisibleBleeding: nextTriage.hasVisibleBleeding!,
        },
      })

      localStorage.setItem('sahayak_active_case_id', result.data.id)
      localStorage.setItem('sahayak_active_case_number', result.data.caseNumber)
      router.push(`/home/searching?caseId=${result.data.id}&severity=${result.meta.severity}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not send request. Please try again.'
      if (msg.includes('active guest request')) {
        const activeCaseId = localStorage.getItem('sahayak_active_case_id')
        if (activeCaseId) {
          router.push(`/case/dashboard?caseId=${activeCaseId}`)
          return
        }
      }
      setError(
        msg.includes('Failed') || msg.includes('fetch')
          ? 'Connection problem. Check your signal and try again.'
          : msg,
      )
      setSubmitting(false)
    }
  }

  function answer(value: boolean) {
    if (submitting) return
    const nextTriage = { ...triage, [current.key]: value }
    setTriage(nextTriage)
    if (step < questions.length - 1) {
      setTimeout(() => setStep((x) => x + 1), 120)
      return
    }
    void submitCase(nextTriage)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="px-5 pt-10 pb-5 flex-shrink-0" style={{ background: '#1B2422' }}>
        <p className="text-sm font-bold uppercase tracking-wider mb-2" style={{ color: '#ff9a90' }}>
          {s.emergency}
        </p>
        <h1 className="text-2xl font-bold text-white mb-2">{s.quickCheck}</h1>
        <p className="text-base" style={{ color: '#B7D9DD' }}>{s.triageIntro}</p>
        {isChild && (
          <p className="text-sm mt-3 font-semibold" style={{ color: '#ffd7a8' }}>
            {s.childBanner}
          </p>
        )}
        <p className="text-sm mt-3 font-semibold" style={{ color: '#8FC6BE' }} aria-live="polite">
          {fmt(s.questionOf, { n: step + 1, total: questions.length })}
        </p>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }} aria-hidden>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${((step + 1) / questions.length) * 100}%`,
              background: '#8FC6BE',
            }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5" style={{ background: '#fff' }}>
        <div>
          <p className="text-xl font-bold mb-2" style={{ color: '#1B2422' }}>{current.q}</p>
          <p className="text-sm mb-5" style={{ color: '#5B6B68' }}>{current.hint}</p>
          <div className="flex flex-col gap-3">
            {current.opts.map((opt) => {
              const selected = triage[current.key] === opt.value
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => answer(opt.value)}
                  disabled={submitting}
                  className="w-full min-h-16 px-4 rounded-btn border text-base font-bold"
                  style={{
                    borderColor: selected ? '#0F766E' : '#EAE5DC',
                    background: selected ? '#E9F3F0' : '#fff',
                    color: selected ? '#0F766E' : '#1B2422',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-btn p-4 flex items-start gap-3" style={{ background: '#E9F3F0', border: '1px solid #8FC6BE' }}>
          <div>
            <p className="text-sm font-bold" style={{ color: '#0F766E' }}>
              {location.lat ? s.locationReady : s.locationFinding}
            </p>
            <p className="text-sm" style={{ color: '#5B6B68' }}>{location.address}</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed" style={{ color: '#7A8884' }} role="note">
          By continuing you allow Sahayak to process these answers and your location for emergency
          dispatch. We do not sell this information. Manage or withdraw permissions later in Account →
          Privacy.
        </p>

        {error && (
          <p className="text-sm text-center" style={{ color: '#C62E2E' }} role="alert">{error}</p>
        )}
        {submitting && (
          <p className="text-base text-center font-semibold" style={{ color: '#0F766E' }} aria-live="polite">
            {s.sending}
          </p>
        )}
      </div>

      <div className="p-5 flex-shrink-0 border-t flex gap-3" style={{ borderColor: '#EAE5DC' }}>
        {step > 0 && !submitting ? (
          <button
            type="button"
            onClick={() => setStep((x) => Math.max(0, x - 1))}
            className="h-14 px-5 rounded-pill text-base font-bold"
            style={{ background: '#F4F1EA', color: '#1B2422' }}
          >
            {s.back}
          </button>
        ) : null}
        <p className="flex-1 text-sm self-center text-center" style={{ color: '#7A8884' }}>
          {s.dialNote}
        </p>
      </div>
    </div>
  )
}

export default function TriagePage() {
  return (
    <Suspense fallback={<div className="flex-1 flex flex-col overflow-hidden min-h-0"><div className="p-8 text-center">…</div></div>}>
      <TriageInner />
    </Suspense>
  )
}
