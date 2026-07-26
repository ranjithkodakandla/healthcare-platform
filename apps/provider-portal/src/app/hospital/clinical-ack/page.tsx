'use client';

// P-05: ICU/Ventilator Clinical Acknowledgment — FR-HOSP-002, BR-04
// Zero-tolerance audit gate: BOTH checkboxes required before button enables.
// Wired to GET incoming-queue (requiresSecondaryAck filter) + POST clinical-ack.
// Actor role must be HOSPITAL_CLINICAL_LEAD (HospitalPortalRole enum).

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { providerApi, getSession, type IncomingQueueItem, ApiError } from '@/lib/api';

function AckCard({
  item,
  hospitalId,
  onDone,
}: {
  item: IncomingQueueItem;
  hospitalId: string;
  onDone: (holdId: string) => void;
}) {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bothChecked = c1 && c2;

  const caseLabel = (item.caseNumber ?? item.caseId ?? 'UNKNOWN').toString().slice(0, 12).toUpperCase();

  const handleAck = async () => {
    if (!bothChecked || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await providerApi.queue.clinicalAck(hospitalId, item.holdId, 'HOSPITAL_CLINICAL_LEAD');
      onDone(item.holdId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Acknowledgment failed');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="rounded-[12px] p-[18px] mb-3.5 max-w-[640px]"
      style={{ border: '1.5px solid #8A5A00' }}
    >
      <div className="flex justify-between items-center mb-2.5">
        <p className="text-[14px] font-bold">
          {caseLabel} · {item.category}
        </p>
        <Badge variant="warning">Awaiting acknowledgment</Badge>
      </div>

      <label className="flex items-start gap-3 mb-3 cursor-pointer select-none min-h-12">
        <input
          type="checkbox"
          checked={c1}
          onChange={() => setC1((v) => !v)}
          className="mt-1 w-5 h-5 accent-[#0B5C66]"
        />
        <span className="text-[14px]" style={{ color: '#1A1D1F' }}>
          I confirmed this {item.category} bed is free and staffed right now
        </span>
      </label>

      <label className="flex items-start gap-3 mb-4 cursor-pointer select-none min-h-12">
        <input
          type="checkbox"
          checked={c2}
          onChange={() => setC2((v) => !v)}
          className="mt-1 w-5 h-5 accent-[#0B5C66]"
        />
        <span className="text-[14px]" style={{ color: '#1A1D1F' }}>
          I am the clinical lead for this decision and accept responsibility for readiness
        </span>
      </label>

      {error && (
        <p className="text-[12px] mb-2" style={{ color: '#C62E2E' }}>{error}</p>
      )}

      <Button
        disabled={!bothChecked || submitting}
        onClick={handleAck}
        className="w-[220px]"
        style={
          !bothChecked || submitting
            ? { background: '#C7CDD0', cursor: 'not-allowed' }
            : undefined
        }
      >
        {submitting ? 'Submitting…' : 'Confirm bed — both required'}
      </Button>
    </div>
  );
}

export default function ClinicalAckPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [items, setItems] = useState<IncomingQueueItem[]>([]);
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await providerApi.queue.getIncoming(hospitalId);
      setItems(res.data.filter((q) => q.requiresSecondaryAck));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load clinical ack queue');
      }
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [load]);

  const pending = items.filter((i) => !ackedIds.has(i.holdId));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-[20px] font-bold">ICU / Ventilator Clinical Acknowledgment</h1>
        <Button size="sm" variant="secondary" onClick={load}>Refresh</Button>
      </div>
      <p className="text-[13px] mb-5" style={{ color: '#7C8388' }}>
        Separate from general Admissions queue — zero-tolerance audit gate (FR-HOSP-002, BR-04).
      </p>

      {error && (
        <div className="rounded-[10px] p-3 mb-4 max-w-[640px]" style={{ background: '#FBE3E3' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
        </div>
      )}

      {loading && pending.length === 0 && (
        <p className="text-[13px]" style={{ color: '#7C8388' }}>Loading pending acknowledgments…</p>
      )}

      {!loading && pending.length === 0 && !error && (
        <div
          className="rounded-[12px] p-[18px] max-w-[640px]"
          style={{ border: '1px solid #E7EBEC', background: '#F2F4F5' }}
        >
          <p className="text-[14px] font-semibold" style={{ color: '#1E9E5C' }}>
            ✓ No ICU/Vent holds awaiting clinical acknowledgment
          </p>
        </div>
      )}

      {pending.map((item) => (
        <AckCard
          key={item.holdId}
          item={item}
          hospitalId={hospitalId}
          onDone={(holdId) => setAckedIds((prev) => new Set([...prev, holdId]))}
        />
      ))}

      {[...ackedIds].map((holdId) => (
        <div
          key={holdId}
          className="rounded-[12px] p-[18px] mb-3.5 max-w-[640px]"
          style={{ border: '1.5px solid #1E9E5C', background: '#E6F5ED' }}
        >
          <p className="text-[14px] font-bold" style={{ color: '#1E9E5C' }}>
            ✓ {holdId.slice(0, 8).toUpperCase()} — Clinically acknowledged
          </p>
        </div>
      ))}
    </div>
  );
}
