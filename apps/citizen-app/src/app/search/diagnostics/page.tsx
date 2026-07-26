'use client'

// C-25 — Diagnostic Test Search + Booking (Module 8)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type DiagnosticResult } from '@/lib/api'

function formatSlot(iso: string | null): string {
  if (!iso) return 'Next slot: TBA'
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return `Next slot: ${isToday ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short' })}, ${time}`
}

export default function DiagnosticsPage() {
  const [q, setQ] = useState('MRI')
  const [rows, setRows] = useState<DiagnosticResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    getCurrentPosition()
      .then((p) => setGeo({ lat: p.coords.latitude, lng: p.coords.longitude }))
      .catch(() => undefined)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await citizenApi.diagnostics.search({ q, lat: geo?.lat, lng: geo?.lng })
      setRows(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load diagnostics')
    } finally {
      setLoading(false)
    }
  }, [q, geo])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Diagnostic Tests" backHref="/search" />

      <div className="px-5 pt-3 pb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full h-11 border rounded-btn px-3 text-[13px]"
          style={{ borderColor: '#D8D3C8' }}
          placeholder="Search test — e.g. MRI, CBC"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {error && <p className="text-[12px]" style={{ color: '#C62E2E' }}>{error}</p>}
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching tests…</p>}
        {!loading && rows.length === 0 && <p className="text-[13px]" style={{ color: '#7A8884' }}>No tests found.</p>}
        {rows.map((t) => (
          <Link key={t.id} href={`/search/diagnostic-result?id=${t.id}`}>
            <Card className="p-3 bg-white flex gap-3">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#E9F3F0' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 3h6M10 3v11a2 2 0 004 0V3"/><path d="M10 13h4"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{t.testName} — {t.centerName}</div>
                <div className="text-xs" style={{ color: '#5B6B68' }}>
                  {t.distanceKm != null ? `${t.distanceKm} km · ` : ''}₹{t.priceInr.toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] font-semibold mt-0.5" style={{ color: '#0E6B3A' }}>{formatSlot(t.nextSlotAt)}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
