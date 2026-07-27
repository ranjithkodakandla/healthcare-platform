'use client';

// Hospital in-house Doctors department — full add/update/view/delete (P-10-style CRUD).
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { providerApi, getSession, type DoctorRow, ApiError } from '@/lib/api';

const SPECIALTIES = ['General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology', 'ENT', 'Dermatology', 'Gynecology', 'Emergency Medicine', 'Other'];

export default function DoctorsPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [doctors, setDoctors] = useState<DoctorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DoctorRow | null>(null);
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState(SPECIALTIES[0]);
  const [isTeleconsult, setIsTeleconsult] = useState(false);
  const [city, setCity] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.doctors.list(hospitalId);
      setDoctors(res.data);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load doctors.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setName('');
    setSpecialty(SPECIALTIES[0]);
    setIsTeleconsult(false);
    setCity('');
    setFormError(null);
    setDialogOpen(true);
  }

  function openEdit(d: DoctorRow) {
    setEditing(d);
    setName(d.name);
    setSpecialty(d.specialty);
    setIsTeleconsult(d.isTeleconsult);
    setCity(d.city ?? '');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Name is required');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) {
        await providerApi.doctors.update(hospitalId, editing.id, { name, specialty, isTeleconsult, city });
      } else {
        await providerApi.doctors.create(hospitalId, { name, specialty, isTeleconsult, city });
      }
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to save doctor. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(d: DoctorRow) {
    if (!window.confirm(`Remove Dr. ${d.name} from this hospital?`)) return;
    try {
      await providerApi.doctors.remove(hospitalId, d.id);
      await load();
    } catch {
      setListError('Failed to remove doctor. Please try again.');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Doctors</h1>
        <Button size="md" onClick={openAdd}>+ Add doctor</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1.5fr 1.3fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Name', 'Specialty', 'Teleconsult', 'City', ''].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
        ) : doctors.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No doctors added yet.</p>
        ) : (
          doctors.map((d) => (
            <div key={d.id} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1.5fr 1.3fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <p className="font-semibold">Dr. {d.name}</p>
              <p style={{ color: '#4A5054' }}>{d.specialty}</p>
              <Badge variant={d.isTeleconsult ? 'success' : 'muted'}>{d.isTeleconsult ? 'Yes' : 'No'}</Badge>
              <p style={{ color: '#7C8388' }}>{d.city ?? '—'}</p>
              <div className="flex gap-3">
                <button onClick={() => openEdit(d)} className="text-[12px] font-bold" style={{ color: '#0B5C66' }}>Edit</button>
                <button onClick={() => onDelete(d)} className="text-[12px] font-bold" style={{ color: '#C62E2E' }}>Delete</button>
              </div>
            </div>
          ))
        )}
      </Card>

      <Dialog open={dialogOpen} title={editing ? 'Edit doctor' : 'Add doctor'} onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="doc-name" className="block text-[13px] font-semibold mb-1.5">Full name</label>
          <input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label htmlFor="doc-specialty" className="block text-[13px] font-semibold mb-1.5">Specialty</label>
          <select id="doc-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label htmlFor="doc-city" className="block text-[13px] font-semibold mb-1.5">City</label>
          <input id="doc-city" value={city} onChange={(e) => setCity(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          <label className="flex items-center gap-2 mb-4 text-[13px] font-semibold">
            <input type="checkbox" checked={isTeleconsult} onChange={(e) => setIsTeleconsult(e.target.checked)} disabled={submitting} />
            Available for teleconsult
          </label>

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Saving…' : editing ? 'Save changes' : 'Add doctor'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
