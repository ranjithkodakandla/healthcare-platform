// P-07: Reports — F2, F3.5

import { Card, CardPadded } from '@/components/ui/Card';

const REPORT_CATALOGUE = [
  { name: 'Bed Utilisation Summary', desc: 'Daily/weekly occupancy by category with trend lines.' },
  { name: 'Admissions Handoff Report', desc: 'All confirmed holds with response-time SLA compliance.' },
  { name: 'Clinical Ack Audit Trail', desc: 'ICU/Vent acknowledgment log with timestamp and clinician.' },
];

const RECENT = [
  { name: 'Bed Utilisation — July 24', date: 'Jul 24, 2026 · 11:00 AM' },
  { name: 'Admissions Handoff — July 23', date: 'Jul 23, 2026 · 09:30 AM' },
  { name: 'Clinical Ack Audit — July 22', date: 'Jul 22, 2026 · 08:15 AM' },
];

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Reports</h1>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {REPORT_CATALOGUE.map((r) => (
          <CardPadded key={r.name}>
            <p className="text-[13px] font-bold mb-1.5">{r.name}</p>
            <p className="text-[12px] mb-3.5" style={{ color: '#7C8388', lineHeight: 1.4 }}>{r.desc}</p>
            <button
              type="button"
              className="h-11 w-full rounded-[6px] flex items-center justify-center text-[13px] font-bold hover:opacity-80"
              style={{ background: '#DEF3F5', color: '#0B5C66' }}
            >
              Generate report
            </button>
          </CardPadded>
        ))}
      </div>
      <p className="text-[13px] font-bold mb-2.5">Recently generated</p>
      <Card>
        {RECENT.map((rr) => (
          <div key={rr.name} className="flex justify-between items-center px-[18px] py-3" style={{ borderBottom: '1px solid #E7EBEC' }}>
            <p className="text-[13px]">{rr.name}</p>
            <p className="text-[12px]" style={{ color: '#7C8388' }}>{rr.date}</p>
            <button type="button" className="text-[13px] font-semibold min-h-11 px-2" style={{ color: '#0B5C66' }}>
              Download
            </button>
          </div>
        ))}
      </Card>
    </div>
  );
}
