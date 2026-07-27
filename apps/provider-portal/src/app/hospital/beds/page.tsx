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

const ALL_BED_CATEGORIES = Object.keys(BED_CATEGORY_LABEL) as BedCategory[];

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

// Maps known backend validation error codes (bed-inventory.service.ts) to a friendly,
// field-level message — replaces dumping the raw `METHOD /path: status {json}` string
// into the DOM (UAT Finding #4). `requiresOverride` tells the caller whether to reveal
// the override-reason affordance (Finding #5 — the API already supports overrideReason,
// the UI never collected it).
function friendlyBedError(message: string): { text: string; requiresOverride: boolean } {
  const exceeds = message.match(/BED_INVENTORY_COUNT_EXCEEDS_TOTAL: category (\w+) — occupied\((\d+)\) \+ available\((\d+)\) > total\((\d+)\)/);
  if (exceeds) {
    const [, category, occupied, available, total] = exceeds;
    const label = BED_CATEGORY_LABEL[category as BedCategory] ?? category;
    return {
      text: `${label}: occupied (${occupied}) + available (${available}) is more than the total (${total}). Fix the counts, or provide a reason below to override.`,
      requiresOverride: true,
    };
  }
  const negative = message.match(/BED_INVENTORY_NEGATIVE_COUNT: category (\w+)/);
  if (negative) {
    const label = BED_CATEGORY_LABEL[negative[1] as BedCategory] ?? negative[1];
    return { text: `${label}: counts cannot be negative.`, requiresOverride: false };
  }
  return { text: 'Failed to submit update. Please try again.', requiresOverride: false };
}

export default function BedsPage() {
  const session = typeof window !== 'undefined' ? getSession() : null;
  const hospitalId = session?.hospitalId ?? 'hosp-apollo-blr';

  const [beds, setBeds] = useState<LocalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [needsOverride, setNeedsOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

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

  const update = (idx: number, field: 'available' | 'occupied' | 'total', delta: number) => {
    setBeds((prev) => {
      const next = [...prev];
      const row = { ...next[idx] };
      row[field] = Math.max(0, row[field] + delta);
      next[idx] = row;
      return next;
    });
    // Clear a stale validation error once the operator starts fixing the counts
    // (previously the error banner stayed on screen after the values became valid).
    setError(null);
    setNeedsOverride(false);
  };

  // A hospital with no seeded bed_inventory rows previously had no way to ever get
  // one — the table only rendered rows that already existed server-side, and the
  // PUT endpoint (which upserts) was unreachable from the UI for a brand-new
  // category. Adding a row here is purely local state; it's created server-side on
  // the next "Submit update" (the same upsert path an edit already uses).
  const addCategory = (category: BedCategory) => {
    setBeds((prev) => [
      ...prev,
      { category, total: 0, available: 0, occupied: 0, stalenessStatus: 'FRESH', lastUpdatedAt: new Date().toISOString() },
    ]);
  };

  const missingCategories = ALL_BED_CATEGORIES.filter((c) => !beds.some((b) => b.category === c));

  const handleSubmit = async () => {
    if (submitting) return;
    if (needsOverride && !overrideReason.trim()) {
      setError('An override reason is required to save counts that exceed the total.');
      return;
    }
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
        needsOverride ? overrideReason.trim() : undefined,
      );
      setSubmitMsg('Bed counts saved. Inventory is marked up to date.');
      setNeedsOverride(false);
      setOverrideReason('');
      await load(); // refresh from server to confirm
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        const { text, requiresOverride } = friendlyBedError(err.message);
        setError(text);
        setNeedsOverride(requiresOverride);
      } else {
        setError('Failed to submit update. Please try again.');
      }
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
          {needsOverride ? (
            <div className="mt-2">
              <label htmlFor="override-reason" className="block text-[11px] font-semibold mb-1" style={{ color: '#C62E2E' }}>
                Override reason
              </label>
              <input
                id="override-reason"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Correcting a miscounted total after audit"
                className="w-full h-10 rounded-[6px] px-2.5 text-[13px] outline-none"
                style={{ border: '1px solid #C62E2E', color: '#1A1D1F', background: '#FFFFFF' }}
              />
            </div>
          ) : (
            <button onClick={load} className="text-[12px] font-bold underline mt-1" style={{ color: '#C62E2E' }}>Reload</button>
          )}
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
              <Stepper
                value={row.total}
                onDecrement={() => update(idx, 'total', -1)}
                onIncrement={() => update(idx, 'total', +1)}
              />
              <Stepper
                value={row.available}
                onDecrement={() => update(idx, 'available', -1)}
                onIncrement={() => update(idx, 'available', +1)}
              />
              <Stepper
                value={row.occupied}
                onDecrement={() => update(idx, 'occupied', -1)}
                onIncrement={() => update(idx, 'occupied', +1)}
              />
            </div>
          ))}

          {beds.length === 0 && (
            <p className="py-6 text-[13px] text-center" style={{ color: '#7C8388' }}>
              No bed categories set up yet. Add one below to get started.
            </p>
          )}
          </div>
          </div>

          {missingCategories.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E7EBEC' }}>
              <p className="text-[12px] font-semibold mb-2" style={{ color: '#4A5054' }}>Add a bed category</p>
              <div className="flex flex-wrap gap-2">
                {missingCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => addCategory(c)}
                    className="h-9 px-3 rounded-[8px] text-[13px] font-semibold cursor-pointer"
                    style={{ border: '1px solid #0B5C66', color: '#0B5C66', background: '#F3FBFC' }}
                  >
                    + {BED_CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-[18px]">
            <Button onClick={handleSubmit} disabled={submitting || beds.length === 0}>
              {submitting ? 'Saving…' : 'Submit update'}
            </Button>
          </div>
        </CardPadded>
      )}
    </div>
  );
}
