'use client';

// P-03: Operational Data Update / Bed Inventory — FR-BED-001
// Stepper +/- controls per category. Submit PUT /v1/providers/:id/beds resets staleness timer.
// §13.1: any update resets the 15-min staleness clock regardless of delta.
import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardPadded } from '@/components/ui/Card';
import { BED_CATEGORY_LABEL } from '@/lib/utils';
import type { BedCategory } from '@/lib/types';
import { providerApi, getSession, type BedInventoryRow, ApiError } from '@/lib/api';

type LocalRow = {
  category: BedCategory;
  total: number;
  available: number;
  occupied: number;
  stalenessStatus: string;
  lastUpdatedAt: string;
};

function Stepper({
  value,
  onDecrement,
  onIncrement,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onDecrement}
        className="w-11 h-11 rounded-[6px] flex items-center justify-center font-bold cursor-pointer hover:bg-gray-200"
        style={{ background: '#F2F4F5', color: '#4A5054' }}
      >
        –
      </button>
      <span className="text-[15px] font-bold w-7 text-center" style={{ color: '#1A1D1F' }}>
        {value}
      </span>
      <button
        onClick={onIncrement}
        className="w-11 h-11 rounded-[6px] flex items-center justify-center font-bold cursor-pointer hover:bg-gray-200"
        style={{ background: '#F2F4F5', color: '#4A5054' }}
      >
        +
      </button>
    </div>
  );
}

function fromApiRow(r: BedInventoryRow): LocalRow {
  return {
    category: r.category as BedCategory,
    total: r.totalCount,
    available: r.availableCount,
    occupied: r.occupiedCount,
    stalenessStatus: r.stalenessStatus,
    lastUpdatedAt: r.lastUpdatedAt,
  };
}

function formatAge(dateStr: string): string {
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function BedsPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [beds, setBeds] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await providerApi.beds.get(hospitalId);
      setBeds(res.data.map(fromApiRow));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load inventory');
      }
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { load(); }, [load]);

  const update = (idx: number, field: 'available' | 'occupied', delta: number) => {
    setBeds((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      row[field] = Math.max(0, row[field] + delta);
      next[idx] = row;
      return next;
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitMsg(null);
    setError(null);
    try {
      await providerApi.beds.update(
        hospitalId,
        beds.map((r) => ({
          category: r.category,
          availableCount: r.available,
          occupiedCount: r.occupied,
          totalCount: r.total,
        })),
      );
      setSubmitMsg('Bed counts saved. Inventory is marked up to date.');
      await load(); // refresh from server to confirm
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit update');
    } finally {
      setSubmitting(false);
    }
  };

  const overallStale = beds.some((b) => b.stalenessStatus === 'STALE');
  const lastUpdated = beds.length > 0 ? formatAge(beds[0].lastUpdatedAt) : '—';

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <h1 className="text-[20px] font-bold">Bed Inventory Update</h1>
        <Badge variant={overallStale ? 'danger' : 'success'}>
          Last updated {lastUpdated}
        </Badge>
      </div>
      <p className="text-[13px] mb-5" style={{ color: '#7C8388' }}>
        Update counts, then submit — target under 15 seconds per FR-BED-001.
      </p>

      {error && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#FBE3E3', border: '1px solid #C62E2E' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
          <button onClick={load} className="text-[12px] font-bold underline mt-1" style={{ color: '#C62E2E' }}>Reload</button>
        </div>
      )}

      {submitMsg && (
        <div className="rounded-[10px] p-3 mb-4" style={{ background: '#DFF5E9', border: '1px solid #1E9E5C' }}>
          <p className="text-[12px] font-semibold" style={{ color: '#1E9E5C' }}>{submitMsg}</p>
        </div>
      )}

      {loading && beds.length === 0 ? (
        <CardPadded className="max-w-[760px]">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-100 animate-pulse" />
            ))}
          </div>
        </CardPadded>
      ) : (
        <CardPadded className="max-w-[760px] w-full">
          <div className="data-scroll">
          <div style={{ minWidth: 520 }}>
          <div
            className="ops-row-grid pb-2.5"
            style={{ ['--ops-cols' as string]: '1.4fr 1fr 1fr 1fr', borderBottom: '1px solid #E7EBEC' }}
          >
            {['Category', 'Total', 'Available', 'Occupied'].map((h) => (
              <p key={h} className="text-[11px] font-bold uppercase tracking-[0.03em]" style={{ color: '#7C8388' }}>
                {h}
              </p>
            ))}
          </div>

          {beds.map((row, idx) => (
            <div
              key={row.category}
              className="ops-row-grid items-center py-3"
              style={{ ['--ops-cols' as string]: '1.4fr 1fr 1fr 1fr', borderBottom: '1px solid #E7EBEC' }}
            >
              <div>
                <p className="text-[13px] font-semibold">{BED_CATEGORY_LABEL[row.category]}</p>
                {row.stalenessStatus === 'STALE' && (
                  <p className="text-[10px] font-bold" style={{ color: '#C62E2E' }}>STALE</p>
                )}
              </div>
              <p className="text-[14px] font-bold">{row.total}</p>
              <Stepper
                value={row.available}
                onDecrement={() => update(idx, 'available', -1)}
                onIncrement={() => update(idx, 'available', +1)}
              />
              <p className="text-[14px]" style={{ color: '#7C8388' }}>{row.occupied}</p>
            </div>
          ))}
          </div>
          </div>

          <div className="flex justify-end mt-[18px]">
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Submit update'}
            </Button>
          </div>
        </CardPadded>
      )}
    </div>
  );
}
