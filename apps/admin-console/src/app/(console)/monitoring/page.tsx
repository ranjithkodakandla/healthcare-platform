'use client';

// A-14: Platform Monitoring — G11, M22.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type MonitoringSnapshot, ApiError } from '@/lib/api';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

function asVariant(v: string): BadgeVariant {
  if (v === 'success' || v === 'warning' || v === 'danger' || v === 'info' || v === 'neutral') return v;
  return 'neutral';
}

const CORE_OPS_NAMES = ['Ambulance Matching', 'Bed inventory freshness'];

export default function MonitoringPage() {
  const [snap, setSnap] = useState<MonitoringSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.monitoring.snapshot();
      setSnap(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load monitoring');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const allHealthCards = snap?.healthCards ?? [];
  const systemHealthCards = allHealthCards.filter((h) => !CORE_OPS_NAMES.includes(h.name));
  const coreOpsHealthCards = allHealthCards.filter((h) => CORE_OPS_NAMES.includes(h.name));

  return (
    <>
      <TopBar title="Platform Monitoring" screenId="A-14" ref_="G11, M22" slug="monitoring" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      {loading && !snap && <div className="text-[13px] text-[#7C8388] mb-4">Loading health snapshot…</div>}

      <div className="space-y-6">
        {/* 1. Infrastructure & System Health Cards */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#1A1D1F]">1. Infrastructure & System Health</h2>
            <Badge variant="info">{systemHealthCards.length} Services</Badge>
          </div>
          {systemHealthCards.length === 0 ? (
            <div className="text-[13px] text-[#7C8388]">No system health metrics available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {systemHealthCards.map((h) => (
                <div key={h.name} className="p-3.5 rounded-md border border-[#E7EBEC] bg-[#FAFBFB]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-[12px] font-semibold text-[#1A1D1F]">{h.name}</div>
                    <Badge variant={asVariant(h.variant)}>{h.value}</Badge>
                  </div>
                  <div className="text-[11px] text-[#7C8388]">{h.note}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 2. Core Operations Health */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[14px] font-bold text-[#1A1D1F]">2. Core Operations Health</h2>
            <Badge variant="info">{coreOpsHealthCards.length} Operations</Badge>
          </div>
          {coreOpsHealthCards.length === 0 ? (
            <div className="text-[13px] text-[#7C8388]">No core operations metrics available.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {coreOpsHealthCards.map((h) => (
                <div key={h.name} className="p-3.5 rounded-md border border-[#E7EBEC] bg-[#FAFBFB]">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-[12px] font-semibold text-[#1A1D1F]">{h.name}</div>
                    <Badge variant={asVariant(h.variant)}>{h.value}</Badge>
                  </div>
                  <div className="text-[11px] text-[#7C8388]">{h.note}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 3. Active Incident Management */}
        <Card padding="md">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[14px] font-bold text-[#1A1D1F]">3. Active Incident Management</h2>
            <Badge variant={snap?.incidents.length ? 'danger' : 'success'}>
              {snap?.incidents.length ? `${snap.incidents.length} Active` : 'All Clear'}
            </Badge>
          </div>
          {!snap || snap.incidents.length === 0 ? (
            <div className="text-[13px] text-[#7C8388] py-2">No active incidents reported across the platform.</div>
          ) : (
            <div className="space-y-2">
              {snap.incidents.map((inc, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2.5 border-b border-[#E7EBEC] last:border-0">
                  <div className="text-[13px] text-[#1A1D1F]">{inc.text}</div>
                  <Badge variant={asVariant(inc.variant)}>{inc.status}</Badge>
                </div>
              ))}
            </div>
          )}
          {snap && (
            <div className="text-[11px] text-[#7C8388] mt-3 pt-2 border-t border-[#E7EBEC]">
              Updated {new Date(snap.generatedAt).toLocaleTimeString('en-IN')}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
