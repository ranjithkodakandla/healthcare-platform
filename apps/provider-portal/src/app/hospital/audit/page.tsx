'use client';

// P-12: Audit Logs — F2, GT-06. Immutable, exportable.
// Rows now come from the real audit trail (GET /v1/providers/:id/audit) instead of a
// hardcoded static array — the backend was already writing every mutation atomically
// (see bed-inventory.service.ts), only the portal's display of it was fake
// (PROVIDER_UAT_REPORT.md Finding #8).

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSession, providerApi, type AuditLogRow } from '@/lib/api';

const RESULT_COLOR = '#1E9E5C';

function toCsv(rows: AuditLogRow[]): string {
  const header = ['Timestamp', 'User', 'Action', 'Entity'];
  const lines = rows.map((r) => [r.createdAt, r.actor, r.action, `${r.entityType}/${r.entityId}`]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [header.join(','), ...lines].join('\n');
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const hospitalId = getSession()?.hospitalId;
    if (!hospitalId) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await providerApi.audit.list(hospitalId);
      setRows(res.data);
    } catch {
      setError('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Audit Logs</h1>
        <Button variant="ghost" size="sm" onClick={exportCsv} disabled={rows.length === 0}>Export CSV</Button>
      </div>
      <Card className="overflow-x-auto">
        <div className="grid px-4 py-2 min-w-[760px]" style={{ gridTemplateColumns: '1.4fr 1fr 1.4fr 1.2fr', gap: 10, background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}>
          {['Timestamp', 'User', 'Action', 'Entity'].map((h) => (
            <p key={h} className="text-[10px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>{h}</p>
          ))}
        </div>
        {loading ? (
          <div className="p-4"><div className="h-10 rounded bg-gray-100 animate-pulse" /></div>
        ) : error ? (
          <p className="p-4 text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-[13px]" style={{ color: '#7C8388' }}>No audit entries yet.</p>
        ) : (
          rows.map((a) => (
            <div key={a.id} className="grid items-center px-4 py-2.5 min-w-[760px]" style={{ gridTemplateColumns: '1.4fr 1fr 1.4fr 1.2fr', gap: 10, borderTop: '1px solid #E7EBEC', fontSize: 12 }}>
              <p style={{ color: '#7C8388' }}>{new Date(a.createdAt).toLocaleString()}</p>
              <p>{a.actor}</p>
              <p style={{ fontFamily: 'monospace', fontSize: 11 }}>{a.action}</p>
              <p className="font-semibold" style={{ color: RESULT_COLOR }}>{a.entityType}/{a.entityId}</p>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
