'use client'

// C-27 — Cancer Hospital / Modality Search (FR-CAN-001)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { FilterChip } from '@/components/ui/FilterChip'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type CancerCenterResult } from '@/lib/api'

const MODALITIES = ['Radiation', 'Chemotherapy', 'Surgical Oncology', 'Palliative']

export default function CancerSearchPage() {
  const [modality, setModality] = useState('Radiation')
  const [rows, setRows] = useState<CancerCenterResult[]>([])
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
      const res = await citizenApi.cancerCenters.search({ modality, lat: geo?.lat, lng: geo?.lng })
      setRows(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cancer centres')
    } finally {
      setLoading(false)
    }
  }, [modality, geo])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Cancer Hospitals" backHref="/search" />

      <div className="flex gap-2 px-5 pt-3 pb-2 overflow-x-auto flex-shrink-0">
        {MODALITIES.map((m) => (
          <FilterChip key={m} label={m} active={modality === m} onClick={() => setModality(m)} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {error && <p className="text-[12px]" style={{ color: '#C62E2E' }}>{error}</p>}
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching centres…</p>}
        {!loading && rows.length === 0 && <p className="text-[13px]" style={{ color: '#7A8884' }}>No centres for this modality.</p>}
        {rows.map((h) => (
          <Link key={h.id} href={`/search/hospital-detail?id=${h.id}`}>
            <Card className="p-3 bg-white flex gap-3 items-center">
              <div className="w-9 h-9 rounded-pill flex items-center justify-center flex-shrink-0" style={{ background: '#E9F3F0' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="17" rx="1"/><path d="M12 9v6M9 12h6"/>
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{h.name}</div>
                <div className="text-xs" style={{ color: '#5B6B68' }}>
                  {h.distanceKm != null ? `${h.distanceKm} km · ` : ''}
                  {h.modalities.join(', ')}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
