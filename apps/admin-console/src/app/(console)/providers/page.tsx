'use client';

// Admin provider directory — search live orgs and perform hospital-admin ops when needed.
import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  adminApi,
  type ProviderDirectoryRow,
  type ProviderOrgDetail,
  ApiError,
} from '@/lib/api';

export default function ProvidersPage() {
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<ProviderDirectoryRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProviderOrgDetail | null>(null);
  const [queueCount, setQueueCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const search = useCallback(async (term?: string) => {
    setLoading(true);
    try {
      const res = await adminApi.providers.search(term);
      setRows(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) return;
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void search();
  }, [search]);

  async function openOrg(orgId: string) {
    setSelectedId(orgId);
    setBusy(true);
    setMsg(null);
    try {
      const [org, queue] = await Promise.all([
        adminApi.providers.getOrg(orgId),
        adminApi.providers.hospitalIncomingQueue(orgId).catch(() => ({ data: [] as unknown[] })),
      ]);
      setDetail(org.data);
      setQueueCount(Array.isArray(queue.data) ? queue.data.length : 0);
      setError(null);
    } catch (err: unknown) {
      setDetail(null);
      setError(err instanceof Error ? err.message : 'Failed to load provider');
    } finally {
      setBusy(false);
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    await search(q);
  }

  async function bumpAvailable(category: string, delta: number) {
    if (!detail) return;
    const bed = detail.beds.find((b) => b.category === category);
    if (!bed) return;
    const availableCount = Math.max(0, Math.min(bed.totalCount, bed.availableCount + delta));
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.providers.updateHospitalBeds(detail.registry.hospitalId, [
        { category, totalCount: bed.totalCount, availableCount },
      ]);
      setMsg(`Updated ${category} available beds to ${availableCount} (admin override)`);
      await openOrg(detail.registry.hospitalId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Bed update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="Providers" screenId="A-20" ref_="Admin ops" slug="providers" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px]" style={{ background: '#FBE3E3', color: '#C62E2E' }} role="alert">
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px]" style={{ background: '#DEF3F5', color: '#0B5C66' }} role="status">
          {msg}
        </div>
      )}

      <form onSubmit={onSearch} className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by hospital name, org ID, or city"
          className="flex-1 h-10 px-3 rounded-md border border-[#E7EBEC] text-[13px]"
          aria-label="Search providers"
        />
        <Button type="submit" size="sm" disabled={loading}>
          Search
        </Button>
      </form>

      <div className="grid grid-cols-5 gap-4">
        <div className="col-span-2 space-y-2">
          {loading && <p className="text-[13px] text-[#7C8388]">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-[13px] text-[#7C8388]">No providers matched.</p>
          )}
          {rows.map((r) => (
            <button
              key={r.hospitalId}
              type="button"
              onClick={() => void openOrg(r.hospitalId)}
              className="w-full text-left"
            >
              <Card
                padding="sm"
                className={selectedId === r.hospitalId ? 'ring-2 ring-[#0B5C66]' : undefined}
              >
                <div className="text-[13px] font-bold text-[#1A1D1F]">{r.name}</div>
                <div className="text-[11px] text-[#7C8388] mt-0.5">
                  {r.hospitalId}
                  {r.city ? ` · ${r.city}` : ''}
                </div>
                <Badge variant="info" className="mt-2">{r.providerType}</Badge>
              </Card>
            </button>
          ))}
        </div>

        <div className="col-span-3">
          {!detail && (
            <Card padding="md">
              <p className="text-[13px] text-[#7C8388]">
                Select a provider to view details and run hospital-admin actions (beds, incoming queue).
                Actions are audited.
              </p>
            </Card>
          )}
          {detail && (
            <div className="space-y-4">
              <Card padding="md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[18px] font-bold text-[#1A1D1F]">{detail.registry.name}</div>
                    <div className="text-[12px] text-[#7C8388] mt-1">
                      {detail.registry.hospitalId}
                      {detail.registry.address ? ` · ${detail.registry.address}` : ''}
                      {detail.registry.city ? ` · ${detail.registry.city}` : ''}
                    </div>
                  </div>
                  <Badge variant="success">Live registry</Badge>
                </div>
                {detail.application && (
                  <div className="mt-3 text-[12px] text-[#4A5054]">
                    Onboarding: {detail.application.currentStage}
                    {detail.application.portalEmail ? ` · portal ${detail.application.portalEmail}` : ''}
                    {' · '}
                    <Link
                      className="text-[#0B5C66] font-semibold"
                      href={`/onboarding/provider/verify?id=${detail.application.id}`}
                    >
                      Open verification
                    </Link>
                  </div>
                )}
                <div className="mt-3 text-[12px] text-[#7C8388]">
                  Incoming queue: {queueCount ?? '—'} open hold(s)
                  {busy ? ' · refreshing…' : ''}
                </div>
              </Card>

              <Card padding="md">
                <div className="text-[13px] font-semibold mb-3">Bed inventory (admin can adjust)</div>
                {detail.beds.length === 0 && (
                  <p className="text-[13px] text-[#7C8388]">No bed rows for this org yet.</p>
                )}
                <div className="space-y-2">
                  {detail.beds.map((b) => (
                    <div
                      key={b.category}
                      className="flex items-center justify-between gap-2 border border-[#E7EBEC] rounded-md px-3 py-2"
                    >
                      <div>
                        <div className="text-[13px] font-semibold">{b.category}</div>
                        <div className="text-[11px] text-[#7C8388]">
                          {b.availableCount} available / {b.totalCount} total · {b.stalenessStatus}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || b.availableCount <= 0}
                          onClick={() => void bumpAvailable(b.category, -1)}
                        >
                          −1
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy || b.availableCount >= b.totalCount}
                          onClick={() => void bumpAvailable(b.category, 1)}
                        >
                          +1
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
