'use client';

// P-02: Dashboard — FR-HOSP-003 (Hospital exemplar)
// Wired to GET /v1/providers/:hospitalId/dashboard
// 30-second auto-refresh; manual "Refresh" button resets the interval.
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardPadded } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SplitPane, StatGrid } from '@/components/layout/ResponsiveTable';
import { occupancyColor } from '@/lib/utils';
import { providerApi, getSession, type DashboardData, ApiError } from '@/lib/api';

const REFRESH_INTERVAL_MS = 30_000;

function formatRelative(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? 'hosp-apollo-blr'; // dev fallback

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await providerApi.dashboard.get(hospitalId);
      setData(res.data);
      setLastSynced(new Date().toISOString());
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Your session expired. Please sign in again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  const occ = data?.bedOccupancy;
  const occPct = occ?.occupancyPercent ?? 0;

  const statCards = data
    ? [
        {
          label: 'Bed occupancy',
          value: `${occPct}%`,
          sub: `Beds in use · ${occ?.occupied ?? 0}/${occ?.total ?? 0} occupied`,
          valueColor: occupancyColor(occPct),
        },
        {
          label: 'Pending actions',
          value: String(data.pendingActionsCount),
          sub: `${data.pendingClinicalAckCount} clinical ack${data.pendingClinicalAckCount !== 1 ? 's' : ''} required`,
          valueColor: data.pendingActionsCount > 0 ? '#D98C0E' : '#1E9E5C',
        },
        {
          label: 'Staleness status',
          value: data.stalenessStatus,
          sub: data.stalenessStatus === 'FRESH' ? 'Inventory is current' : 'Update bed counts now',
          valueColor: data.stalenessStatus === 'FRESH' ? '#1E9E5C' : '#C62E2E',
        },
        {
          label: 'Active linked cases',
          value: String(data.activeLinkedCasesCount),
          sub: 'Across ambulance + bed legs',
          valueColor: '#1A1D1F',
        },
      ]
    : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[20px] font-bold" style={{ color: '#1A1D1F' }}>Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastSynced && (
            <span className="text-[12px]" style={{ color: '#7C8388' }}>
              Last synced {formatRelative(lastSynced)}
            </span>
          )}
          <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-[10px] p-3 mb-4 flex items-center justify-between"
          style={{ background: '#FBE3E3', border: '1px solid #C62E2E' }}
        >
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
          <button onClick={load} className="text-[12px] font-bold underline" style={{ color: '#C62E2E' }}>Retry</button>
        </div>
      )}

      {loading && !data && (
        <StatGrid className="mb-5">
          {[1, 2, 3, 4].map((i) => (
            <CardPadded key={i}>
              <div className="h-3 w-20 rounded bg-gray-200 animate-pulse mb-2" />
              <div className="h-8 w-12 rounded bg-gray-200 animate-pulse mb-1" />
              <div className="h-2 w-32 rounded bg-gray-100 animate-pulse" />
            </CardPadded>
          ))}
        </StatGrid>
      )}

      {statCards && (
        <StatGrid className="mb-5">
          {statCards.map((s) => (
            <CardPadded key={s.label}>
              <p className="text-[12px] font-semibold" style={{ color: '#7C8388' }}>{s.label}</p>
              <p className="text-[32px] font-bold mt-1.5" style={{ color: s.valueColor }}>{s.value}</p>
              <p className="text-[12px] mt-1" style={{ color: '#7C8388' }}>{s.sub}</p>
            </CardPadded>
          ))}
        </StatGrid>
      )}

      {data && data.pendingClinicalAckCount > 0 && (
        <div
          className="rounded-[12px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5"
          style={{ background: '#DEF3F5' }}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.03em] mb-1" style={{ color: '#0B5C66' }}>
              Next action needed
            </p>
            <p className="text-[14px] font-semibold" style={{ color: '#1A1D1F' }}>
              {data.pendingClinicalAckCount} ICU bed hold{data.pendingClinicalAckCount !== 1 ? 's' : ''} awaiting Clinical Lead acknowledgment
            </p>
          </div>
          <Link href="/hospital/queue">
            <Button size="md">Review queue</Button>
          </Link>
        </div>
      )}

      {data && (
        <SplitPane
          desktopColumns="1.3fr 1fr"
          left={
            <CardPadded>
              <p className="text-[14px] font-bold mb-3">Bed Occupancy by Category</p>
              <div className="text-[13px] font-semibold" style={{ color: '#7C8388' }}>
                {occ && (
                  <>
                    <p>{occ.available} available · {occ.occupied} occupied · {occ.total} total</p>
                    <div
                      className="mt-3 h-2.5 rounded-full overflow-hidden"
                      style={{ background: '#E7EBEC' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${occPct}%`,
                          background: occupancyColor(occPct),
                        }}
                      />
                    </div>
                    <p className="text-[11px] mt-1">{occPct}% occupancy</p>
                  </>
                )}
              </div>
            </CardPadded>
          }
          right={
            <Card style={{ borderColor: '#C7CDD0' }}>
              <div className="p-[18px]">
                <div className="flex justify-between items-center mb-2 gap-2 flex-wrap">
                  <p className="text-[14px] font-bold">Capacity Forecast (6–24h)</p>
                  <Badge variant="warning">ADVISORY</Badge>
                </div>
                <div
                  className="h-[90px] rounded-[8px] flex items-center justify-center text-[11px] font-mono"
                  style={{
                    background: 'repeating-linear-gradient(120deg,#F3FBFC,#F3FBFC 8px,#DEF3F5 8px,#DEF3F5 16px)',
                    color: '#0B5C66',
                  }}
                >
                  forecast trend chart
                </div>
                <p className="text-[11px] mt-2" style={{ color: '#7C8388' }}>
                  AI-generated · does not alter live bed counts (FR-HOSP-003)
                </p>
              </div>
            </Card>
          }
        />
      )}
    </div>
  );
}
