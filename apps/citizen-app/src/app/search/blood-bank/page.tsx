'use client'

// C-22 — Blood Bank Search (Module 6)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { FilterChip } from '@/components/ui/FilterChip'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type BloodBankResult } from '@/lib/api'

const GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-']

export default function BloodBankSearchPage() {
  const [group, setGroup] = useState('O+')
  const [rows, setRows] = useState<BloodBankResult[]>([])
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
      const res = await citizenApi.bloodBanks.search({ bloodGroup: group, lat: geo?.lat, lng: geo?.lng })
      setRows(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load blood banks')
    } finally {
      setLoading(false)
    }
  }, [group, geo])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Blood Bank Search" backHref="/search" />

      <div className="flex gap-2 px-5 pt-3 pb-2 overflow-x-auto flex-shrink-0">
        {GROUPS.map((g) => (
          <FilterChip key={g} label={g} active={group === g} onClick={() => setGroup(g)} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {error && <p className="text-[12px]" style={{ color: '#C62E2E' }}>{error}</p>}
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching blood banks…</p>}
        {!loading && rows.length === 0 && <p className="text-[13px]" style={{ color: '#7A8884' }}>No banks found for {group}.</p>}
        {rows.map((r) => (
          <Link key={`${r.bloodBankId}-${r.bloodGroup}`} href={`/search/blood-request?bankId=${r.bloodBankId}&group=${r.bloodGroup}`}>
            <Card className="p-3 bg-white flex gap-3 items-center">
              <div className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0" style={{ background: '#FBE3E3' }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={r.variant === 'available' ? '#0E6B3A' : '#8C1D1D'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3s7 8 7 13a7 7 0 01-14 0c0-5 7-13 7-13z"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{r.name}</div>
                <div className="text-xs" style={{ color: '#5B6B68' }}>
                  {r.distanceKm != null ? `${r.distanceKm} km` : '—'}
                  {r.unitsAvailable > 0 ? ` · ${r.unitsAvailable} units` : ''}
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
