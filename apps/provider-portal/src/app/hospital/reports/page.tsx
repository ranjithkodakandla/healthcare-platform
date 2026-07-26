'use client';

// P-07: Reports — F2, F3.5
// Reports are generated client-side from the real bed-inventory and audit-log APIs
// (no backend report-storage service exists yet) and downloaded immediately as CSV —
// replacing the previous fully-static mock catalogue/history where "Generate
// report"/"Download" had no handlers at all.

import { useState } from 'react';
import { Card, CardPadded } from '@/components/ui/Card';
import { getSession, providerApi, type AuditLogRow } from '@/lib/api';

interface ReportDef {
  name: string;
  desc: string;
  actions?: string[];
}

const REPORT_CATALOGUE: ReportDef[] = [
  { name: 'Bed Utilisation Summary', desc: 'Current occupancy by category, with staleness status.' },
  { name: 'Admissions Handoff Report', desc: 'All confirmed/declined holds with response-time SLA compliance.', actions: ['HOLD_CONFIRMED_BY_ADMISSIONS', 'HOLD_DECLINED_BY_ADMISSIONS'] },
  { name: 'Clinical Ack Audit Trail', desc: 'ICU/Vent acknowledgment log with timestamp and clinician.', actions: ['CLINICAL_ACK_COMPLETED'] },
];

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((line) => line.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function auditRowToCsv(r: AuditLogRow): string[] {
  return [r.createdAt, r.actor, r.action, `${r.entityType}/${r.entityId}`];
}

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [recent, setRecent] = useState<Array<{ name: string; date: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  async function generate(report: ReportDef) {
    const hospitalId = getSession()?.hospitalId;
    if (!hospitalId) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setGenerating(report.name);
    setError(null);
    try {
      if (report.name === 'Bed Utilisation Summary') {
        const { data } = await providerApi.beds.get(hospitalId);
        downloadCsv(
          `bed-utilisation-${hospitalId}.csv`,
          ['Category', 'Total', 'Available', 'Occupied', 'Staleness', 'Last updated'],
          data.map((r) => [r.category, String(r.totalCount), String(r.availableCount), String(r.occupiedCount), r.stalenessStatus, r.lastUpdatedAt]),
        );
      } else {
        const { data } = await providerApi.audit.list(hospitalId);
        const filtered = report.actions ? data.filter((r) => report.actions!.includes(r.action)) : data;
        downloadCsv(
          `${report.name.toLowerCase().replace(/\s+/g, '-')}-${hospitalId}.csv`,
          ['Timestamp', 'Actor', 'Action', 'Entity'],
          filtered.map(auditRowToCsv),
        );
      }
      setRecent((prev) => [{ name: report.name, date: new Date().toLocaleString() }, ...prev].slice(0, 5));
    } catch {
      setError(`Failed to generate "${report.name}". Please try again.`);
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Reports</h1>
      {error && (
        <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{error}</p>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {REPORT_CATALOGUE.map((r) => (
          <CardPadded key={r.name}>
            <p className="text-[13px] font-bold mb-1.5">{r.name}</p>
            <p className="text-[12px] mb-3.5" style={{ color: '#7C8388', lineHeight: 1.4 }}>{r.desc}</p>
            <button
              type="button"
              onClick={() => generate(r)}
              disabled={generating === r.name}
              className="h-11 w-full rounded-[6px] flex items-center justify-center text-[13px] font-bold hover:opacity-80 disabled:opacity-50"
              style={{ background: '#DEF3F5', color: '#0B5C66' }}
            >
              {generating === r.name ? 'Generating…' : 'Generate report'}
            </button>
          </CardPadded>
        ))}
      </div>
      <p className="text-[13px] font-bold mb-2.5">Recently generated (this session)</p>
      <Card>
        {recent.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No reports generated yet.</p>
        ) : (
          recent.map((rr, idx) => (
            <div key={`${rr.name}-${idx}`} className="flex justify-between items-center px-[18px] py-3" style={{ borderBottom: '1px solid #E7EBEC' }}>
              <p className="text-[13px]">{rr.name}</p>
              <p className="text-[12px]" style={{ color: '#7C8388' }}>{rr.date}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
