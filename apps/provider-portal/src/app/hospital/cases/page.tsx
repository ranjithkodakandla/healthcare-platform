'use client';

// P-06: Case Management — F2 scoped view (consent-scoped, bed/triage-relevant
// events only, GT-07). Lists real cases held at this hospital (previously a fully
// static, fabricated mock) and lets staff add a walk-in case — a patient who
// arrived directly rather than through the citizen app's own emergency flow.

import { useCallback, useEffect, useState } from 'react';
import { Card, CardPadded } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { BED_CATEGORY_LABEL } from '@/lib/utils';
import type { BedCategory, CaseSeverity } from '@/lib/types';
import { providerApi, getSession, type CaseRow, type CaseTimelineEvent, ApiError } from '@/lib/api';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#C62E2E',
  URGENT: '#D98C0E',
  MODERATE: '#0B5C66',
  ROUTINE: '#7C8388',
};

const SEVERITIES: CaseSeverity[] = ['CRITICAL', 'URGENT', 'MODERATE', 'ROUTINE'];
const CATEGORIES = Object.keys(BED_CATEGORY_LABEL) as BedCategory[];

export default function CasesPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? '';

  const [cases, setCases] = useState<CaseRow[]>([]);
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [timeline, setTimeline] = useState<CaseTimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [severity, setSeverity] = useState<CaseSeverity>('URGENT');
  const [category, setCategory] = useState<BedCategory>(CATEGORIES[0]);
  const [patientName, setPatientName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const res = await providerApi.cases.list(hospitalId);
      setCases(res.data);
      setListError(null);
      if (res.data.length > 0) {
        setSelected((prev) => prev ?? res.data[0]);
      }
    } catch (err) {
      setListError(err instanceof ApiError ? 'Failed to load cases.' : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!selected || !hospitalId) return;
    setTimelineLoading(true);
    providerApi.cases.timeline(hospitalId, selected.caseId)
      .then((res) => setTimeline(res.data))
      .catch(() => setTimeline([]))
      .finally(() => setTimelineLoading(false));
  }, [selected, hospitalId]);

  function openAdd() {
    setSeverity('URGENT');
    setCategory(CATEGORIES[0]);
    setPatientName('');
    setFormError(null);
    setDialogOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await providerApi.cases.createWalkIn(hospitalId, { severity, category, patientName: patientName || undefined });
      setDialogOpen(false);
      await load();
    } catch {
      setFormError('Failed to add walk-in case. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Case Management</h1>
        <Button size="md" onClick={openAdd}>+ Add walk-in case</Button>
      </div>

      {listError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }}>{listError}</p>}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.6fr' }}>
        <Card>
          {loading ? (
            <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>Loading…</p>
          ) : cases.length === 0 ? (
            <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No cases held at this hospital yet.</p>
          ) : (
            cases.map((cs) => (
              <button
                key={cs.caseId}
                onClick={() => setSelected(cs)}
                className="w-full text-left p-4 cursor-pointer"
                style={{ borderBottom: '1px solid #E7EBEC', background: selected?.caseId === cs.caseId ? '#F3FBFC' : undefined }}
              >
                <div className="flex justify-between mb-1">
                  <p className="text-[13px] font-bold">{cs.caseNumber}</p>
                  <p className="text-[11px] font-bold" style={{ color: SEVERITY_COLORS[cs.severity ?? ''] ?? '#7C8388' }}>{cs.severity ?? '—'}</p>
                </div>
                <p className="text-[12px]" style={{ color: '#7C8388' }}>
                  {BED_CATEGORY_LABEL[cs.category] ?? cs.category} — {cs.holdStatus} · Case {cs.status}
                </p>
              </button>
            ))
          )}
        </Card>

        <CardPadded>
          {!selected ? (
            <p className="text-[13px]" style={{ color: '#7C8388' }}>Select a case to view its timeline.</p>
          ) : (
            <>
              <p className="text-[13px] font-bold mb-1">Case {selected.caseNumber} — Hospital-scoped Timeline</p>
              <p className="text-[11px] mb-4" style={{ color: '#7C8388' }}>Consent-scoped view — only bed/triage-relevant events shown (GT-07)</p>
              {timelineLoading ? (
                <p className="text-[13px]" style={{ color: '#7C8388' }}>Loading timeline…</p>
              ) : timeline.length === 0 ? (
                <p className="text-[13px]" style={{ color: '#7C8388' }}>No timeline events yet.</p>
              ) : (
                <div className="relative pl-[18px]">
                  <div className="absolute left-1 top-1 bottom-2.5 w-0.5" style={{ background: '#E7EBEC' }} />
                  {timeline.map((t) => (
                    <div key={t.id} className="relative pb-4">
                      <div className="absolute -left-[14px] top-[3px] w-2.5 h-2.5 rounded-full" style={{ background: '#0B5C66' }} />
                      <p className="text-[11px]" style={{ color: '#7C8388' }}>{new Date(t.createdAt).toLocaleTimeString()}</p>
                      <p className="text-[13px]" style={{ color: '#1A1D1F' }}>{t.type}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardPadded>
      </div>

      <Dialog open={dialogOpen} title="Add walk-in case" onClose={() => setDialogOpen(false)}>
        <form onSubmit={onSubmit}>
          <label htmlFor="case-severity" className="block text-[13px] font-semibold mb-1.5">Severity</label>
          <select id="case-severity" value={severity} onChange={(e) => setSeverity(e.target.value as CaseSeverity)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label htmlFor="case-category" className="block text-[13px] font-semibold mb-1.5">Bed category</label>
          <select id="case-category" value={category} onChange={(e) => setCategory(e.target.value as BedCategory)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-3.5" style={{ border: '1px solid #C7CDD0' }} disabled={submitting}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{BED_CATEGORY_LABEL[c]}</option>)}
          </select>

          <label htmlFor="case-patient" className="block text-[13px] font-semibold mb-1.5">Patient name (optional)</label>
          <input id="case-patient" value={patientName} onChange={(e) => setPatientName(e.target.value)} className="w-full h-11 rounded-[8px] px-3 text-[14px] outline-none mb-4" style={{ border: '1px solid #C7CDD0' }} disabled={submitting} />

          {formError && <p className="text-[12px] font-semibold mb-3" style={{ color: '#C62E2E' }} role="alert">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'Adding…' : 'Add walk-in case'}
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
