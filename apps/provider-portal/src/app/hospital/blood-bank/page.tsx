'use client';

// Hospital in-house Blood Bank department — full add/update/view/delete on unit
// inventory (distinct from the independent-operator pre-alert triage queue).
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { providerApi, getSession, type BloodStockRow, ApiError } from '@/lib/api';

const BLOOD_GROUPS = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
const COMPONENTS = ['WHOLE_BLOOD', 'PLATELETS', 'PLASMA'];

export default function HospitalBloodBankPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [stock, setStock] = useState<BloodStockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [bloodGroup, setBloodGroup] = useState(BLOOD_GROUPS[0]);
  const [component, setComponent] = useState(COMPONENTS[0]);
  const [unitsAvailable, setUnitsAvailable] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.blood.stock(hospitalId);
      setStock(res.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load blood stock.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setBloodGroup(BLOOD_GROUPS[0]);
    setComponent(COMPONENTS[0]);
    setUnitsAvailable('');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const units = Number(unitsAvailable);
    if (Number.isNaN(units) || units < 0) {
      setFormError('Units available must be a non-negative number');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await providerApi.blood.createStock(hospitalId, { bloodGroup, component, unitsAvailable: units });
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to save. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onQuickUpdate(row: BloodStockRow, delta: number) {
    const next = Math.max(0, row.unitsAvailable + delta);
    try {
      await providerApi.blood.updateStock(hospitalId, row.id, next);
      await load();
    } catch {
      setListError('Failed to update units. Please try again.');
    }
  }

  async function onDelete(row: BloodStockRow) {
    if (!window.confirm(`Remove ${row.bloodGroup} ${row.component}?`)) return;
    try {
      await providerApi.blood.removeStock(hospitalId, row.id);
      await load();
    } catch {
      setListError('Failed to remove item. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Blood Bank</h1>
        <Button size="md" onClick={openAdd}>+ Add stock</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1fr 1.3fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Group', 'Component', 'Units', ''].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
        ) : stock.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No blood stock added yet.</p>
        ) : (
          stock.map((row) => (
            <div key={row.id} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1fr 1.3fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">{row.bloodGroup}</p>
              <p style={{ color: '#4A5054' }}>{row.component}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => onQuickUpdate(row, -1)} className="w-8 h-8 rounded-[6px] font-bold" style={{ background: '#F2F4F5' }}>–</button>
                <span className="w-6 text-center font-bold">{row.unitsAvailable}</span>
                <button onClick={() => onQuickUpdate(row, +1)} className="w-8 h-8 rounded-[6px] font-bold" style={{ background: '#F2F4F5' }}>+</button>
              </div>
              <div>
                <button onClick={() => onDelete(row)} className="text-[12px] font-bold" style={{ color: '#C62E2E' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={dialogOpen} title="Add blood stock" onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="blood-group" className="block text-[13px] font-semibold mb-1.5">Blood group</label>
          <select id="blood-group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <label htmlFor="blood-component" className="block text-[13px] font-semibold mb-1.5">Component</label>
          <select id="blood-component" value={component} onChange={(e) => setComponent(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {COMPONENTS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label htmlFor="blood-units" className="block text-[13px] font-semibold mb-1.5">Units available</label>
          <input id="blood-units" type="number" min={0} value={unitsAvailable} onChange={(e) => setUnitsAvailable(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : 'Add stock'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
