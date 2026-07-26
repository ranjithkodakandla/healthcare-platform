'use client'

// C-12 — Bed Search (FR-BED-002)
// §13.1: staleness shown on every result — mandatory.
// Geo-sort active when browser grants location (TD-003 resolved in Phase 7).
import { Suspense, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { BackHeader } from '@/components/ui/BackHeader'
import { FilterChip } from '@/components/ui/FilterChip'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { citizenApi, getCurrentPosition, type BedSearchResult, type BedCategory } from '@/lib/api'

const VALID_CATEGORIES: BedCategory[] = ['ICU', 'GENERAL', 'VENTILATOR', 'NICU', 'MATERNITY', 'ISOLATION']

const BED_CATEGORIES: Array<{ label: string; value: BedCategory | undefined }> = [
  { label: 'All', value: undefined },
  { label: 'ICU', value: 'ICU' },
  { label: 'General', value: 'GENERAL' },
  { label: 'Ventilator', value: 'VENTILATOR' },
  { label: 'NICU', value: 'NICU' },
  { label: 'Maternity', value: 'MATERNITY' },
]

function formatAge(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

function availBadgeVariant(r: BedSearchResult) {
  if (r.availableCount === 0) return 'full' as const
  if (r.availableCount <= 2) return 'low' as const
  return 'available' as const
}

function BedSearchInner() {
  const params = useSearchParams()
  const initial = params.get('category')?.toUpperCase()
  const [category, setCategory] = useState<BedCategory | undefined>(
    initial && VALID_CATEGORIES.includes(initial as BedCategory)
      ? (initial as BedCategory)
      : undefined,
  )
  const [results, setResults] = useState<BedSearchResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null)
  const [geoLabel, setGeoLabel] = useState('Detecting location…')

  useEffect(() => {
    const fromUrl = params.get('category')?.toUpperCase()
    if (fromUrl && VALID_CATEGORIES.includes(fromUrl as BedCategory)) {
      setCategory(fromUrl as BedCategory)
    }
  }, [params])

  // Detect location once on mount
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoLabel('Near your location')
      })
      .catch(() => {
        setGeoLabel('Location unavailable')
      })
  }, [])

  const fetchBeds = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await citizenApi.beds.search({
        category,
        lat: geo?.lat,
        lng: geo?.lng,
        radiusKm: 15,
      })
      setResults(res.data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }, [category, geo])

  useEffect(() => {
    fetchBeds()
  }, [fetchBeds])

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Bed Search" backHref="/search" />

      {/* Search input */}
      <div className="px-5 pt-3 pb-2">
        <div
          className="h-11 border rounded-btn flex items-center px-3 gap-2"
          style={{ borderColor: '#D8D3C8', background: '#fff' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7A8884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/>
          </svg>
          <span className="text-[13px]" style={{ color: '#7A8884' }}>
            {geoLabel}
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto flex-shrink-0">
        {BED_CATEGORIES.map((cat) => (
          <FilterChip
            key={cat.label}
            label={cat.label}
            active={category === cat.value}
            onClick={() => setCategory(cat.value)}
          />
        ))}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 pb-5 flex flex-col gap-3">
        {loading && (
          <div className="flex-1 flex items-center justify-center py-10">
            <p className="text-[13px]" style={{ color: '#7A8884' }}>Searching beds near you…</p>
          </div>
        )}

        {!loading && error && (
          <div className="mx-1 mt-4 p-3 rounded-card" style={{ background: '#FBE3E3' }}>
            <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>Could not load results</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#C62E2E' }}>{error}</p>
            <button
              onClick={fetchBeds}
              className="mt-2 text-[12px] font-bold underline"
              style={{ color: '#0F766E' }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 gap-2">
            <p className="text-[15px] font-semibold" style={{ color: '#1B2422' }}>No beds found</p>
            <p className="text-[13px] text-center" style={{ color: '#7A8884' }}>
              Try a different category or increase your search radius.
            </p>
          </div>
        )}

        {!loading && !error && results.map((r) => {
          const isStale = r.stalenessStatus === 'STALE'
          return (
            <Link
              key={`${r.hospitalId}-${r.category}`}
              href={`/search/bed-detail?hospitalId=${r.hospitalId}&category=${r.category}`}
            >
              <Card className="p-3 bg-white flex gap-3">
                <div
                  className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0"
                  style={{ background: '#E9F3F0' }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="4" y="4" width="16" height="17" rx="1"/><path d="M12 9v6M9 12h6"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <div className="text-sm font-bold" style={{ color: '#1B2422' }}>
                      {r.hospitalName ?? r.hospitalId}
                    </div>
                    <Badge variant={availBadgeVariant(r)}>
                      {r.availableCount > 0 ? `${r.availableCount} ${r.category} avail.` : 'Full'}
                    </Badge>
                  </div>
                  <div className="text-xs my-1" style={{ color: '#5B6B68' }}>
                    {[r.city, r.address].filter(Boolean).join(' · ')}
                    {r.distanceKm != null ? ` · ${r.distanceKm} km` : ''}
                    {r.occupancyPercent > 0 ? ` · ${r.occupancyPercent}% occupancy` : ''}
                  </div>
                  {/* §13.1: staleness mandatory on every result */}
                  <div
                    className="text-xs"
                    style={{ color: isStale ? '#D98C0E' : '#7A8884' }}
                  >
                    {isStale ? 'Needs update · ' : ''}
                    Last verified {formatAge(r.lastUpdatedAt)}
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default function BedSearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading beds…</div>}>
      <BedSearchInner />
    </Suspense>
  )
}
