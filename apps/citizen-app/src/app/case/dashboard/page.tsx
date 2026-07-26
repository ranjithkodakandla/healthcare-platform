'use client'

// C-09 — Case Dashboard (§A3.1)
// THE central screen — "what is happening to me right now"
// NextActionBanner is the deliberately loudest element.
// GT-11: degraded card never blocks the rest of the dashboard.
// Polls GET /v1/citizen/cases/:caseId/timeline every 5 seconds.
// Note: Suspense wrapper required for useSearchParams() in Next.js App Router.
import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { citizenApi, type CaseTimelineEvent } from '@/lib/api'

const POLL_MS = 5000

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function elapsedClock(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime()
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600).toString().padStart(2, '0')
  const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0')
  const s = (totalSec % 60).toString().padStart(2, '0')
  return `${h}:${m}:${s}`
}

function eventLabel(e: CaseTimelineEvent): { icon: string; text: string; color: string } {
  const type = e.type
  if (type.includes('AMBULANCE_MATCHED')) return { icon: '🚑', text: 'Ambulance matched', color: '#0E6B3A' }
  if (type.includes('AMBULANCE_REQUEST_CREATED')) return { icon: '🚑', text: 'Ambulance requested', color: '#5B6B68' }
  if (type.includes('BED_HOLD')) return { icon: '🛏', text: 'Bed hold placed', color: '#8A5A00' }
  if (type.includes('CASE_CREATED')) return { icon: '📋', text: 'Case created', color: '#0F766E' }
  if (type.includes('CASE_STATUS_CHANGED')) return { icon: '🔄', text: `Status → ${(e.payload.newStatus as string) ?? ''}`, color: '#5B6B68' }
  return { icon: '•', text: type.replace(/_/g, ' ').toLowerCase(), color: '#5B6B68' }
}

type LinkedService = {
  label: string
  detail: string
  status: string
  variant: 'confirmed' | 'pending' | 'stale'
  iconBg: string
  iconStroke: string
  opacity: number
}

function buildLinkedServices(events: CaseTimelineEvent[]): LinkedService[] {
  const services: LinkedService[] = []
  const hasAmb = events.some((e) => e.type.includes('AMBULANCE'))
  const hasBed = events.some((e) => e.type.includes('BED'))
  const latestAmb = events.filter((e) => e.type.includes('AMBULANCE')).at(-1)
  const latestBed = events.filter((e) => e.type.includes('BED')).at(-1)

  if (hasAmb) {
    const isCompleted = latestAmb?.type.includes('ARRIVED_HOSPITAL') || latestAmb?.type.includes('COMPLETED')
    services.push({
      label: 'Ambulance',
      detail: isCompleted ? 'Trip completed' : `Status: ${latestAmb?.type.replace(/_/g, ' ').toLowerCase() ?? '…'}`,
      status: isCompleted ? 'Done' : 'Active',
      variant: isCompleted ? 'confirmed' : 'pending',
      iconBg: '#DFF5E9',
      iconStroke: '#0E6B3A',
      opacity: 1,
    })
  }

  if (hasBed) {
    services.push({
      label: 'Bed hold',
      detail: latestBed ? `${formatTime(latestBed.createdAt)} · pending clinical ack` : 'Pending',
      status: 'Pending',
      variant: 'pending',
      iconBg: '#FBF0D9',
      iconStroke: '#8A5A00',
      opacity: 1,
    })
  }

  return services
}

