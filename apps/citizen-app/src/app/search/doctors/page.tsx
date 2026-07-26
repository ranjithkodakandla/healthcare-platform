'use client'

// C-15 — Doctor Search (Module 3)
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { FilterChip } from '@/components/ui/FilterChip'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type DoctorResult } from '@/lib/api'

const SPECIALTIES = ['Cardiology', 'General Physician', 'Neurology', 'Orthopaedics']

function formatSlot(iso: string | null): string {
  if (!iso) return 'Next slot: TBA'
  const d = new Date(iso)
  const today = new Date()
  const isToday = d.toDateString() === today.toDateString()
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })
  return `Next slot: ${isToday ? 'Today' : 'Tomorrow'}, ${time}`
}

export default function DoctorSearchPage() {
  const [specialty, setSpecialty] = useState('Cardiology')
  const [rows, setRows] = useState<DoctorResult[]>([])
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
      const res = await citizenApi.doctors.search({ specialty, lat: geo?.lat, lng: geo?.lng })
      setRows(res.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load doctors')
    } finally {
      setLoading(false)
    }
  }, [specialty, geo])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Doctor Search" backHref="/search" />

      <div className="px-5 pt-3 pb-2">
        <div className="h-11 border rounded-btn flex items-center px-3 gap-2" style={{ borderColor: '#D8D3C8', background: '#fff' }}>
          <span className="text-[13px]" style={{ color: '#7A8884' }}>
            {geo ? 'Near your location' : 'Search by specialty'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 px-5 pb-3 overflow-x-auto flex-shrink-0">
        {SPECIALTIES.map((s) => (
          <FilterChip key={s} label={s} active={specialty === s} onClick={() => setSpecialty(s)} />
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {error && <p className="text-[12px]" style={{ color: '#C62E2E' }}>{error}</p>}
        {loading && <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching doctors…</p>}
        {!loading && rows.length === 0 && <p className="text-[13px]" style={{ color: '#7A8884' }}>No doctors found.</p>}
        {rows.map((d) => (
          <Link key={d.id} href={`/search/doctor-detail?id=${d.id}`}>
            <Card className="p-3 bg-white flex gap-3">
              <div className="w-11 h-11 rounded-pill flex items-center justify-center flex-shrink-0" style={{ background: '#E9F3F0' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3v5a4 4 0 008 0V3"/><circle cx="19" cy="16" r="3"/>
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{d.name}</div>
                <div className="text-xs my-[2px]" style={{ color: '#5B6B68' }}>
                  {d.specialty}{d.hospitalName ? ` · ${d.hospitalName}` : ''}
                  {d.distanceKm != null ? ` · ${d.distanceKm} km` : ''}
                </div>
                <div className="text-[11px] font-semibold" style={{ color: '#0E6B3A' }}>{formatSlot(d.nextSlotAt)}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
