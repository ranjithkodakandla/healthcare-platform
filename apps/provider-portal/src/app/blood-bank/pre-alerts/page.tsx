'use client';

// P-16: Blood Pre-Alert Queue — FR-BLDP-001. AI Pre-Alerts vs Explicit Requests.
import { useCallback, useEffect, useState } from 'react';
import { CardPadded } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { providerApi, getSession, type BloodAlertRow, ApiError } from '@/lib/api';

export default function PreAlertsPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const providerId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [ai, setAi] = useState<BloodAlertRow[]>([]);
  const [explicit, setExplicit] = useState<BloodAlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acking, setAcking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await providerApi.blood.preAlerts(providerId);
      setAi(res.data.aiPreAlerts);
      setExplicit(res.data.explicitRequests);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load pre-alerts');
      }
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const acknowledge = async (alertId: string) => {
    setAcking(alertId);
    try {
      await providerApi.blood.acknowledge(providerId, alertId);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Acknowledge failed');
    } finally {
      setAcking(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold">Blood Pre-Alert Queue</h1>
        <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
      </div>

      {error && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#FBE3E3' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        </div>
      )}

      {loading && ai.length === 0 && explicit.length === 0 && (
        <p className="text-[13px]" style={{ color: '#7C8388' }}>Loading pre-alerts…</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[12px] font-bold uppercase text-[#0B5C66] tracking-[0.03em] mb-2">AI Pre-Alerts</p>
          {ai.length === 0 && !loading && (
            <p className="text-[12px]" style={{ color: '#7C8388' }}>No proactive alerts.</p>
          )}
          {ai.map((b) => (
            <CardPadded key={b.id} className="mb-2.5">
              <div className="flex justify-between mb-1">
                <p className="text-[13px] font-bold">{b.bloodGroup} · {b.units} units</p>
                <p className="text-[11px] font-bold" style={{ color: '#8A5A00' }}>Proactive</p>
              </div>
              <p className="text-[12px] mb-2" style={{ color: '#7C8388' }}>{b.reason}</p>
              <Button size="sm" variant="secondary" disabled={acking === b.id} onClick={() => acknowledge(b.id)}>
                {acking === b.id ? 'Ack…' : 'Acknowledge'}
              </Button>
            </CardPadded>
          ))}
        </div>
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.03em] mb-2" style={{ color: '#C62E2E' }}>Explicit Requests</p>
          {explicit.length === 0 && !loading && (
            <p className="text-[12px]" style={{ color: '#7C8388' }}>No explicit requests.</p>
          )}
          {explicit.map((b) => (
            <CardPadded key={b.id} className="mb-2.5">
              <div className="flex justify-between mb-1">
                <p className="text-[13px] font-bold">{b.bloodGroup} · {b.units} units</p>
                <p className="text-[11px] font-bold" style={{ color: '#C62E2E' }}>{b.urgency}</p>
              </div>
              <p className="text-[12px] mb-2" style={{ color: '#7C8388' }}>{b.reason}</p>
              <Button size="sm" disabled={acking === b.id} onClick={() => acknowledge(b.id)}>
                {acking === b.id ? 'Ack…' : 'Acknowledge'}
              </Button>
            </CardPadded>
          ))}
        </div>
      </div>
    </div>
  );
}
