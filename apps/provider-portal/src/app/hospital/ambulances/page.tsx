'use client';

// Hospital in-house Ambulance department — full add/update/view/delete.
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { providerApi, getSession, type FleetVehicle, ApiError } from '@/lib/api';

const VEHICLE_TYPES = ['BASIC_LIFE_SUPPORT', 'ADVANCED_LIFE_SUPPORT', 'PATIENT_TRANSPORT'];
const STATUSES = ['AVAILABLE', 'EN_ROUTE', 'MAINTENANCE', 'OFF_DUTY'];

export default function HospitalAmbulancesPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [fleet, setFleet] = useState<FleetVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [vehicleReg, setVehicleReg] = useState('');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [driverName, setDriverName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.fleet.list(hospitalId);
      setFleet(res.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load ambulances.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setVehicleReg('');
    setVehicleType(VEHICLE_TYPES[0]);
    setDriverName('');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleReg.trim()) {
      setFormError('Vehicle registration number is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await providerApi.fleet.create(hospitalId, { vehicleReg, vehicleType, driverName });
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to add vehicle. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onStatusChange(id: string, fleetStatus: string) {
    try {
      await providerApi.fleet.updateStatus(hospitalId, id, fleetStatus);
      await load();
    } catch {
      setListError('Failed to update status. Please try again.');
    }
  }

  async function onDelete(v: FleetVehicle) {
    if (!window.confirm(`Remove vehicle ${v.vehicleReg} from the fleet?`)) return;
    try {
      await providerApi.fleet.remove(hospitalId, v.id);
      await load();
    } catch {
      setListError('Failed to remove vehicle. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Ambulances</h1>
        <Button size="md" onClick={openAdd}>+ Add vehicle</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Vehicle', 'Driver', 'Type', 'Status', ''].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
        ) : fleet.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No ambulances added yet.</p>
        ) : (
          fleet.map((v) => (
            <div key={v.id} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1fr 1.2fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">{v.vehicleReg}</p>
              <p style={{ color: '#4A5054' }}>{v.driverName}</p>
              <p style={{ color: '#7C8388', fontSize: 12 }}>{v.vehicleType}</p>
              <select
                value={v.fleetStatus}
                onChange={(e) => onStatusChange(v.id, e.target.value)}
                className="h-9 rounded-[6px] px-2 text-[12px] outline-none"
                style={{ border: '1px solid #C7CDD0', width: 'fit-content' }}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div>
                <button onClick={() => onDelete(v)} className="text-[12px] font-bold" style={{ color: '#C62E2E' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={dialogOpen} title="Add vehicle" onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="amb-reg" className="block text-[13px] font-semibold mb-1.5">Vehicle registration</label>
          <input id="amb-reg" value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value)} placeholder="KA-01 AB 1234" className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label htmlFor="amb-type" className="block text-[13px] font-semibold mb-1.5">Vehicle type</label>
          <select id="amb-type" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <label htmlFor="amb-driver" className="block text-[13px] font-semibold mb-1.5">Driver name (optional)</label>
          <input id="amb-driver" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Adding…' : 'Add vehicle'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
