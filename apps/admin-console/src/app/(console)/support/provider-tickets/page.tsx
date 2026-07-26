'use client';

// A-19: Provider Issue Resolution — G5, FR-ADM-SUP-001.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type SupportTicket, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

const TABS = ['All', 'Hospital', 'Ambulance', 'Pharmacy', 'Blood Bank', 'Diagnostic', 'Insurance'];

function inferType(t: SupportTicket): string {
  const hay = `${t.entityRef ?? ''} ${t.requester} ${t.subject}`.toLowerCase();
  if (hay.includes('ambulance')) return 'Ambulance';
  if (hay.includes('pharmacy')) return 'Pharmacy';
  if (hay.includes('blood')) return 'Blood Bank';
  if (hay.includes('diagnostic') || hay.includes('lab')) return 'Diagnostic';
  if (hay.includes('insurance') || hay.includes('insurer')) return 'Insurance';
  return 'Hospital';
}

function statusVariant(s: string): 'warning' | 'info' | 'success' | 'neutral' {
  if (s === 'OPEN') return 'warning';
  if (s === 'IN_PROGRESS') return 'info';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'success';
  return 'neutral';
}

export default function ProviderTicketsPage() {
  const [tab, setTab] = useState('All');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.support.listTickets({ requesterType: 'PROVIDER' });
      setTickets(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load provider tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(
    () => (tab === 'All' ? tickets : tickets.filter((t) => inferType(t) === tab)),
    [tickets, tab],
  );

  return (
    <>
      <TopBar title="Provider Issue Resolution" screenId="A-19" ref_="G5, FR-ADM-SUP-001" slug="support/provider-tickets" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-md text-[12px] font-semibold border"
            style={{
              borderColor: tab === t ? '#0B5C66' : '#E7EBEC',
              background: tab === t ? '#DEF3F5' : '#fff',
              color: tab === t ? '#0B5C66' : '#4A5054',
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <Card padding="none">
        <ResponsiveTable><table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
              {['Provider', 'Subject', 'Type', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="px-4 py-6 text-[#7C8388]">Loading…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-[#7C8388]">No provider tickets</td></tr>}
            {filtered.map((t) => (
              <tr key={t.id} className="border-b border-[#E7EBEC]">
                <td className="px-4 py-3 font-semibold">{t.entityRef ?? t.requester}</td>
                <td className="px-4 py-3">{t.subject}</td>
                <td className="px-4 py-3 text-[#7C8388]">{inferType(t)}</td>
                <td className="px-4 py-3"><Badge variant={statusVariant(t.status)}>{t.status.replace(/_/g, ' ')}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/support/tickets/detail?id=${encodeURIComponent(t.id)}&from=provider`} className="text-[12px] font-bold text-[#0B5C66]">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table></ResponsiveTable>
      </Card>
    </>
  );
}
