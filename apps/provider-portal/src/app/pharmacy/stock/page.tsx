'use client';

// P-15: Medicine Stock Update — FR-PHRP-001 / FR-PHR-009
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { providerApi, getSession, type PharmacyStockRow, ApiError } from '@/lib/api';

const FLAG_COLOR: Record<string, string> = {
  OK: '#1E9E5C',
  Low: '#D98C0E',
  Critical: '#C62E2E',
};

export default function StockPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const providerId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [rows, setRows] = useState<PharmacyStockRow[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await providerApi.pharmacy.stock(providerId, q || undefined);
      setRows(res.data);
      const next: Record<string, number> = {};
      for (const r of res.data) next[r.medicineName] = r.stockCount;
      setDraft(next);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load stock');
      }
    } finally {
      setLoading(false);
    }
  }, [providerId, q]);

  useEffect(() => { load(); }, [load]);

  const dirty = useMemo(
    () => rows.some((r) => draft[r.medicineName] !== r.stockCount),
    [rows, draft],
  );

  const bump = (name: string, delta: number) => {
    setDraft((prev) => ({ ...prev, [name]: Math.max(0, (prev[name] ?? 0) + delta) }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updates = rows
        .filter((r) => draft[r.medicineName] !== r.stockCount)
        .map((r) => ({ medicineName: r.medicineName, stockCount: draft[r.medicineName] ?? r.stockCount }));
      if (updates.length === 0) return;
      const res = await providerApi.pharmacy.updateStock(providerId, updates);
      setRows(res.data);
      const next: Record<string, number> = {};
      for (const r of res.data) next[r.medicineName] = r.stockCount;
      setDraft(next);
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-[20px] font-bold">Medicine Stock Update</h1>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
        </Button>
      </div>

      {error && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#FBE3E3' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search medicines…"
        className="h-10 max-w-[360px] rounded-[8px] px-3 text-[13px] mb-4 w-full"
        style={{ border: '1px solid #C7CDD0', color: '#1A1D1F' }}
      />

      <Card>
        <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Medicine', 'Category', 'Stock', 'Flag'].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading && <p className="px-4 py-4 text-[13px]" style={{ color: '#7C8388' }}>Loading stock…</p>}
        {!loading && rows.length === 0 && (
          <p className="px-4 py-4 text-[13px]" style={{ color: '#7C8388' }}>No medicines found.</p>
        )}
        {rows.map((m) => {
          const count = draft[m.medicineName] ?? m.stockCount;
          const displayFlag = count <= 3 ? 'Critical' : count <= 10 ? 'Low' : 'OK';
          return (
            <div key={m.id} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">{m.medicineName}</p>
              <p style={{ color: '#4A5054' }}>{m.category}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => bump(m.medicineName, -1)} className="w-[22px] h-[22px] rounded-[5px] font-bold flex items-center justify-center" style={{ background: '#F2F4F5', color: '#4A5054' }}>–</button>
                <span className="font-bold w-[26px] text-center">{count}</span>
                <button onClick={() => bump(m.medicineName, +1)} className="w-[22px] h-[22px] rounded-[5px] font-bold flex items-center justify-center" style={{ background: '#F2F4F5', color: '#4A5054' }}>+</button>
              </div>
              <p className="text-[11px] font-bold" style={{ color: FLAG_COLOR[displayFlag] }}>{displayFlag}</p>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
