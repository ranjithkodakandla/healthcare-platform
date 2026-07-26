'use client';

// A-15: Analytics — G12.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type AnalyticsSummary, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.analytics.summary();
      setData(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const cards = data
    ? [
        { label: 'Cases resolved (30d)', value: String(data.rollup.casesResolved30d) },
        {
          label: 'Golden Hour %',
          value: data.rollup.goldenHourCompliancePercent == null
            ? 'n/a'
            : `${data.rollup.goldenHourCompliancePercent}%`,
        },
        { label: 'Provider network growth (30d)', value: String(data.rollup.providerNetworkGrowth30d) },
        {
          label: 'Blood donor registry growth',
          value: data.rollup.bloodDonorRegistryGrowth30d == null
            ? 'n/a'
            : String(data.rollup.bloodDonorRegistryGrowth30d),
        },
      ]
    : [];

  return (
    <>
      <TopBar title="Analytics" screenId="A-15" ref_="G12" slug="analytics" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      {loading && <p className="text-[13px] text-[#7C8388]">Loading analytics…</p>}
      {data && (
        <>
          <div className="stat-grid mb-4">
            {cards.map((c) => (
              <Card key={c.label}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#7C8388] mb-1">{c.label}</div>
                <div className="text-[22px] font-bold text-[#1A1D1F]">{c.value}</div>
              </Card>
            ))}
          </div>
          <Card padding="none">
            <div className="px-4 py-3 border-b border-[#E7EBEC] text-[12px] font-bold uppercase tracking-wider text-[#7C8388]">
              Compliance breakdown · {new Date(data.generatedAt).toLocaleString()}
            </div>
            <ResponsiveTable><table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                  {['Category', 'Volume', 'Compliance', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.breakdown.map((r) => (
                  <tr key={r.category} className="border-b border-[#E7EBEC]">
                    <td className="px-4 py-3 font-semibold">{r.category}</td>
                    <td className="px-4 py-3">{r.volumeLabel}</td>
                    <td className="px-4 py-3 font-mono">{r.compliancePercent}%</td>
                    <td className="px-4 py-3"><Badge variant={r.variant}>{r.status.replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table></ResponsiveTable>
          </Card>
        </>
      )}
    </>
  );
}
