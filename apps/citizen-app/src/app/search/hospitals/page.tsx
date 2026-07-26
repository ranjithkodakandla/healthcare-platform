'use client';

// C-18 — Nearby Hospitals Directory (Module 4 / FR-NBH)
// Distance-sorted from HospitalRegistry; occupancy from bed inventory aggregate.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BackHeader } from '@/components/ui/BackHeader';
import { Card } from '@/components/ui/Card';
import { citizenApi, getCurrentPosition, type NearbyHospital } from '@/lib/api';

function occColor(pct: number): string {
  if (pct >= 95) return '#8C1D1D';
  if (pct >= 85) return '#D98C0E';
  return '#0E6B3A';
}

function subtitle(h: NearbyHospital): string {
  const dist = h.distanceKm != null ? `${h.distanceKm} km` : h.city ?? '—';
  return `${dist} · ${h.specialtyLabel}`;
}

export default function NearbyHospitalsPage() {
  const [rows, setRows] = useState<NearbyHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [geoLabel, setGeoLabel] = useState('Detecting location…');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await getCurrentPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setGeoLabel('Near your location');
    } catch {
      setGeoLabel('Showing all registered hospitals');
    }
    try {
      const res = await citizenApi.hospitals.nearby({ lat, lng, radiusKm: 50 });
      setRows(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load hospitals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Nearby Hospitals" backHref="/search" />

      <div className="px-4 pt-2 pb-1 text-xs" style={{ color: '#7A8884' }}>
        {geoLabel}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {loading && <p className="text-sm" style={{ color: '#7A8884' }}>Loading hospitals…</p>}
        {error && <p className="text-sm" style={{ color: '#B3261E' }}>{error}</p>}
        {!loading && !error && rows.length === 0 && (
          <p className="text-sm" style={{ color: '#7A8884' }}>No hospitals found in range.</p>
        )}
        {rows.map((h) => (
          <Link key={h.hospitalId} href={`/search/hospital-detail?id=${encodeURIComponent(h.hospitalId)}`}>
            <Card className="p-3 bg-white flex gap-3 justify-between">
              <div
                className="w-8 h-8 rounded-btn flex items-center justify-center flex-shrink-0"
                style={{ background: '#E9F3F0' }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="4" width="16" height="17" rx="1" />
                  <path d="M12 9v6M9 12h6" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold" style={{ color: '#1B2422' }}>{h.name}</div>
                <div className="text-xs" style={{ color: '#5B6B68' }}>{subtitle(h)}</div>
              </div>
              <div className="text-xs font-bold" style={{ color: occColor(h.occupancyPercent) }}>
                {h.totalCount > 0 ? `${h.occupancyPercent}%` : '—'}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
