'use client';

// A-06: Support Ticket Queue — G5.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, getAdminProfile, type SupportTicket, ApiError } from '@/lib/api';
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
  const [formOpen, setFormOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [requester, setRequester] = useState('');
  const [requesterType, setRequesterType] = useState<'CITIZEN' | 'PROVIDER'>('CITIZEN');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('MED');
  const [body, setBody] = useState('');
  const [entityRef, setEntityRef] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await adminApi.support.listTickets();
      setTickets(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) return;
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!subject.trim() || !requester.trim()) {
      setError('Requester and subject are required');
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const profile = getAdminProfile();
      await adminApi.support.createTicket({
        requester: requester.trim(),
        requesterType,
        subject: subject.trim(),
        priority,
        body: body.trim() || undefined,
        entityRef: entityRef.trim() || undefined,
      });
      setFormOpen(false);
      setRequester(profile?.email ?? '');
      setSubject('');
      setBody('');
      setEntityRef('');
      setPriority('MED');
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
        actions={
          <Button size="sm" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Close form' : 'New ticket'}
          </Button>
        }
      />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}

      {formOpen && (
        <Card padding="md" className="mb-4">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Create support ticket</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="tkt-requester">Requester</label>
              <input id="tkt-requester" value={requester} onChange={(e) => setRequester(e.target.value)} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]" placeholder="Name or email" />
            </div>
            <div>
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1">Type</label>
              <select value={requesterType} onChange={(e) => setRequesterType(e.target.value as 'CITIZEN' | 'PROVIDER')} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px] bg-white">
                <option value="CITIZEN">Citizen</option>
                <option value="PROVIDER">Provider</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="tkt-subject">Subject</label>
              <input id="tkt-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]" placeholder="Short summary" />
            </div>
            <div>
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1">Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px] bg-white">
                <option value="HIGH">HIGH</option>
                <option value="MED">MED</option>
                <option value="LOW">LOW</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="tkt-ref">Case / entity ref (optional)</label>
              <input id="tkt-ref" value={entityRef} onChange={(e) => setEntityRef(e.target.value)} className="w-full h-9 px-3 rounded-md border border-[#E7EBEC] text-[13px]" placeholder="CASE-…" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-[#7C8388] font-medium block mb-1" htmlFor="tkt-body">Description</label>
              <textarea id="tkt-body" value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-md border border-[#E7EBEC] text-[13px]" placeholder="What needs attention?" />
            </div>
          </div>
          <div className="mt-3">
            <Button size="sm" onClick={() => void handleCreate()} disabled={creating}>
              {creating ? 'Creating…' : 'Create ticket'}
            </Button>
          </div>
        </Card>
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
