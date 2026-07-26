'use client';

// A-09: Issue Tracking Board — G7.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type PlatformIssue, ApiError } from '@/lib/api';

const COLUMNS = ['OPEN', 'IN_PROGRESS', 'BLOCKED', 'RESOLVED'] as const;
const COL_LABEL: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  RESOLVED: 'Resolved',
};
const COL_COLOR: Record<string, string> = {
  OPEN: '#C62E2E',
  IN_PROGRESS: '#0B5C66',
  BLOCKED: '#7C8388',
  RESOLVED: '#0E6B3A',
};

function catLabel(c: string): string {
  return c.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
}

function sevVariant(sev: string, status: string): 'danger' | 'warning' | 'info' | 'neutral' | 'success' {
  if (status === 'RESOLVED') return 'success';
  if (sev === 'HIGH') return 'danger';
  if (sev === 'MED') return 'warning';
  if (status === 'BLOCKED') return 'neutral';
  return 'info';
}

export default function IssueBoardPage() {
  const [issues, setIssues] = useState<PlatformIssue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.issues.list();
      setIssues(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const byColumn = useMemo(() => {
    const map: Record<string, PlatformIssue[]> = {};
    for (const col of COLUMNS) map[col] = [];
    for (const issue of issues) {
      const col = COLUMNS.includes(issue.status as typeof COLUMNS[number]) ? issue.status : 'OPEN';
      map[col].push(issue);
    }
    return map;
  }, [issues]);

  const move = async (issue: PlatformIssue, status: string) => {
    try {
      await adminApi.issues.updateStatus(issue.id, status);
      setIssues((prev) => prev.map((i) => (i.id === issue.id ? { ...i, status } : i)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Move failed');
    }
  };

  return (
    <>
      <TopBar title="Issue Tracking Board" screenId="A-09" ref_="G7" slug="issues/board" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-[#7C8388]">Loading board…</div>
      ) : (
        <div className="stat-grid">
          {COLUMNS.map((col) => (
            <div key={col} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-bold uppercase tracking-wider" style={{ color: COL_COLOR[col] }}>
                  {COL_LABEL[col]}
                </span>
                <span className="text-[11px] text-[#7C8388] font-semibold bg-[#F2F4F5] px-2 py-0.5 rounded-full">
                  {byColumn[col].length}
                </span>
              </div>
              {byColumn[col].map((card) => (
                <Card key={card.id} padding="sm" className="cursor-pointer hover:shadow-sm transition-shadow">
                  <div className="text-[12px] font-mono text-[#7C8388] mb-1">{card.issueNumber}</div>
                  <div className="text-[13px] font-medium text-[#1A1D1F] mb-2 leading-snug">{card.title}</div>
                  <Badge variant={sevVariant(card.severity, card.status)}>{catLabel(card.category)}</Badge>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {COLUMNS.filter((c) => c !== col).map((target) => (
                      <button
                        key={target}
                        onClick={() => move(card, target)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-[#F2F4F5] text-[#4A5054] hover:bg-[#E7EBEC]"
                      >
                        → {COL_LABEL[target]}
                      </button>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
