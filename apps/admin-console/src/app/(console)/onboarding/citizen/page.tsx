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

export default function CitizenOnboardingPage() {
  const [rows, setRows] = useState<CitizenOnboardingFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.citizenOnboarding.list();
      setRows(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

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

  return (
    <>
      <TopBar title="Citizen Onboarding Queue" screenId="A-03" ref_="G3, FR-ADM-CIT-001" slug="onboarding/citizen" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      <div className="mb-3 flex items-center gap-2">
        <Badge variant="warning">{rows.length} pending</Badge>
      </div>
      <Card padding="none">
        <ResponsiveTable><table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
              {['Account ID', 'Name', 'Issue', 'Flagged', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-6 text-[#7C8388]">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-[#7C8388]">No flagged accounts</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#E7EBEC]">
                <td className="px-4 py-3 font-mono text-[12px]">{r.accountRef}</td>
                <td className="px-4 py-3 font-semibold">{r.displayName}</td>
                <td className="px-4 py-3">{r.issueLabel}</td>
                <td className="px-4 py-3 text-[#7C8388]">{relTime(r.flaggedAt)}</td>
                <td className="px-4 py-3"><Badge variant={r.status === 'IN_REVIEW' ? 'info' : 'warning'}>{r.status.replace(/_/g, ' ')}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="secondary" disabled={busyId === r.id || r.status === 'IN_REVIEW'} onClick={() => void markReview(r.id)}>
                    Review
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table></ResponsiveTable>
      </Card>
    </>
  );
}
