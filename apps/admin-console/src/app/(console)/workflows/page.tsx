'use client';

// A-13: Workflow Management — G10.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type WorkflowDef, ApiError } from '@/lib/api';

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([]);
  const [selected, setSelected] = useState<WorkflowDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.workflows.list();
      setWorkflows(res.data);
      setSelected(res.data[0] ?? null);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load workflows');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <TopBar title="Workflow Management" screenId="A-13" ref_="G10" slug="workflows" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      {loading && <p className="text-[13px] text-[#7C8388]">Loading…</p>}
      <div className="flex gap-4">
        <div className="w-72 shrink-0 flex flex-col gap-2">
          {workflows.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setSelected(w)}
              className="text-left rounded-md border p-3"
              style={{
                borderColor: selected?.id === w.id ? '#0B5C66' : '#E7EBEC',
                background: selected?.id === w.id ? '#DEF3F5' : '#fff',
              }}
            >
              <div className="text-[13px] font-bold text-[#1A1D1F]">{w.name}</div>
              <div className="text-[11px] text-[#7C8388] mt-1">{w.stageCount} stages · {w.usage}</div>
              {w.immutable && <Badge variant="warning" className="mt-2">Immutable (G4)</Badge>}
            </button>
          ))}
        </div>
        <Card className="flex-1">
          {!selected && <p className="text-[13px] text-[#7C8388]">Select a workflow</p>}
          {selected && (
            <>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[16px] font-bold">{selected.name}</h2>
                <Badge variant={selected.active ? 'success' : 'neutral'}>{selected.active ? 'Active' : 'Inactive'}</Badge>
              </div>
              {selected.immutable && (
                <p className="text-[12px] text-[#8A5A00] bg-[#FBF0D9] rounded-md px-3 py-2 mb-3">
                  Provider Onboarding stages are enforced by `ProviderOnboardingService` (G4). Stage order cannot be edited here.
                </p>
              )}
              <ol className="space-y-2">
                {selected.stages.map((s) => (
                  <li key={s.num} className="flex gap-3 items-start border border-[#E7EBEC] rounded-md p-3">
                    <div className="w-7 h-7 rounded-full bg-[#DEF3F5] text-[#0B5C66] text-[12px] font-bold flex items-center justify-center shrink-0">
                      {s.num}
                    </div>
                    <div>
                      <div className="text-[13px] font-bold">{s.name}</div>
                      <div className="text-[12px] text-[#7C8388]">Gate: {s.gate}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
