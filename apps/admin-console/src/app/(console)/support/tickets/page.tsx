'use client';

// A-06: Support Ticket Queue — G5.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, type SupportTicket, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

function prioVariant(p: string): 'danger' | 'warning' | 'info' {
  if (p === 'HIGH') return 'danger';
  if (p === 'LOW') return 'info';
  return 'warning';
}

function statusVariant(s: string): 'warning' | 'info' | 'success' | 'neutral' {
  if (s === 'OPEN') return 'warning';
  if (s === 'IN_PROGRESS') return 'info';
  if (s === 'RESOLVED' || s === 'CLOSED') return 'success';
  return 'neutral';
}

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.support.listTickets();
      setTickets(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleNew = async () => {
    setCreating(true);
    try {
      await adminApi.support.createTicket({
        requester: 'Console staff',
        requesterType: 'CITIZEN',
        subject: 'New ticket from Admin Console',
        priority: 'MED',
        body: 'Created via A-06 New ticket action.',
      });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TopBar
        title="Support Ticket Queue"
        screenId="A-06"
        ref_="G5"
        slug="support/tickets"
        actions={<Button size="sm" onClick={handleNew} disabled={creating}>{creating ? 'Creating…' : 'New ticket'}</Button>}
      />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      <Card padding="none">
        <ResponsiveTable><table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
              {['ID', 'Requester', 'Subject', 'Priority', 'Status', 'Agent', ''].map((h) => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-[#7C8388]">Loading tickets…</td></tr>
            )}
            {!loading && tickets.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-[#7C8388]">No support tickets.</td></tr>
            )}
            {tickets.map((t, i) => (
              <tr key={t.id} className={`border-b border-[#E7EBEC] ${i === 0 ? 'bg-[#F3FBFC]' : 'bg-white'}`}>
                <td className="px-4 py-3 font-mono text-[12px] text-[#0B5C66]">{t.ticketNumber}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-[#1A1D1F]">{t.requester}</div>
                  <div className="text-[11px] text-[#7C8388]">{t.requesterType}</div>
                </td>
                <td className="px-4 py-3 text-[#4A5054] max-w-[280px] truncate">{t.subject}</td>
                <td className="px-4 py-3"><Badge variant={prioVariant(t.priority)}>{t.priority}</Badge></td>
                <td className="px-4 py-3"><Badge variant={statusVariant(t.status)}>{statusLabel(t.status)}</Badge></td>
                <td className="px-4 py-3 text-[#4A5054]">{t.assignedAgent ?? 'Unassigned'}</td>
                <td className="px-4 py-3">
                  <Link href={`/support/tickets/detail?id=${t.id}`}>
                    <Button variant="ghost" size="sm">Open</Button>
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
