'use client';

// Hospital in-house Pharmacy department — full add/update/view/delete.
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { providerApi, getSession, type PharmacyStockRow, ApiError } from '@/lib/api';

function flagVariant(flag: string): 'success' | 'warning' | 'danger' {
  if (flag === 'Critical') return 'danger';
  if (flag === 'Low') return 'warning';
  return 'success';
}

export default function HospitalPharmacyPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [stock, setStock] = useState<PharmacyStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [medicineName, setMedicineName] = useState('');
  const [stockCount, setStockCount] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.pharmacy.stock(hospitalId);
      setStock(res.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load pharmacy stock.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setMedicineName('');
    setStockCount('');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const count = Number(stockCount);
    if (!medicineName.trim() || Number.isNaN(count) || count < 0) {
      setFormError('Medicine name and a valid non-negative stock count are required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      // PUT upserts by medicineName — this both adds new items and lets an
      // operator "add" a medicine that already exists (bumps its count).
      await providerApi.pharmacy.updateStock(hospitalId, [{ medicineName, stockCount: count }]);
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to save item. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onQuickUpdate(row: PharmacyStockRow, delta: number) {
    const next = Math.max(0, row.stockCount + delta);
    try {
      await providerApi.pharmacy.updateStock(hospitalId, [{ medicineName: row.medicineName, stockCount: next }]);
      await load();
    } catch {
      setListError('Failed to update stock. Please try again.');
    }
  }

  async function onDelete(row: PharmacyStockRow) {
    if (!window.confirm(`Remove "${row.medicineName}" from stock?`)) return;
    try {
      await providerApi.pharmacy.removeItem(hospitalId, row.id);
      await load();
    } catch {
      setListError('Failed to remove item. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Pharmacy</h1>
        <Button size="md" onClick={openAdd}>+ Add medicine</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Medicine', 'Stock', 'Flag', ''].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
        ) : stock.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No medicines added yet.</p>
        ) : (
          stock.map((row) => (
            <div key={row.id} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">{row.medicineName}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onQuickUpdate(row, -1)} className="w-8 h-8 rounded-[6px] font-bold" style={{ background: '#F2F4F5' }}>–</button>
                <span className="w-6 text-center font-bold">{row.stockCount}</span>
                <button onClick={() => onQuickUpdate(row, +1)} className="w-8 h-8 rounded-[6px] font-bold" style={{ background: '#F2F4F5' }}>+</button>
              </div>
              <Badge variant={flagVariant(row.flag)}>{row.flag}</Badge>
              <div>
                <button onClick={() => onDelete(row)} className="text-[12px] font-bold" style={{ color: '#C62E2E' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={dialogOpen} title="Add medicine" onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="pharm-name" className="block text-[13px] font-semibold mb-1.5">Medicine name</label>
          <input id="pharm-name" value={medicineName} onChange={(e) => setMedicineName(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label htmlFor="pharm-count" className="block text-[13px] font-semibold mb-1.5">Stock count</label>
          <input id="pharm-count" type="number" min={0} value={stockCount} onChange={(e) => setStockCount(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Add medicine'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
