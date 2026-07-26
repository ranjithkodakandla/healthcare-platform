// P-17: Result Upload — FR-DIAGP-001

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

const RESULTS = [
  { test: 'CBC + Differential', orderedBy: 'Dr. Sharma', status: 'Ready to upload', statusV: 'warning' as const, actionLabel: 'Upload result' },
  { test: 'Troponin I', orderedBy: 'Dr. Mehta', status: 'Uploaded', statusV: 'success' as const, actionLabel: 'View' },
  { test: 'Chest X-Ray', orderedBy: 'Dr. Sharma', status: 'Pending', statusV: 'muted' as const, actionLabel: 'Upload result' },
  { test: 'Blood Culture', orderedBy: 'Dr. Nair', status: 'Processing', statusV: 'info' as const, actionLabel: 'Update' },
];

export default function ResultsPage() {
  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Result Upload</h1>
      <Card>
        <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Test', 'Ordered by', 'Status', 'Action'].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {RESULTS.map((d) => (
          <div key={d.test} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
            <p className="font-semibold">{d.test}</p>
            <p style={{ color: '#4A5054' }}>{d.orderedBy}</p>
            <Badge variant={d.statusV}>{d.status}</Badge>
            <p className="text-[12px] font-bold cursor-pointer" style={{ color: '#0B5C66' }}>{d.actionLabel}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
