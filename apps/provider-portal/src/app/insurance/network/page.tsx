// P-19: Network Mapping Management — §F9.3

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const NETWORK = [
  { hospital: 'Apollo Hospitals, Bengaluru', zone: 'Zone 3 — South', status: 'In Network', sv: 'success' as const },
  { hospital: 'Manipal Hospital, MG Road', zone: 'Zone 3 — South', status: 'In Network', sv: 'success' as const },
  { hospital: 'Narayana Health, EC Road', zone: 'Zone 4 — East', status: 'Pending', sv: 'warning' as const },
  { hospital: 'BGS Gleneagles, Kengeri', zone: 'Zone 5 — West', status: 'Out of Network', sv: 'muted' as const },
];

export default function NetworkPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Network Mapping Management</h1>
        <div className="h-[38px] max-w-[220px] rounded-[8px] border flex items-center px-3 text-[12px]" style={{ borderColor: '#C7CDD0', color: '#7C8388' }}>
          Filter by zone…
        </div>
      </div>
      <Card>
        <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Hospital', 'Zone', 'Network status', 'Action'].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {NETWORK.map((n) => (
          <div key={n.hospital} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
            <p className="font-semibold">{n.hospital}</p>
            <p style={{ color: '#4A5054' }}>{n.zone}</p>
            <Badge variant={n.sv}>{n.status}</Badge>
            <p className="text-[12px] font-bold cursor-pointer" style={{ color: '#0B5C66' }}>Manage</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
