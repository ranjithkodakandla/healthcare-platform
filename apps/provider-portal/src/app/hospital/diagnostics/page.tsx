'use client';

// Hospital in-house Diagnostics department — full add/update/view/delete.
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { providerApi, getSession, type DiagnosticOfferingRow, ApiError } from '@/lib/api';

export default function DiagnosticsPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [offerings, setOfferings] = useState<DiagnosticOfferingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DiagnosticOfferingRow | null>(null);
  const [testName, setTestName] = useState('');
  const [priceInr, setPriceInr] = useState('');
  const [city, setCity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.diagnostics.list(hospitalId);
      setOfferings(res.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load diagnostic offerings.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setTestName('');
    setPriceInr('');
    setCity('');
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(o: DiagnosticOfferingRow) {
    setEditing(o);
    setTestName(o.testName);
    setPriceInr(String(o.priceInr));
    setCity(o.city ?? '');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(priceInr);
    if (!testName.trim() || Number.isNaN(price) || price < 0) {
      setFormError('Test name and a valid non-negative price are required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await providerApi.diagnostics.update(hospitalId, editing.id, { testName, priceInr: price, city });
      } else {
        await providerApi.diagnostics.create(hospitalId, { testName, priceInr: price, city });
      }
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to save offering. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(o: DiagnosticOfferingRow) {
    if (!window.confirm(`Remove "${o.testName}"?`)) return;
    try {
      await providerApi.diagnostics.remove(hospitalId, o.id);
      await load();
    } catch {
      setListError('Failed to remove offering. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Diagnostic Offerings</h1>
        <Button size="md" onClick={openAdd}>+ Add offering</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Test', 'Price (₹)', 'City', ''].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
        ) : offerings.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No diagnostic offerings added yet.</p>
        ) : (
          offerings.map((o) => (
            <div key={o.id} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">{o.testName}</p>
              <p style={{ color: '#4A5054' }}>₹{o.priceInr.toLocaleString('en-IN')}</p>
              <p style={{ color: '#7C8388' }}>{o.city ?? '—'}</p>
              <div className="flex gap-3">
                <button onClick={() => openEdit(o)} className="text-[12px] font-bold" style={{ color: '#0B5C66' }}>Edit</button>
                <button onClick={() => onDelete(o)} className="text-[12px] font-bold" style={{ color: '#C62E2E' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={dialogOpen} title={editing ? 'Edit offering' : 'Add offering'} onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="diag-test" className="block text-[13px] font-semibold mb-1.5">Test name</label>
          <input id="diag-test" value={testName} onChange={(e) => setTestName(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label htmlFor="diag-price" className="block text-[13px] font-semibold mb-1.5">Price (₹)</label>
          <input id="diag-price" type="number" min={0} value={priceInr} onChange={(e) => setPriceInr(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label htmlFor="diag-city" className="block text-[13px] font-semibold mb-1.5">City</label>
          <input id="diag-city" value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add offering'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
