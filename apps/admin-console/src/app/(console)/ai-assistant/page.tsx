'use client';

// A-17: AI Operations Assistant — G14.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, type AiOpsAssistant, ApiError } from '@/lib/api';

export default function AiAssistantPage() {
  const [data, setData] = useState<AiOpsAssistant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.ai.opsAssistant();
      setData(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load AI ops');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function act(id: string, kind: 'approve' | 'dismiss') {
    setBusyId(id);
    try {
      if (kind === 'approve') await adminApi.ai.approveSuggestion(id);
      else await adminApi.ai.dismissSuggestion(id);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  const pending = data?.suggestions.filter((s) => s.status === 'PENDING') ?? [];

  return (
    <>
      <TopBar title="AI Operations Assistant" screenId="A-17" ref_="G14" slug="ai-assistant" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      {loading && <p className="text-[13px] text-[#7C8388]">Loading…</p>}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#7C8388] mb-3">Anomaly signals</div>
            <ul className="space-y-2">
              {data.anomalies.length === 0 && <li className="text-[13px] text-[#7C8388]">No active incidents</li>}
              {data.anomalies.map((a) => (
                <li key={a.id} className="text-[13px] flex gap-2">
                  <Badge variant={a.variant === 'danger' ? 'danger' : 'warning'}>{a.variant}</Badge>
                  <span>{a.text}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#7C8388] mb-3">AI platform status</div>
            <ul className="space-y-2">
              {data.status.map((s) => (
                <li key={s.label} className="flex justify-between text-[13px]">
                  <span className="text-[#4A5054]">{s.label}</span>
                  <Badge variant={s.variant === 'success' ? 'success' : s.variant === 'danger' ? 'danger' : 'warning'}>
                    {s.value}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <div className="text-[12px] font-bold uppercase tracking-wider text-[#7C8388] mb-3">Suggested actions</div>
            <ul className="space-y-3">
              {pending.length === 0 && <li className="text-[13px] text-[#7C8388]">No pending suggestions</li>}
              {pending.map((s) => (
                <li key={s.id} className="border border-[#E7EBEC] rounded-md p-3">
                  <div className="text-[13px] font-semibold mb-1">{s.action}</div>
                  <div className="text-[11px] text-[#7C8388] mb-2">
                    Confidence {(s.confidence * 100).toFixed(0)}% · {s.source}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === s.id} onClick={() => void act(s.id, 'approve')}>Approve</Button>
                    <Button size="sm" variant="secondary" disabled={busyId === s.id} onClick={() => void act(s.id, 'dismiss')}>Dismiss</Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
