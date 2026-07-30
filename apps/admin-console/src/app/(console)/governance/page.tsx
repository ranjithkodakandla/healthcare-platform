'use client';

// A-18: Feature Flags / Config / Audit — G15–G17.
import { useCallback, useEffect, useState } from 'react';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';
import {
  adminApi,
  type FeatureFlag,
  type ConfigGroup,
  type AuditRow,
  ApiError,
} from '@/lib/api';

export default function GovernancePage() {
  const [tab, setTab] = useState<'flags' | 'config' | 'audit'>('flags');
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [config, setConfig] = useState<ConfigGroup[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTab = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'flags') {
        const res = await adminApi.governance.flags();
        setFlags(res.data);
      } else if (tab === 'config') {
        const res = await adminApi.governance.config();
        setConfig(res.data);
      } else {
        const res = await adminApi.governance.audit(q || undefined);
        setAudit(res.data);
      }
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load governance data');
      }
    } finally {
      setLoading(false);
    }
  }, [tab, q]);

  useEffect(() => { loadTab(); }, [loadTab]);

  const toggle = async (flag: FeatureFlag) => {
    try {
      const res = await adminApi.governance.toggleFlag(flag.key, !flag.enabled);
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? res.data : f)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    }
  };

  const tabs = [
    { id: 'flags' as const, label: 'Feature Flags' },
    { id: 'config' as const, label: 'Configuration' },
    { id: 'audit' as const, label: 'Audit Search' },
  ];

  return (
    <>
      <TopBar title="Feature Flags / Config / Audit" screenId="A-18" ref_="G15–G17" slug="governance" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      <div className="flex gap-1 mb-5 border-b border-[#E7EBEC]">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[13px] font-semibold cursor-pointer transition-colors border-b-2 -mb-px ${
              tab === t.id ? 'border-[#0B5C66] text-[#0B5C66]' : 'border-transparent text-[#7C8388] hover:text-[#1A1D1F]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-[13px] text-[#7C8388] mb-3">Loading…</div>}

      {tab === 'flags' && !loading && (
        <Card padding="none">
          <ResponsiveTable><table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                {['Flag key', 'Description', 'Rollout', 'Geography', 'State'].map((h) => (
                  <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.key} className="border-b border-[#E7EBEC] bg-white last:border-0">
                  <td className="px-5 py-3 font-mono text-[12px] text-[#1A1D1F]">{f.key}</td>
                  <td className="px-5 py-3 text-[#4A5054]">{f.description}</td>
                  <td className="px-5 py-3 font-mono text-[#1A1D1F]">{f.rolloutPercent}%</td>
                  <td className="px-5 py-3 text-[#4A5054]">{f.geography}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggle(f)}
                      className={`w-10 h-5 rounded-full flex items-center px-0.5 transition-colors ${f.enabled ? 'bg-[#0B5C66] justify-end' : 'bg-[#C7CDD0] justify-start'}`}
                      aria-label={`Toggle ${f.key}`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></ResponsiveTable>
        </Card>
      )}

      {tab === 'config' && !loading && (
        <div className="space-y-4">
          {config.map((g) => (
            <Card key={g.groupKey} padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">{g.title}</div>
              <div className="space-y-2">
                {g.rows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between py-1.5 border-b border-[#E7EBEC] last:border-0">
                    <span className="text-[13px] text-[#4A5054]">{row.label}</span>
                    <span className="font-mono text-[13px] font-semibold text-[#1A1D1F]">{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'audit' && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex gap-3 items-center">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadTab(); }}
                className="flex-1 h-9 border border-[#C7CDD0] rounded-md px-3 text-[13px]"
                placeholder="Search by user, entity, action…"
              />
              <Button size="sm" onClick={loadTab}>Search</Button>
            </div>
          </Card>
          {!loading && (
            <Card padding="none">
              <ResponsiveTable><table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                    {['Time', 'Actor', 'Action', 'Entity', 'Result'].map((h) => (
                      <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audit.length === 0 && (
                    <tr><td colSpan={5} className="px-5 py-6 text-[#7C8388]">No audit rows matched.</td></tr>
                  )}
                  {audit.map((row) => (
                    <tr key={row.id} className="border-b border-[#E7EBEC] bg-white last:border-0">
                      <td className="px-5 py-3 text-[#7C8388] whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 font-medium text-[#1A1D1F]" title={row.actor}>{row.actorLabel ?? row.actor}</td>
                      <td className="px-5 py-3 text-[#4A5054]">{row.action}</td>
                      <td className="px-5 py-3 font-mono text-[12px]">{row.entityType}:{row.entityId.slice(0, 8)}</td>
                      <td className="px-5 py-3"><Badge variant="success">Success</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table></ResponsiveTable>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
