'use client';

// P-14: Fleet Roster + Map — FR-AMBP-001
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { providerApi, getSession, type FleetVehicle, ApiError } from '@/lib/api';

function statusVariant(status: string): 'success' | 'danger' | 'muted' | 'warning' {
  if (status === 'AVAILABLE') return 'success';
  if (status === 'EN_ROUTE') return 'danger';
  if (status === 'MAINTENANCE') return 'muted';
  return 'warning';
}

function statusLabel(status: string): string {
  if (status === 'EN_ROUTE') return 'En Route';
  if (status === 'OFF_DUTY') return 'Off Duty';
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function FleetPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const providerId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await providerApi.fleet.list(providerId);
      setFleet(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load fleet');
      }
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20_000);
    return () => clearInterval(id);
  }, [load]);

  const pins = fleet.filter((f) => f.lastLat != null && f.lastLng != null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold">Fleet Roster + Map</h1>
        <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
      </div>

      {error && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#FBE3E3' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
        <div
          className="h-[340px] rounded-[12px] flex flex-col items-center justify-center font-mono text-[11px] gap-2 px-4 text-center"
          style={{ background: 'repeating-linear-gradient(135deg,#DEF3F5,#DEF3F5 10px,#F3FBFC 10px,#F3FBFC 20px)', color: '#0B5C66' }}
        >
          <span>fleet map — multi-pin roster view</span>
          <span style={{ color: '#7C8388' }}>
            {loading ? 'Loading pins…' : `${pins.length} GPS pin${pins.length === 1 ? '' : 's'} live`}
          </span>
          {pins.slice(0, 3).map((p) => (
            <span key={p.id}>{p.vehicleReg}: {p.lastLat!.toFixed(3)}, {p.lastLng!.toFixed(3)}</span>
          ))}
        </div>
        <Card>
          <div className="grid px-3.5 py-2.5" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
            {['Vehicle', 'Driver', 'Status'].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
            ))}
          </div>
          {loading && fleet.length === 0 && (
            <p className="px-3.5 py-4 text-[12px]" style={{ color: '#7C8388' }}>Loading fleet…</p>
          )}
          {!loading && fleet.length === 0 && (
            <p className="px-3.5 py-4 text-[12px]" style={{ color: '#7C8388' }}>No vehicles registered for this operator.</p>
          )}
          {fleet.map((f) => (
            <div key={f.id} className="grid items-center px-3.5 py-[11px]" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 8, borderTop: '1px solid #E7EBEC', fontSize: 12 }}>
              <p className="font-semibold">{f.vehicleReg}</p>
              <p>{f.driverName}</p>
              <Badge variant={statusVariant(f.fleetStatus)}>{statusLabel(f.fleetStatus)}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
