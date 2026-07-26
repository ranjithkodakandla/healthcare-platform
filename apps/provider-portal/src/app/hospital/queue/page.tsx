'use client';

// P-04: Incoming Patients / Booking Queue — FR-HOSP-001
// Wired to GET /v1/providers/:id/incoming-queue + confirm / decline endpoints.
// Ranked by severity (CRITICAL > URGENT). Confirm / Decline with optimistic UI.
import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SEVERITY_COLORS } from '@/lib/utils';
import { providerApi, getSession, type IncomingQueueItem, ApiError } from '@/lib/api';

type HoldState = 'pending' | 'confirming' | 'confirmed' | 'declining' | 'declined' | 'error';

const SEVERITY_ORDER = ['CRITICAL', 'URGENT', 'MODERATE', 'ROUTINE'];

function sortBySeverity(items: IncomingQueueItem[]): IncomingQueueItem[] {
  return [...items].sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf(a.caseSeverity ?? '');
    const bi = SEVERITY_ORDER.indexOf(b.caseSeverity ?? '');
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

function formatTtl(expiresAt: string): string {
  const secs = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  if (secs <= 0) return 'Expired';
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

export default function QueuePage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [queue, setQueue] = useState<IncomingQueueItem[]>([]);
  const [holdStates, setHoldStates] = useState<Record<string, HoldState>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await providerApi.queue.getIncoming(hospitalId);
      setQueue(sortBySeverity(res.data));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load queue');
      }
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000); // refresh every 15s
    return () => clearInterval(id);
  }, [load]);

  const setHoldState = (holdId: string, state: HoldState) =>
    setHoldStates((prev) => ({ ...prev, [holdId]: state }));

  const handleConfirm = async (holdId: string) => {
    setHoldState(holdId, 'confirming');
    try {
      await providerApi.queue.confirmHold(hospitalId, holdId);
      setHoldState(holdId, 'confirmed');
    } catch {
      setHoldState(holdId, 'error');
    }
  };

  const handleDecline = async (holdId: string) => {
    setHoldState(holdId, 'declining');
    try {
      await providerApi.queue.declineHold(hospitalId, holdId, 'Declined by provider staff');
      setHoldState(holdId, 'declined');
    } catch {
      setHoldState(holdId, 'error');
    }
  };

  const handleClinicalAck = async (holdId: string) => {
    setHoldState(holdId, 'confirming');
    try {
      await providerApi.queue.clinicalAck(hospitalId, holdId, 'HOSPITAL_CLINICAL_LEAD');
      setHoldState(holdId, 'confirmed');
    } catch {
      setHoldState(holdId, 'error');
    }
  };

  const actionable = queue.filter((row) => {
    const state = holdStates[row.holdId] ?? 'pending';
    return state === 'pending' || state === 'error';
  });

  useEffect(() => {
    setFocusedIndex((i) => Math.min(i, Math.max(0, actionable.length - 1)));
  }, [actionable.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      const row = actionable[focusedIndex];
      if (!row) return;
      const key = e.key.toLowerCase();
      if (key === 'j' || key === 'arrowdown') {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(actionable.length - 1, i + 1));
      } else if (key === 'k' || key === 'arrowup') {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(0, i - 1));
      } else if (key === 'c') {
        e.preventDefault();
        if (row.requiresSecondaryAck) void handleClinicalAck(row.holdId);
        else void handleConfirm(row.holdId);
      } else if (key === 'd' && !row.requiresSecondaryAck) {
        e.preventDefault();
        void handleDecline(row.holdId);
      } else if (key === 'r') {
        e.preventDefault();
        void load();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[20px] font-bold">Incoming patients</h1>
        <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
      </div>
      <p className="text-[13px] mb-4" style={{ color: '#7C8388' }}>
        Keyboard: <kbd className="font-mono">J</kbd>/<kbd className="font-mono">K</kbd> move ·{' '}
        <kbd className="font-mono">C</kbd> confirm/ack · <kbd className="font-mono">D</kbd> decline ·{' '}
        <kbd className="font-mono">R</kbd> refresh
      </p>

      {error && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#FBE3E3', border: '1px solid #C62E2E' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        </div>
      )}

      {loading && queue.length === 0 ? (
        <Card>
          <div className="p-[18px] space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />)}
          </div>
        </Card>
      ) : !loading && queue.length === 0 ? (
        <Card>
          <div className="p-[18px] text-center">
            <p className="text-[14px] font-semibold" style={{ color: '#7C8388' }}>Queue is empty</p>
            <p className="text-[12px] mt-1" style={{ color: '#7C8388' }}>No pending holds at this time.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="data-scroll">
          <div style={{ minWidth: 720 }}>
          {/* Table header — desktop columns; stacks via ops-row-grid on phone */}
          <div
            className="ops-row-grid px-[18px] py-3"
            style={{ ['--ops-cols' as string]: '1fr 1.6fr 1.3fr 1fr 1.5fr', background: '#F2F4F5', borderBottom: '1px solid #E7EBEC' }}
          >
            {['Severity', 'Case', 'Category', 'TTL', 'Actions'].map((h) => (
              <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>
                {h}
              </p>
            ))}
          </div>

          {queue.map((row) => {
            const state = holdStates[row.holdId] ?? 'pending';
            const isProcessing = state === 'confirming' || state === 'declining';
            const isDone = state === 'confirmed' || state === 'declined';
            const severity = row.caseSeverity ?? 'ROUTINE';
            const isCritical = severity === 'CRITICAL';
            const sevColor = SEVERITY_COLORS[severity] ?? '#7C8388';
            const actionIdx = actionable.findIndex((a) => a.holdId === row.holdId);
            const isFocused = actionIdx === focusedIndex && !isDone;

            return (
              <div
                key={row.holdId}
                className="ops-row-grid items-center px-[18px] py-3.5"
                style={{
                  ['--ops-cols' as string]: '1fr 1.6fr 1.3fr 1fr 1.5fr',
                  borderTop: '1px solid #E7EBEC',
                  opacity: isDone ? 0.5 : 1,
                  background: isFocused
                    ? '#DEF3F5'
                    : isCritical && !isDone
                      ? '#FFF5F5'
                      : 'transparent',
                  outline: isFocused ? '2px solid #0B5C66' : 'none',
                  outlineOffset: -2,
                }}
              >
                {/* Severity */}
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: sevColor }} />
                  <span className="text-[12px] font-bold" style={{ color: sevColor }}>
                    {severity}
                  </span>
                </div>

                {/* Case + clinical-ack flag */}
                <div>
                  <p className="text-[13px] font-semibold">{(row.caseNumber ?? row.caseId ?? '—').toString().slice(0, 12).toUpperCase()}</p>
                  {row.requiresSecondaryAck && (
                    <p className="text-[12px] font-bold mt-0.5" style={{ color: '#8A5A00' }}>
                      Needs clinical lead confirmation
                    </p>
                  )}
                  {state === 'error' && (
                    <p className="text-[11px]" style={{ color: '#C62E2E' }}>Action failed — retry</p>
                  )}
                </div>

                <p className="text-[13px]" style={{ color: '#4A5054' }}>{row.category}</p>

                {/* TTL countdown */}
                <p className="text-[12px] font-mono" style={{ color: '#D98C0E' }}>
                  {formatTtl(row.ttlExpiresAt)}
                </p>

                {/* Actions */}
                <div className="flex gap-1.5">
                  {isDone ? (
                    <span
                      className="text-[11px] font-bold uppercase"
                      style={{ color: state === 'confirmed' ? '#1E9E5C' : '#C62E2E' }}
                    >
                      {state}
                    </span>
                  ) : row.requiresSecondaryAck ? (
                    <Button
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => handleClinicalAck(row.holdId)}
                    >
                      {isProcessing ? '…' : 'Clinical Ack'}
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        disabled={isProcessing}
                        onClick={() => handleConfirm(row.holdId)}
                      >
                        {state === 'confirming' ? '…' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isProcessing}
                        onClick={() => handleDecline(row.holdId)}
                      >
                        Decline
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          </div>
        </Card>
      )}
    </div>
  );
}
