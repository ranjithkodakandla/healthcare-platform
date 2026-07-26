// P-12: Audit Logs — F2, GT-06. Immutable, exportable.

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const ROWS = [
  { time: '14:33:04', user: 'Dr. Sharma', action: 'CLINICAL_ACK_COMPLETED', entity: 'Hold/hold-001', result: 'OK', resultColor: '#1E9E5C' },
  { time: '14:32:18', user: 'Kavitha R.', action: 'HOLD_CONFIRMED_BY_ADMISSIONS', entity: 'Hold/hold-002', result: 'OK', resultColor: '#1E9E5C' },
  { time: '14:29:55', user: 'Kavitha R.', action: 'BED_INVENTORY_UPDATED', entity: 'Inventory/hosp-001', result: 'OK', resultColor: '#1E9E5C' },
  { time: '14:15:02', user: 'System', action: 'BED_INVENTORY_STALE', entity: 'Inventory/hosp-001', result: 'WARN', resultColor: '#D98C0E' },
  { time: '13:58:44', user: 'Kavitha R.', action: 'HOLD_DECLINED_BY_ADMISSIONS', entity: 'Hold/hold-003', result: 'OK', resultColor: '#1E9E5C' },
];

export default function AuditPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Audit Logs</h1>
        <Button variant="ghost" size="sm">Export CSV</Button>
      </div>
      <Card className="overflow-x-auto">
        <div className="grid px-4 py-2 min-w-[760px]" style={{ gridTemplateColumns: '1.2fr 1fr 1.4fr 1.2fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Timestamp', 'User', 'Action', 'Entity', 'Result'].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {ROWS.map((a) => (
          <div key={a.time + a.action} className="grid items-center px-4 py-2.5 min-w-[760px]" style={{ gridTemplateColumns: '1.2fr 1fr 1.4fr 1.2fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 12 }}>
            <p style={{ color: '#7C8388' }}>{a.time}</p>
            <p>{a.user}</p>
            <p style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.action}</p>
            <p style={{ color: '#4A5054' }}>{a.entity}</p>
            <p className="font-semibold" style={{ color: a.resultColor }}>{a.result}</p>
          </div>
        ))}
      </Card>
    </div>
  );
}
