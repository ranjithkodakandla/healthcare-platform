'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { fmt, getStoredLang, t } from '@/lib/i18n'

function SearchingInner() {
  const router = useRouter()
  const params = useSearchParams()
  const caseId = params.get('caseId')
  const severity = (params.get('severity') || 'ROUTINE').toUpperCase()
  const s = t(getStoredLang())
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setElapsed((x) => x + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!caseId) return
    const timer = setTimeout(() => {
      router.push(`/home/tracking?caseId=${caseId}`)
    }, 8000)
    return () => clearTimeout(timer)
  }, [caseId, router])

  const mmss = useMemo(() => {
    const m = Math.floor(elapsed / 60).toString().padStart(2, '0')
    const sec = (elapsed % 60).toString().padStart(2, '0')
    return `${m}:${sec}`
  }, [elapsed])

  const severityLabel =
    severity === 'CRITICAL' ? s.criticalReq : severity === 'URGENT' ? s.urgentReq : s.standardReq

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div
        className="flex-1 flex flex-col items-center justify-center text-center px-7 gap-5"
        style={{ background: '#1B2422', color: '#fff' }}
      >
        <div
          className="flex items-center gap-2 px-3 py-2 rounded"
          style={{ background: 'rgba(179,38,30,0.25)' }}
        >
          <span className="text-sm font-bold" style={{ color: '#ff9a90' }}>{severityLabel}</span>
        </div>

        <div
          className="w-24 h-24 rounded-pill flex items-center justify-center"
          style={{ border: '3px solid rgba(255,255,255,0.35)' }}
          aria-hidden
        >
          <div
            className="w-16 h-16 rounded-pill flex items-center justify-center animate-pulse"
            style={{ background: 'rgba(20,144,160,0.5)' }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="9" width="14" height="8" rx="1"/>
              <path d="M16 12h4l2 3v2h-6z"/>
              <circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>
              <path d="M7 11v4M5 13h4"/>
            </svg>
          </div>
        </div>

        <h1 className="text-[22px] font-bold">{s.searchingTitle}</h1>
        <p className="text-base" style={{ color: '#B7D9DD' }}>{s.searchingBody}</p>
        <p className="text-base font-semibold" style={{ color: '#8FC6BE' }} aria-live="polite">
          {fmt(s.searchingElapsed, { time: mmss })}
        </p>

        <p className="text-sm mt-2" style={{ color: '#9fb9bc' }}>
          {s.searchingSlow}{' '}
          <Link href="/case/coordinator" className="font-semibold text-white underline">
            {s.talkCoordinator}
          </Link>
        </p>
      </div>

      <div className="p-5 flex-shrink-0" style={{ background: '#1B2422' }}>
        <Link href={caseId ? `/home/tracking?caseId=${caseId}` : '/home/tracking'} className="block">
          <span
            className="w-full h-14 rounded-pill text-base font-bold text-white flex items-center justify-center"
            style={{ background: '#0F766E' }}
            role="button"
          >
            {s.openTracking}
          </span>
        </Link>
        <Link
          href={caseId ? `/case/dashboard?caseId=${caseId}` : '/case/dashboard'}
          className="block w-full mt-3 text-center text-base font-semibold min-h-11 leading-[44px]"
          style={{ color: '#ff9a90' }}
        >
          {s.cancelCase}
        </Link>
      </div>
    </div>
  )
}

export default function AmbulanceSearchingPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex flex-col overflow-hidden min-h-0"><div className="p-8 text-center">…</div></div>}>
      <SearchingInner />
    </Suspense>
  )
}
