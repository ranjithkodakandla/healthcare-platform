'use client';

// C-19 — Hospital Profile (FR-NBH-001)
// Registry metadata + live bed categories from HospitalRegistry / bed inventory.
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BackHeader } from '@/components/ui/BackHeader';
import { citizenApi, getCurrentPosition, type HospitalProfile } from '@/lib/api';

function bedStyle(available: number): { color: string; bg: string } {
  if (available <= 0) return { color: '#8C1D1D', bg: '#FBE3E3' };
  if (available <= 2) return { color: '#8A5A00', bg: '#FBF0D9' };
  return { color: '#0E6B3A', bg: '#DFF5E9' };
}

function categoryLabel(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase().replace(/_/g, ' ');
}

function HospitalDetailInner() {
  const searchParams = useSearchParams();
  const hospitalId = searchParams.get('id') ?? 'hosp-apollo-blr';
  const [profile, setProfile] = useState<HospitalProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await getCurrentPosition();
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // distance optional
    }
    try {
      const res = await citizenApi.hospitals.profile(hospitalId, { lat, lng });
      setProfile(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load hospital');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openDirections() {
    if (!profile) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${profile.lat},${profile.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const placeLine = profile
    ? [
        profile.address,
        profile.city,
        profile.distanceKm != null ? `${profile.distanceKm} km` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <div
        className="h-[120px] flex-shrink-0"
        style={{ background: 'repeating-linear-gradient(135deg,#E9F3F0,#E9F3F0 10px,#FBF8F3 10px,#FBF8F3 20px)' }}
      />
      <BackHeader title={profile?.name ?? 'Hospital'} backHref="/search/hospitals" />

      <div className="flex-1 overflow-y-auto p-5">
        {loading && <p className="text-sm" style={{ color: '#7A8884' }}>Loading profile…</p>}
        {error && <p className="text-sm" style={{ color: '#B3261E' }}>{error}</p>}
        {profile && (
          <>
            <div className="text-xs mb-1" style={{ color: '#5B6B68' }}>{placeLine}</div>
            <div className="text-xs mb-4 font-semibold" style={{ color: '#0E6B3A' }}>
              Open 24 hours · {profile.occupancyPercent}% occupied · {profile.availableCount} beds available
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>Services</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {profile.services.map((s) => (
                <div
                  key={s}
                  className="px-3 py-[5px] rounded text-xs"
                  style={{ background: '#F4F1EA', color: '#1B2422' }}
                >
                  {s}
                </div>
              ))}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#7A8884' }}>Bed availability</p>
            <div className="flex flex-col gap-2 mb-4">
              {profile.beds.length === 0 && (
                <p className="text-xs" style={{ color: '#7A8884' }}>No bed inventory reported yet.</p>
              )}
              {profile.beds.map((b) => {
                const style = bedStyle(b.availableCount);
                return (
                  <div
                    key={b.category}
                    className="flex justify-between items-center px-3 py-2 rounded-btn border"
                    style={{ borderColor: '#EAE5DC' }}
                  >
                    <span className="text-sm font-semibold" style={{ color: '#1B2422' }}>
                      {categoryLabel(b.category)}
                      {b.stalenessStatus === 'STALE' && (
                        <span className="ml-2 text-xs font-bold" style={{ color: '#8A5A00' }}>Needs update</span>
                      )}
                    </span>
                    <span
                      className="text-xs font-bold px-2 py-[2px] rounded"
                      style={{ color: style.color, background: style.bg }}
                    >
                      {b.availableCount} avail.
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="p-5 border-t flex-shrink-0" style={{ borderColor: '#EAE5DC' }}>
        <button
          type="button"
          onClick={openDirections}
          disabled={!profile}
          className="w-full h-12 rounded-btn text-sm font-bold text-white disabled:opacity-50"
          style={{ background: '#0F766E' }}
        >
          Get Directions
        </button>
      </div>
    </div>
  );
}

export default function HospitalDetailPage() {
  return (
    <Suspense fallback={<div className="p-5 text-sm" style={{ color: '#7A8884' }}>Loading…</div>}>
      <HospitalDetailInner />
    </Suspense>
  );
}
