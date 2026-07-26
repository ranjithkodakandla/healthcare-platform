'use client';

// P-10: User Management — F2, F3.6

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { getSession, providerApi, ApiError } from '@/lib/api';

const HOSPITAL_PORTAL_ROLES = [
  { value: 'HOSPITAL_ADMINISTRATOR', label: 'Hospital Administrator' },
  { value: 'HOSPITAL_ADMISSIONS_STAFF', label: 'Hospital Admissions Staff' },
  { value: 'HOSPITAL_CLINICAL_LEAD', label: 'Hospital Clinical Lead' },
  { value: 'FINANCE_INSURANCE_DESK', label: 'Finance / Insurance Desk' },
] as const;

const SEED_STAFF = [
  { name: 'Dr. Anand Sharma', role: 'Hospital Clinical Lead', status: 'Active', statusVariant: 'success', lastActive: '2 min ago' },
  { name: 'Kavitha R.', role: 'Hospital Admissions Staff', status: 'Active', statusVariant: 'success', lastActive: '11 min ago' },
  { name: 'Ramesh P.', role: 'Finance / Insurance Desk', status: 'Active', statusVariant: 'success', lastActive: '1h ago' },
  { name: 'Sunita V.', role: 'Hospital Administrator', status: 'Inactive', statusVariant: 'muted', lastActive: '3d ago' },
] as const;

type StaffRow = {
  name: string;
  role: string;
  status: string;
  statusVariant: 'success' | 'muted';
  lastActive: string;
};

export default function UsersPage() {
  const [staff, setStaff] = useState<StaffRow[]>([...SEED_STAFF]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<(typeof HOSPITAL_PORTAL_ROLES)[number]['value']>('HOSPITAL_ADMISSIONS_STAFF');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);

  function closeDialog() {
    setDialogOpen(false);
    setName('');
    setEmail('');
    setRole('HOSPITAL_ADMISSIONS_STAFF');
    setError(null);
    setResetLink(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Name and work email are required');
      return;
    }
    const hospitalId = getSession()?.hospitalId;
    if (!hospitalId) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await providerApi.users.invite(hospitalId, { name, email, role });
      const roleLabel = HOSPITAL_PORTAL_ROLES.find((r) => r.value === data.role)?.label ?? data.role;
      setStaff((prev) => [
        { name: data.name, role: roleLabel, status: 'Active', statusVariant: 'success', lastActive: 'Just invited' },
        ...prev,
      ]);
      setResetLink(data.passwordResetLink);
    } catch (err) {
      setError(
        err instanceof ApiError && err.message.includes('PROVIDER_USER_EMAIL_EXISTS')
          ? `${email} is already registered.`
          : 'Failed to add user. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">User Management</h1>
        <Button size="md" onClick={() => setDialogOpen(true)}>+ Add user</Button>
      </div>
      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Name', 'Role', 'Status', 'Last active'].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {staff.map((u) => (
          <div key={u.name} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
            <p className="font-semibold">{u.name}</p>
            <p style={{ color: '#4A5054' }}>{u.role}</p>
            <Badge variant={u.statusVariant}>{u.status}</Badge>
            <p style={{ color: '#7C8388', fontSize: 12 }}>{u.lastActive}</p>
          </div>
        ))}
      </Card>

      <Dialog open={dialogOpen} title="Add user" onClose={closeDialog}>
        {resetLink ? (
          <div>
            <p className="text-[13px] mb-3" style={{ color: '#4A5054' }}>
              Account created. Share this link with them to set a password:
            </p>
            <p className="text-[12px] break-all rounded-[8px] p-2.5 mb-4" style={{ background: '#F2F4F5', color: '#1A1D1F' }}>
              {resetLink}
            </p>
            <Button onClick={closeDialog} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <label htmlFor="new-user-name" className="block text-[13px] font-semibold mb-1.5">Full name</label>
            <input
              id="new-user-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5"
              style={{ border: '1px solid #C7CDD0' }}
              disabled={submitting}
            />

            <label htmlFor="new-user-email" className="block text-[13px] font-semibold mb-1.5">Work email</label>
            <input
              id="new-user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5"
              style={{ border: '1px solid #C7CDD0' }}
              disabled={submitting}
            />

            <label htmlFor="new-user-role" className="block text-[13px] font-semibold mb-1.5">Role</label>
            <select
              id="new-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4"
              style={{ border: '1px solid #C7CDD0' }}
              disabled={submitting}
            >
              {HOSPITAL_PORTAL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            {error && (
              <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Adding…' : 'Add user'}
            </Button>
          </form>
        )}
      </Dialog>
    </div>
  );
}
