'use client';

// A-10: SLA Monitoring — G7, FR-ADM-SLA-001.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type SlaSnapshot, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

export default function SlaPage() {
  const [snap, setSnap] = useState<SlaSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.sla.snapshot();
      setSnap(res.data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.isUnauthorized
        ? 'Sign in required (Firebase admin session)'
        : err instanceof Error ? err.message : 'Failed to load SLA');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <TopBar title="SLA Monitoring" screenId="A-10" ref_="G7, FR-ADM-SLA-001" slug="issues/sla" />
      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      {loading && <p className="text-[13px] text-[#7C8388]">Loading SLA snapshot…</p>}
      {snap && (
        <>
          <Card className="mb-4" padding="none">
            <div className="px-4 py-3 border-b border-[#E7EBEC] text-[12px] font-bold uppercase tracking-wider text-[#7C8388]">
              Live definitions · {new Date(snap.generatedAt).toLocaleString()}
            </div>
            <ResponsiveTable><table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                  {['SLA', 'Definition', 'Target', 'Current', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snap.definitions.map((r) => (
                  <tr key={r.key ?? r.name} className="border-b border-[#E7EBEC]">
                    <td className="px-4 py-3 font-semibold">{r.name}</td>
                    <td className="px-4 py-3 text-[#4A5054]">{r.definition}</td>
                    <td className="px-4 py-3">{r.target}</td>
                    <td className="px-4 py-3 font-mono text-[12px]">{r.currentP95}</td>
                    <td className="px-4 py-3"><Badge variant={r.variant}>{r.status.replace(/_/g, ' ')}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table></ResponsiveTable>
          </Card>
          <Card padding="none">
            <div className="px-4 py-3 border-b border-[#E7EBEC] text-[12px] font-bold uppercase tracking-wider text-[#7C8388]">
              30-day compliance by domain
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
                {snap.compliance30d.map((r) => (
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
