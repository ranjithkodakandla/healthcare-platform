'use client';

// A-04: Provider Onboarding — Stage Gate — G4, FR-ADM-PRV-001.
// Wired to GET /v1/admin/platform/onboarding-queue.
import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, STAGE_LABEL, type ProviderApplication, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

const PROVIDER_TYPE_TABS = [
  'All types',
  'HOSPITAL',
  'AMBULANCE_OPERATOR',
  'BLOOD_BANK',
  'DOCTOR',
  'PHARMACY',
  'DIAGNOSTIC_CENTER',
  'INSURANCE',
];

function stageBadge(stage: string): 'warning' | 'info' | 'neutral' | 'success' {
  if (stage === 'CREDENTIAL_VERIFICATION') return 'warning';
  if (stage === 'INTEGRATION_TEST') return 'info';
  if (stage === 'GO_LIVE_APPROVAL' || stage === 'PORTAL_ACCESS_ACTIVATED') return 'success';
  return 'neutral';
}

function typeLabel(t: string): string {
  return t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProviderOnboardingPage() {
  const [queue, setQueue] = useState<ProviderApplication[]>([]);
  const [activeTab, setActiveTab] = useState('All types');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.platform.onboardingQueue();
      setQueue(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load onboarding queue');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (activeTab === 'All types') return queue;
    return queue.filter((q) => q.providerType === activeTab);
  }, [queue, activeTab]);

  return (
    <>
      <TopBar title="Provider Onboarding — Stage Gate" screenId="A-04" ref_="G4, FR-ADM-PRV-001" slug="onboarding/provider" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {PROVIDER_TYPE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-colors ${
              activeTab === tab ? 'bg-[#0B5C66] text-white' : 'bg-[#F2F4F5] text-[#4A5054] hover:bg-[#E7EBEC]'
            }`}
          >
            {tab === 'All types' ? tab : typeLabel(tab)}
          </button>
        ))}
      </div>

      <Card padding="none">
        <div className="px-5 py-3.5 border-b border-[#E7EBEC] flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#1A1D1F]">Application queue</span>
          <Badge variant="info">{filtered.length} active</Badge>
        </div>
        <ResponsiveTable><table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
              {['Provider', 'Type', 'Stage', 'Action'].map((h) => (
                <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-[#7C8388]">Loading applications…</td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-6 text-[#7C8388]">
                  No applications in this filter. Queue is empty or all providers are live.
                </td>
              </tr>
            )}
            {filtered.map((row, i) => (
              <tr key={row.id} className={`border-b border-[#E7EBEC] ${i === 0 ? 'bg-[#F3FBFC]' : 'bg-white'}`}>
                <td className="px-5 py-3 font-semibold text-[#1A1D1F]">{row.legalName}</td>
                <td className="px-5 py-3 text-[#4A5054]">{typeLabel(row.providerType)}</td>
                <td className="px-5 py-3">
                  <Badge variant={stageBadge(row.currentStage)}>
                    {STAGE_LABEL[row.currentStage] ?? row.currentStage}
                  </Badge>
                </td>
                <td className="px-5 py-3">
                  <Link href={`/onboarding/provider/verify?id=${row.id}`}>
                    <Button variant="secondary" size="sm">View detail</Button>
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
