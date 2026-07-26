// P-18: Pre-Auth Review Queue — FR-INSP-001

import { Card, CardPadded } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

const QUEUE = [
  { caseName: 'CASE-77410', procedure: 'Cardiac catheterization', amount: '₹1,85,000', status: 'Pending review', sv: 'warning' as const },
  { caseName: 'CASE-77392', procedure: 'Knee replacement', amount: '₹2,40,000', status: 'Approved', sv: 'success' as const },
  { caseName: 'CASE-77381', procedure: 'Appendectomy', amount: '₹75,000', status: 'Info requested', sv: 'info' as const },
];

export default function PreAuthPage() {
  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Pre-Auth Review Queue</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <Card>
          <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
            {['Case / Procedure', 'Amount', 'Status'].map((h) => (
              <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
            ))}
          </div>
          {QUEUE.map((p) => (
            <div key={p.caseName} className="grid items-center px-4 py-3" style={{ gridTemplateColumns: '1.4fr 1fr 1fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 13 }}>
              <div>
                <p className="font-semibold">{p.caseName}</p>
                <p className="text-[11px]" style={{ color: '#7C8388' }}>{p.procedure}</p>
              </div>
              <p className="font-semibold">{p.amount}</p>
              <Badge variant={p.sv}>{p.status}</Badge>
            </div>
          ))}
        </Card>

        <CardPadded>
          <p className="text-[13px] font-bold mb-3">Review — CASE-77410</p>
          <p className="text-[12px] mb-3.5" style={{ color: '#7C8388' }}>Cardiac catheterization · ₹1,85,000 requested</p>
          <div className="flex flex-col gap-2">
            <Button variant="success" size="md" className="w-full" style={{ background: '#1E9E5C', borderRadius: 8 }}>Approve</Button>
            <Button variant="warning" size="md" className="w-full">Partially approve</Button>
            <Button variant="ghost" size="md" className="w-full">Request more info</Button>
            <Button variant="danger" size="md" className="w-full">Deny</Button>
          </div>
        </CardPadded>
      </div>
    </div>
  );
}
