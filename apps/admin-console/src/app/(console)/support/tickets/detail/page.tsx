'use client';

// A-07: Support Ticket Detail — G5, FR-ADM-SUP-001.
import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, type SupportTicket, ApiError } from '@/lib/api';
import { sanitizeHtmlInput } from '@/lib/utils';

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

function TicketDetailContent() {
  const params = useSearchParams();
  const id = params.get('id') ?? '';
  const from = params.get('from');
  const backHref =
    from === 'provider' ? '/support/provider-tickets' : '/support/tickets';
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justification, setJustification] = useState('');
  const [caseCtx, setCaseCtx] = useState<{
    case: { id: string; caseNumber: string; status: string; caseType: string } | null;
    timeline: Array<{ id: string; type: string; createdAt: string }>;
    note: string | null;
  } | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      setTicket(null);
      setError('Select a ticket from the queue to view details.');
      return;
    }
    try {
      const res = await adminApi.support.getTicket(id);
      setTicket(res.data);
      setNote(res.data.internalNotes ?? '');
      setError(null);
    } catch (err: unknown) {
      setTicket(null);
      if (err instanceof ApiError && err.isUnauthorized) {
        return;
      }
      if (err instanceof ApiError && err.isNotFound) {
        setError('Ticket not found. It may have been removed or the link is invalid.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load ticket');
      }
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveNote = async () => {
    if (!ticket) return;
    setSaving(true);
    try {
      const cleanNote = sanitizeHtmlInput(note);
      const res = await adminApi.support.updateTicket(ticket.id, { internalNotes: cleanNote });
      setTicket(res.data);
      setNote(cleanNote);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (status: string) => {
    if (!ticket) return;
    setSaving(true);
    try {
      const res = await adminApi.support.updateTicket(ticket.id, { status });
      setTicket(res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const loadCaseContext = async () => {
    if (!ticket) return;
    if (justification.trim().length < 8) {
      setError('Access justification must be at least 8 characters (G5 / GT-07)');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await adminApi.support.caseAccess(ticket.id, justification.trim());
      setTicket(res.data.ticket);
      setCaseCtx({
        case: res.data.case,
        timeline: res.data.timeline,
        note: res.data.note,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Case access failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <TopBar
        title="Support Ticket Detail"
        screenId="A-07"
        ref_="G5, FR-ADM-SUP-001"
        slug="support/tickets/detail"
        actions={
          <Link href={backHref}>
            <Button variant="outline" size="sm">← Back to queue</Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}

      {!ticket && !error && (
        <div className="text-[13px] text-[#7C8388]">Loading ticket…</div>
      )}

      {ticket && (
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-4">
            <Card padding="md">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[18px] font-bold text-[#1A1D1F]">{ticket.subject}</div>
                  <div className="text-[12px] text-[#7C8388] mt-1">
                    {ticket.ticketNumber} · {ticket.requesterType} · {ticket.requester}
                    {ticket.entityRef ? ` · ${ticket.entityRef}` : ''}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={prioVariant(ticket.priority)}>{ticket.priority}</Badge>
                  <Badge variant={statusVariant(ticket.status)}>{ticket.status.replace(/_/g, ' ')}</Badge>
                </div>
              </div>
              <p className="text-[13px] text-[#4A5054] whitespace-pre-wrap">
                {ticket.body ?? 'No description provided.'}
              </p>
            </Card>

            <Card padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-2">Internal notes</div>
              {ticket.internalNotes ? (
                <div className="mb-3 rounded-md px-3 py-2 text-[13px] text-[#4A5054] whitespace-pre-wrap" style={{ background: '#F2F4F5' }}>
                  {sanitizeHtmlInput(ticket.internalNotes)}
                </div>
              ) : (
                <div className="mb-3 text-[12px] text-[#7C8388]">No notes yet.</div>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full min-h-[100px] border border-[#C7CDD0] rounded-md p-3 text-[13px]"
                placeholder="Add an internal note…"
              />
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={saveNote} disabled={saving}>Save note</Button>
                <Button size="sm" variant="secondary" onClick={() => setStatus('IN_PROGRESS')} disabled={saving}>Mark in progress</Button>
                <Button size="sm" variant="outline" onClick={() => setStatus('RESOLVED')} disabled={saving}>Resolve</Button>
              </div>
            </Card>
          </div>

          <div className="space-y-4">
            <Card padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Assignment</div>
              <div className="text-[13px] text-[#4A5054] mb-1">Agent</div>
              <div className="font-semibold text-[#1A1D1F]">{ticket.assignedAgent ?? 'Unassigned'}</div>
              <div className="text-[12px] text-[#7C8388] mt-3">
                Updated {new Date(ticket.updatedAt).toLocaleString('en-IN')}
              </div>
            </Card>

            <Card padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-2">Case access (G5)</div>
              <p className="text-[12px] text-[#7C8388] mb-2">
                Enter a reason for access before viewing linked case timeline. Access is audited.
              </p>
              {ticket.accessJustification && (
                <div className="mb-2 text-[11px] text-[#0B5C66]">
                  Last justification: {ticket.accessJustification}
                </div>
              )}
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full min-h-[72px] border border-[#C7CDD0] rounded-md p-2 text-[13px] mb-2"
                placeholder="Reason for accessing case data…"
              />
              <Button size="sm" onClick={() => void loadCaseContext()} disabled={saving}>
                Load case context
              </Button>
              {caseCtx && (
                <div className="mt-3 space-y-2 text-[12px]">
                  {caseCtx.case ? (
                    <>
                      <div className="font-semibold text-[#1A1D1F]">
                        {caseCtx.case.caseNumber} · {caseCtx.case.status} · {caseCtx.case.caseType}
                      </div>
                      <div className="text-[11px] font-semibold text-[#7C8388] uppercase">Timeline</div>
                      <ul className="space-y-1 max-h-48 overflow-y-auto">
                        {caseCtx.timeline.length === 0 && (
                          <li className="text-[#7C8388]">No timeline events</li>
                        )}
                        {caseCtx.timeline.map((ev) => (
                          <li key={ev.id} className="text-[#4A5054]">
                            {new Date(ev.createdAt).toLocaleString('en-IN')} — {ev.type}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <div className="text-[#7C8388]">{caseCtx.note ?? 'No linked case'}</div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[#7C8388] p-4">Loading…</div>}>
      <TicketDetailContent />
    </Suspense>
  );
}
