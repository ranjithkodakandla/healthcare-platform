// P-06: Case Management — F2 scoped view (consent-scoped, bed/triage-relevant events only, GT-07)

import { Card, CardPadded } from '@/components/ui/Card';
import { SEVERITY_COLORS } from '@/lib/utils';

const CASES = [
  { id: 'case-1', name: 'CASE-88213 — Mohan D.', severity: 'CRITICAL', summary: 'ICU hold confirmed · Ambulance en route', bg: '#FFF5F5' },
  { id: 'case-2', name: 'CASE-88219 — Priya K.', severity: 'URGENT', summary: 'General bed — awaiting admissions', bg: '#FFFBF0' },
  { id: 'case-3', name: 'CASE-88228 — Suresh M.', severity: 'MODERATE', summary: 'Admitted · Monitoring', bg: '#F3FBFC' },
];

const TIMELINE = [
  { time: '14:32', text: 'ICU bed hold created (BED-001)', color: '#C62E2E' },
  { time: '14:33', text: 'Clinical Lead acknowledged hold', color: '#0B5C66' },
  { time: '14:35', text: 'Hold confirmed — CASE-88213 assigned', color: '#1E9E5C' },
  { time: '14:40', text: 'Ambulance KA-01-B dispatched', color: '#7C8388' },
];

export default function CasesPage() {
  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Case Management</h1>
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <Card>
          {CASES.map((cs) => (
            <div key={cs.id} className="p-4" style={{ borderBottom: '1px solid #E7EBEC', background: cs.bg }}>
              <div className="flex justify-between mb-1">
                <p className="text-[13px] font-bold">{cs.name}</p>
                <p className="text-[11px] font-bold" style={{ color: SEVERITY_COLORS[cs.severity] }}>{cs.severity}</p>
              </div>
              <p className="text-[12px]" style={{ color: '#7C8388' }}>{cs.summary}</p>
            </div>
          ))}
        </Card>

        <CardPadded>
          <p className="text-[13px] font-bold mb-1">Case CASE-88213 — Hospital-scoped Timeline</p>
          <p className="text-[11px] mb-4" style={{ color: '#7C8388' }}>Consent-scoped view — only bed/triage-relevant events shown (GT-07)</p>
          <div className="relative pl-[18px]">
            <div className="absolute left-1 top-1 bottom-2.5 w-0.5" style={{ background: '#E7EBEC' }} />
            {TIMELINE.map((t) => (
              <div key={t.time} className="relative pb-4">
                <div className="absolute -left-[14px] top-[3px] w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                <p className="text-[11px]" style={{ color: '#7C8388' }}>{t.time}</p>
                <p className="text-[13px]" style={{ color: '#1A1D1F' }}>{t.text}</p>
              </div>
            ))}
          </div>
        </CardPadded>
      </div>
    </div>
  );
}
