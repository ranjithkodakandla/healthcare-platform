'use client';

// A-02: Operations Dashboard — G11.
// Wired to GET /v1/admin/platform/stats. Attention rail derived from live aggregates.
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { adminApi, type PlatformStats, ApiError } from '@/lib/api';

const REFRESH_MS = 30_000;

export default function DashboardPage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await adminApi.platform.stats();
      setStats(res.data);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) {
        setError('Please sign in again to continue');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load platform stats');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const attentionItems: Array<{ text: string; color: string; bg: string }> = [];
  if (stats) {
    if (stats.ambulances.requestsSearching > 0) {
      attentionItems.push({
        text: `${stats.ambulances.requestsSearching} ambulance request(s) still searching — check dispatch within 90 seconds`,
        color: '#D98C0E',
        bg: '#FBF0D9',
      });
    }
    if (stats.onboarding.pendingApplications > 0) {
      attentionItems.push({
        text: `${stats.onboarding.pendingApplications} provider application(s) waiting for credential review`,
        color: '#0B5C66',
        bg: '#DEF3F5',
      });
    }
    if (stats.beds.staleProviderCount > 0) {
      attentionItems.push({
        text: `${stats.beds.staleProviderCount} hospital(s) have outdated bed counts — follow up for fresh inventory`,
        color: '#C62E2E',
        bg: '#FBE3E3',
      });
    }
  }
  if (attentionItems.length === 0 && stats) {
    attentionItems.push({
      text: 'No urgent alerts — monitored targets look healthy',
      color: '#0E6B3A',
      bg: '#DFF5E9',
    });
  }

  const quickLinks: { label: string; href: string }[] = [
    { label: 'Review provider onboarding queue →', href: '/onboarding/provider' },
    { label: 'Open support ticket queue →', href: '/support/tickets' },
    { label: 'View SLA monitoring →', href: '/issues/sla' },
    { label: 'Search audit trail →', href: '/governance' },
  ];

  const analyticsRollup = stats
    ? [
        { label: 'Active cases', value: String(stats.cases.activeCases) },
        { label: 'Critical / emergency open', value: String(stats.cases.activeCriticalCases) },
        { label: 'Platform bed occupancy', value: `${stats.beds.platformOccupancyPercent}%` },
        { label: 'Drivers on duty', value: String(stats.ambulances.driversOnDuty) },
      ]
    : [
        { label: 'Active cases', value: '—' },
        { label: 'Critical / emergency open', value: '—' },
        { label: 'Platform bed occupancy', value: '—' },
        { label: 'Drivers on duty', value: '—' },
      ];

  return (
    <>
      <TopBar title="Operations Dashboard" screenId="A-02" ref_="G11" slug="dashboard" />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px] font-medium" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}

      <div className="mb-6 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7C8388] mb-2">
          Needs attention now
        </div>
        {loading && !stats ? (
          <div className="rounded-md px-4 py-3 text-[13px] text-[#7C8388] bg-[#F2F4F5]">Loading live signals…</div>
        ) : (
          attentionItems.map((item, i) => (
            <div
              key={i}
              className="rounded-md px-4 py-3 text-[13px] font-medium"
              style={{ background: item.bg, color: item.color }}
            >
              {item.text}
            </div>
          ))
        )}
      </div>

      <div className="stat-grid mb-6">
        {analyticsRollup.map((stat) => (
          <Card key={stat.label} padding="md">
            <div className="text-[11px] text-[#7C8388] font-medium mb-1">{stat.label}</div>
            <div className="text-2xl font-bold text-[#1A1D1F]">{stat.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card padding="md">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Quick links</div>
          <div className="space-y-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block text-[13px] text-[#0B5C66] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Platform health</div>
          <div className="space-y-2">
            {[
              {
                name: 'Registered hospitals',
                status: stats ? String(stats.beds.registeredHospitals) : '—',
                variant: 'success' as const,
                note: `${stats?.beds.availableBeds ?? '—'} beds available`,
              },
              {
                name: 'Ambulance matched',
                status: stats ? String(stats.ambulances.requestsMatched) : '—',
                variant: 'info' as const,
                note: `${stats?.ambulances.requestsSearching ?? 0} searching`,
              },
              {
                name: 'Approved providers',
                status: stats ? String(stats.onboarding.approvedProviders) : '—',
                variant: 'success' as const,
                note: `${stats?.onboarding.pendingApplications ?? 0} pending`,
              },
              {
                name: 'Stale inventory rows',
                status: stats ? String(stats.beds.staleProviderCount) : '—',
                variant: (stats?.beds.staleProviderCount ?? 0) > 0 ? ('warning' as const) : ('success' as const),
                note: 'Freshness',
              },
            ].map((h) => (
              <div key={h.name} className="flex items-center justify-between text-[13px]">
                <span className="text-[#1A1D1F] font-medium">{h.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={h.variant}>{h.status}</Badge>
                  <span className="text-[#7C8388] text-[11px]">{h.note}</span>
                </div>
              </div>
            ))}
          </div>
          <Link href="/monitoring" className="block mt-3 text-[12px] text-[#0B5C66] hover:underline">
            View full monitoring →
          </Link>
        </Card>
      </div>
    </>
  );
}
