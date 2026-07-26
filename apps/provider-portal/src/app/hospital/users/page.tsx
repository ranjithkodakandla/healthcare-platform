// P-10: User Management — F2, F3.6

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const STAFF = [
  { name: 'Dr. Anand Sharma', role: 'Hospital Clinical Lead', status: 'Active', statusVariant: 'success', lastActive: '2 min ago' },
  { name: 'Kavitha R.', role: 'Hospital Admissions Staff', status: 'Active', statusVariant: 'success', lastActive: '11 min ago' },
  { name: 'Ramesh P.', role: 'Finance / Insurance Desk', status: 'Active', statusVariant: 'success', lastActive: '1h ago' },
  { name: 'Sunita V.', role: 'Hospital Administrator', status: 'Inactive', statusVariant: 'muted', lastActive: '3d ago' },
] as const;

export default function UsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">User Management</h1>
        <Button size="md">+ Add user</Button>
      </div>
      <Card>
        <div className="grid px-[18px] py-3" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Name', 'Role', 'Status', 'Last active'].map((h) => (
            <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {STAFF.map((u) => (
          <div key={u.name} className="grid items-center px-[18px] py-3.5" style={{ gridTemplateColumns: '1.5fr 1.5fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
            <p className="font-semibold">{u.name}</p>
            <p style={{ color: '#4A5054' }}>{u.role}</p>
            <Badge variant={u.statusVariant}>{u.status}</Badge>
            <p style={{ color: '#7C8388', fontSize: 12 }}>{u.lastActive}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
