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

  return (
    <>
      <TopBar title="Platform Monitoring" screenId="A-14" ref_="G11, M22" slug="monitoring" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      {loading && !snap && <div className="text-[13px] text-[#7C8388] mb-4">Loading health snapshot…</div>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        {(snap?.healthCards ?? []).map((h) => (
          <Card key={h.name} padding="md">
            <div className="flex items-start justify-between mb-2">
              <div className="text-[12px] font-semibold text-[#7C8388]">{h.name}</div>
              <Badge variant={asVariant(h.variant)}>{h.value}</Badge>
            </div>
            <div className="text-[11px] text-[#7C8388]">{h.note}</div>
          </Card>
        ))}
      </div>

      <Card padding="md">
        <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Active incidents</div>
        {!snap || snap.incidents.length === 0 ? (
          <div className="text-[13px] text-[#7C8388]">No active incidents.</div>
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
          <div className="text-[11px] text-[#7C8388] mt-3">
            Updated {new Date(snap.generatedAt).toLocaleTimeString('en-IN')}
          </div>
        )}
      </Card>
    </>
  );
}
