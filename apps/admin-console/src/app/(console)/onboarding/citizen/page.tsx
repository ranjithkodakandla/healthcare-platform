'use client';

// A-03: Citizen Onboarding Queue — G3, FR-ADM-CIT-001.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, type CitizenOnboardingFlag, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

function relTime(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const EVIDENCE: Record<string, string> = {
  DUPLICATE_ACCOUNT:
    'Two accounts share matching identity signals (phone / ABHA / device). Review which account should remain primary.',
  FAMILY_LINKAGE:
    'Conflicting caregiver linkage claims for the same patient. Confirm legitimate relationship before approving.',
  ABHA_MISMATCH:
    'ABHA number does not match the registered demographic profile. Verify with citizen-provided ID evidence.',
  OTHER: 'Manual review required. Capture resolution notes before clearing the flag.',
};

export default function CitizenOnboardingPage() {
  const [rows, setRows] = useState<CitizenOnboardingFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await adminApi.citizenOnboarding.list();
      setRows(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) return;
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  async function markReview(id: string) {
    setBusyId(id);
    try {
      await adminApi.citizenOnboarding.update(id, 'IN_REVIEW');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function resolve(resolution: 'CLEARED' | 'MERGED' | 'DISMISSED') {
    if (!selected) return;
    if (!notes.trim()) {
      setError('Resolution notes are required');
      return;
    }
    setBusyId(selected.id);
    setError(null);
    try {
      await adminApi.citizenOnboarding.update(selected.id, 'RESOLVED', notes.trim(), resolution);
      setSelectedId(null);
      setNotes('');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Resolve failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <TopBar title="Citizen Onboarding Queue" screenId="A-03" ref_="G3, FR-ADM-CIT-001" slug="onboarding/citizen" />

      {/* ── Page-level instruction text ── */}
      <p className="text-[13px] text-[#7C8388] mb-3">
        Open a flag to review evidence and resolve (clear / merge / dismiss) per FR-ADM-CIT-001.
      </p>

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}

      <div className="mb-3 flex items-center gap-2">
        <Badge variant="warning">{rows.length} pending</Badge>
      </div>

      {/* ── Queue table — full width, max-height 400px with vertical scroll ── */}
      <Card padding="none" className="mb-6">
        <ResponsiveTable>
          {/* Scrollable table body */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                  {['Account ID', 'Name', 'Issue', 'Flagged', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-[#7C8388]">Loading…</td>
                  </tr>
                )}
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-[#7C8388]">No flagged accounts</td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-[#E7EBEC] hover:bg-[#FAFBFB] transition-colors"
                    style={selectedId === r.id ? { background: '#F0FAF9' } : undefined}
                  >
                    <td className="px-4 py-3 font-mono text-[12px] whitespace-nowrap">{r.accountRef}</td>
                    <td className="px-4 py-3 font-semibold whitespace-nowrap">{r.displayName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.issueLabel}</td>
                    <td className="px-4 py-3 text-[#7C8388] whitespace-nowrap">{relTime(r.flaggedAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={r.status === 'IN_REVIEW' ? 'info' : 'warning'}>
                        {r.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setSelectedId(r.id); setNotes(r.notes ?? ''); }}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busyId === r.id || r.status === 'IN_REVIEW'}
                        onClick={() => void markReview(r.id)}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ResponsiveTable>
      </Card>

      {/* ── Case detail panel — always visible below the table ── */}
      {!selected ? (
        <Card padding="md">
          <p className="text-[13px] text-[#7C8388]">
            Select a flagged account above to review evidence and resolve (clear / merge / dismiss) per FR-ADM-CIT-001.
          </p>
        </Card>
      ) : (
        <Card padding="md">
          <div className="flex items-start justify-between mb-1">
            <div className="text-[15px] font-bold text-[#1A1D1F]">{selected.displayName}</div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setSelectedId(null); setNotes(''); }}
            >
              ✕ Close
            </Button>
          </div>
          <div className="text-[12px] text-[#7C8388] font-mono mb-3">{selected.accountRef}</div>

          <div className="grid grid-cols-3 gap-6">
            {/* Left: evidence */}
            <div className="col-span-2 space-y-3">
              <div>
                <Badge variant="warning">{selected.issueLabel}</Badge>
              </div>
              <div>
                <div className="text-[12px] font-semibold text-[#1A1D1F] mb-1">Evidence</div>
                <p className="text-[13px] text-[#4A5054]">
                  {EVIDENCE[selected.issue] ?? EVIDENCE.OTHER}
                </p>
              </div>
              {selected.notes && (
                <div className="rounded-md px-3 py-2 text-[12px] text-[#4A5054]" style={{ background: '#F2F4F5' }}>
                  Prior notes: {selected.notes}
                </div>
              )}
              <div>
                <label className="block text-[11px] text-[#7C8388] font-medium mb-1" htmlFor="cit-notes">
                  Resolution notes (required)
                </label>
                <textarea
                  id="cit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-[#E7EBEC] text-[13px]"
                  placeholder="Describe the decision and evidence used…"
                />
              </div>
            </div>

            {/* Right: resolution actions */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="text-[11px] font-semibold text-[#7C8388] uppercase tracking-wide mb-1">
                Resolution
              </div>
              <Button size="sm" disabled={busyId === selected.id} onClick={() => void resolve('CLEARED')}>
                Clear flag (legitimate)
              </Button>
              <Button size="sm" variant="secondary" disabled={busyId === selected.id} onClick={() => void resolve('MERGED')}>
                Merge accounts & clear
              </Button>
              <Button size="sm" variant="outline" disabled={busyId === selected.id} onClick={() => void resolve('DISMISSED')}>
                Dismiss as false positive
              </Button>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