function CaseDashboardContent() {
  const params = useSearchParams()
  const caseId =
    params.get('caseId') ??
    (typeof window !== 'undefined' ? localStorage.getItem('sahayak_active_case_id') : null) ?? ''

  const [events, setEvents] = useState<CaseTimelineEvent[]>([])
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [clock, setClock] = useState('00:00:00')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  async function fetchTimeline() {
    if (!caseId) return
    try {
      const res = await citizenApi.cases.getTimeline(caseId)
      setEvents(res.data)
      // Case createdAt from first event or URL param
      if (res.data.length > 0 && !createdAt) {
        setCreatedAt(res.data[0].createdAt)
      }
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimeline()
    pollRef.current = setInterval(fetchTimeline, POLL_MS)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId])

  // Golden Hour clock
  useEffect(() => {
    if (!createdAt) return
    const ticker = setInterval(() => setClock(elapsedClock(createdAt)), 1000)
    return () => clearInterval(ticker)
  }, [createdAt])

  const linkedServices = buildLinkedServices(events)
  const latestEvent = events.at(-1)
  const caseOpen = latestEvent && !latestEvent.type.includes('CLOSED') && !latestEvent.type.includes('RESOLVED')

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F4F1EA' }}>

      {/* Case header — Golden Hour clock */}
      <div className="px-5 pt-4 pb-4 flex-shrink-0" style={{ background: '#8C1D1D', color: '#fff' }}>
        <div className="flex items-center gap-2 mb-2">
          <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
            <path d="M5 0L0 10h10L5 0z" fill="#fff"/>
          </svg>
          <span className="text-xs font-bold uppercase tracking-wide">Active Emergency</span>
        </div>
        <p className="text-xs opacity-85">Golden Hour elapsed</p>
        <div className="text-[26px] font-bold">{createdAt ? clock : '—'}</div>
        {caseId && (
          <p className="text-[11px] mt-1 opacity-70">Case #{caseId.slice(0, 8).toUpperCase()}</p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-2">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <p className="text-[13px]" style={{ color: '#7A8884' }}>Loading case…</p>
          </div>
        )}

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-card" style={{ background: '#FBE3E3' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
          </div>
        )}

        {/* NextActionBanner — loudest element (§A3.1) */}
        {caseOpen && linkedServices.some((s) => s.variant === 'pending') && (
          <div
            className="mx-4 my-3 p-4 rounded-card border"
            style={{ background: '#E9F3F0', borderColor: '#8FC6BE' }}
          >
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: '#0F766E' }}>
              Next action needed
            </p>
            <p className="text-sm font-semibold mb-3" style={{ color: '#1B2422' }}>
              Bed hold pending confirmation
            </p>
            <Link href={`/search/bed-hold?caseId=${caseId}`}>
              <button
                className="w-full h-10 rounded-btn text-xs font-bold text-white"
                style={{ background: '#0F766E' }}
              >
                View hold status
              </button>
            </Link>
          </div>
        )}

        {/* Linked services */}
        {linkedServices.length > 0 && (
          <>
            <p className="px-5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
              Linked services
            </p>
            <div className="px-4 flex flex-col gap-2 mb-3">
              {linkedServices.map((svc) => (
                <Card key={svc.label} className="p-3 bg-white" style={{ opacity: svc.opacity }}>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0"
                      style={{ background: svc.iconBg }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={svc.iconStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="9" width="14" height="8" rx="1"/><path d="M16 12h4l2 3v2h-6z"/>
                        <circle cx="7" cy="19" r="1.6"/><circle cx="17" cy="19" r="1.6"/>
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold" style={{ color: '#1B2422' }}>{svc.label}</div>
                      <div className="text-[11px]" style={{ color: '#7A8884' }}>{svc.detail}</div>
                    </div>
                    <Badge variant={svc.variant}>{svc.status}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Live timeline */}
        {events.length > 0 && (
          <>
            <p className="px-5 text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>
              Timeline
            </p>
            <div className="px-4 flex flex-col gap-0 mb-3">
              {[...events].reverse().map((ev) => {
                const { icon, text, color } = eventLabel(ev)
                return (
                  <div key={ev.id} className="flex gap-3 items-start py-2 border-b last:border-b-0" style={{ borderColor: '#EAE5DC' }}>
                    <span className="text-base leading-tight">{icon}</span>
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold" style={{ color }}>{text}</p>
                      <p className="text-[11px]" style={{ color: '#7A8884' }}>{formatTime(ev.createdAt)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* Coordinator CTA (GT-08 — never more than one tap away) */}
        <div className="px-4 mb-2">
          <Link href="/case/coordinator">
            <button
              className="w-full h-12 rounded-btn border text-sm font-semibold flex items-center justify-center gap-2"
              style={{ borderColor: '#D8D3C8', color: '#1B2422', background: '#fff' }}
            >
              🎧 Talk to a coordinator
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function CaseDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center" style={{ background: '#F4F1EA' }}>
        <p className="text-[13px]" style={{ color: '#7A8884' }}>Loading case…</p>
      </div>
    }>
      <CaseDashboardContent />
    </Suspense>
  )
}
