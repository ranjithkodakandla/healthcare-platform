'use client';

// A-04: Provider Onboarding — Stage Gate — G4, FR-ADM-PRV-001.
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { adminApi, STAGE_LABEL, type ProviderApplication, ApiError } from '@/lib/api';
import { ResponsiveTable } from '@/components/layout/ResponsiveTable';

const PROVIDER_TYPES = [
  'HOSPITAL',
  'AMBULANCE_OPERATOR',
  'BLOOD_BANK',
  'DOCTOR',
  'PHARMACY',
  'DIAGNOSTIC_CENTER',
  'INSURER',
] as const;

const PROVIDER_TYPE_TABS = ['All types', ...PROVIDER_TYPES];

function stageBadge(stage: string): 'warning' | 'info' | 'neutral' | 'success' | 'danger' {
  if (stage === 'REJECTED') return 'danger';
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const [legalName, setLegalName] = useState('');
  const [providerType, setProviderType] = useState<string>('HOSPITAL');
  const [orgId, setOrgId] = useState('');
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('Password@01');
  const [city, setCity] = useState('Bengaluru');

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

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setFormMsg(null);
    if (!legalName.trim()) {
      setFormMsg('Provider legal name is required');
      return;
    }
    setSaving(true);
    try {
      const body: Parameters<typeof adminApi.providers.create>[0] = {
        providerType,
        legalName: legalName.trim(),
        city: city.trim() || undefined,
      };
      if (orgId.trim() || portalEmail.trim() || portalPassword) {
        body.orgId = orgId.trim();
        body.portalEmail = portalEmail.trim();
        body.portalPassword = portalPassword;
      }
      const res = await adminApi.providers.create(body);
      setFormMsg(
        body.portalEmail
          ? `Created ${res.data.legalName}. Portal login: ${body.portalEmail} / (password set) · Org ID ${body.orgId}`
          : `Created application for ${res.data.legalName}`,
      );
      setLegalName('');
      setOrgId('');
      setPortalEmail('');
      setPortalPassword('Password@01');
      setShowForm(false);
      await load();
    } catch (err: unknown) {
      setFormMsg(err instanceof Error ? err.message : 'Failed to create provider');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <TopBar
        title="Provider Onboarding — Stage Gate"
        screenId="A-04"
        ref_="G4, FR-ADM-PRV-001"
        slug="onboarding/provider"
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close form' : '+ Add provider'}
          </Button>
        }
      />

      {error && (
        <div
          className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium"
          style={{ background: '#FBE3E3', color: '#C62E2E' }}
        >
          {error}
        </div>
      )}
      {formMsg && (
        <div
          className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium"
          style={{ background: '#E6F5ED', color: '#0E6B3A' }}
          role="status"
        >
          {formMsg}
        </div>
      )}

      {showForm && (
        <Card padding="md" className="mb-5">
          <div className="text-[14px] font-semibold text-[#1A1D1F] mb-1">Add provider application</div>
          <p className="text-[12px] text-[#7C8388] mb-4">
            Creates an onboarding record. Optionally provision Provider Portal login credentials
            (Firebase) in the same step.
          </p>
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-[12px] font-semibold text-[#4A5054]">
              Legal name
              <input
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px]"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                placeholder="Apollo Hospital, Whitefield"
                required
              />
            </label>
            <label className="text-[12px] font-semibold text-[#4A5054]">
              Provider type
              <select
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px] bg-white"
                value={providerType}
                onChange={(e) => setProviderType(e.target.value)}
              >
                {PROVIDER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-[12px] font-semibold text-[#4A5054]">
              Organization ID (portal)
              <input
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px]"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                placeholder="hosp-apollo-blr"
              />
            </label>
            <label className="text-[12px] font-semibold text-[#4A5054]">
              City
              <input
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px]"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Bengaluru"
              />
            </label>
            <label className="text-[12px] font-semibold text-[#4A5054]">
              Portal login email
              <input
                type="email"
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px]"
                value={portalEmail}
                onChange={(e) => setPortalEmail(e.target.value)}
                placeholder="hospital.admin@example.com"
              />
            </label>
            <label className="text-[12px] font-semibold text-[#4A5054]">
              Portal password
              <input
                type="text"
                className="mt-1 w-full h-11 rounded-md border border-[#C7CDD0] px-3 text-[14px]"
                value={portalPassword}
                onChange={(e) => setPortalPassword(e.target.value)}
                placeholder="Password@01"
              />
            </label>
            <div className="md:col-span-2 flex gap-2 mt-1">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? 'Creating…' : 'Create provider'}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="flex gap-2 mb-5 flex-wrap">
        {PROVIDER_TYPE_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium cursor-pointer transition-colors min-h-11 ${
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
        <ResponsiveTable>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#E7EBEC] bg-[#F2F4F5]">
                {['Provider', 'Type', 'Org ID', 'Stage', 'Action'].map((h) => (
                  <th
                    key={h}
                    className="px-5 py-2.5 text-left text-[11px] font-semibold text-[#7C8388] uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-[#7C8388]">
                    Loading applications…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-6 text-[#7C8388]">
                    No applications yet. Use <strong>Add provider</strong> to create one.
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-[#E7EBEC] ${i === 0 ? 'bg-[#F3FBFC]' : 'bg-white'}`}
                >
                  <td className="px-5 py-3 font-semibold text-[#1A1D1F]">{row.legalName}</td>
                  <td className="px-5 py-3 text-[#4A5054]">{typeLabel(row.providerType)}</td>
                  <td className="px-5 py-3 text-[#4A5054] font-mono text-[12px]">{row.orgId || '—'}</td>
                  <td className="px-5 py-3">
                    <Badge variant={stageBadge(row.currentStage)}>
                      {STAGE_LABEL[row.currentStage] ?? row.currentStage}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/onboarding/provider/verify?id=${row.id}`}>
                      <Button variant="secondary" size="sm">
                        View detail
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
      </Card>
    </>
  );
}
