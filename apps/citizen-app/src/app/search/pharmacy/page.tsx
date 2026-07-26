'use client'

// C-20 — Pharmacy Search (Module 5)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type PharmacyResult } from '@/lib/api'

export default function PharmacySearchPage() {
  const [medicine, setMedicine] = useState('Insulin')
  const [rows, setRows] = useState<PharmacyResult[]>([])
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
      const res = await citizenApi.pharmacies.search({ medicine, lat: geo?.lat, lng: geo?.lng })
      setRows(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pharmacies')
    } finally {
      setLoading(false)
    }
  }, [medicine, geo])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Pharmacy Search" backHref="/search" />

      <div className="px-5 pt-3 pb-3">
        <input
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
          className="w-full h-11 border rounded-btn px-3 text-[13px]"
          style={{ borderColor: '#D8D3C8' }}
          placeholder="Search medicine — e.g. Insulin"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {error && <p className="text-[12px]" style={{ color: '#C62E2E' }}>{error}</p>}
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching pharmacies…</p>}
        {!loading && rows.length === 0 && <p className="text-[13px]" style={{ color: '#7A8884' }}>No pharmacies found for this medicine.</p>}
        {rows.map((r) => (
          <Link key={r.pharmacyId} href={`/search/pharmacy-hold?pharmacyId=${r.pharmacyId}&medicine=${encodeURIComponent(r.medicineName)}`}>
            <Card className="p-3 bg-white flex gap-3 items-center">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#E9F3F0' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g transform="rotate(-25 12 12)"><rect x="4" y="9" width="16" height="6" rx="3"/><line x1="12" y1="9" x2="12" y2="15"/></g>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{r.name}</div>
                <div className="text-xs" style={{ color: '#5B6B68' }}>
                  {r.distanceKm != null ? `${r.distanceKm} km` : (r.address ?? '—')} · {r.medicineName}
                </div>
              </div>
              <Badge variant={r.variant}>{r.status}</Badge>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
