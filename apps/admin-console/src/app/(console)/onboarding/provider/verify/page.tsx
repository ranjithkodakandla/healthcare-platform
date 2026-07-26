'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  adminApi,
  getAdminProfile,
  getAdminToken,
  STAGE_LABEL,
  type ProviderApplicationDetail,
  ApiError,
} from '@/lib/api';

const STAGE_ORDER = [
  'APPLICATION_INTAKE',
  'CREDENTIAL_VERIFICATION',
  'INTEGRATION_TEST',
  'GO_LIVE_APPROVAL',
  'PORTAL_ACCESS_ACTIVATED',
] as const;

function stageVisual(
  stage: string,
  stages: ProviderApplicationDetail['stages'],
  rejected: boolean,
) {
  const row = stages.find((s) => s.stage === stage);
  const status = row?.status ?? 'PENDING';
  if (rejected && status === 'REJECTED') {
    return { num: '✕', dotBg: '#C62E2E', dotColor: '#fff', dotBorder: '#C62E2E', labelColor: '#C62E2E' };
  }
  if (status === 'COMPLETE') {
    return { num: '✓', dotBg: '#1E9E5C', dotColor: '#fff', dotBorder: '#1E9E5C', labelColor: '#0E6B3A' };
  }
  const firstPending = STAGE_ORDER.find((s) => {
    const r = stages.find((x) => x.stage === s);
    return !r || r.status !== 'COMPLETE';
  });
  if (stage === firstPending) {
    return { num: String(STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]) + 1), dotBg: '#fff', dotColor: '#0B5C66', dotBorder: '#0B5C66', labelColor: '#1A1D1F' };
  }
  return {
    num: String(STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]) + 1),
    dotBg: '#fff',
    dotColor: '#C7CDD0',
    dotBorder: '#C7CDD0',
    labelColor: '#7C8388',
  };
}

function ProviderVerifyInner() {
  const search = useSearchParams();
  const id = search.get('id');
  const [app, setApp] = useState<ProviderApplicationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [checks, setChecks] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    if (!id) {
      setError('Open a provider from the onboarding queue (missing application id).');
      return;
    }
    try {
      const res = await adminApi.providers.get(id);
      setApp(res.data);
      const init: Record<string, boolean> = {};
      for (const c of res.data.checklist ?? []) init[c.key] = false;
      setChecks(init);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isUnauthorized) return;
      setError(err instanceof Error ? err.message : 'Failed to load application');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const rejected = app?.currentStage === 'REJECTED' || app?.stages?.some((s) => s.status === 'REJECTED');
  const nextStage = app?.nextStage ?? null;
  const needsChecklist = nextStage === 'CREDENTIAL_VERIFICATION';
  const checklistComplete =
    !needsChecklist ||
    ((app?.checklist?.length ?? 0) > 0 && Object.values(checks).every(Boolean));

  const stageUi = useMemo(() => {
    if (!app) return [];
    return STAGE_ORDER.map((stage) => ({
      stage,
      label: STAGE_LABEL[stage] ?? stage,
      ...stageVisual(stage, app.stages ?? [], Boolean(rejected)),
    }));
  }, [app, rejected]);

  async function downloadDoc(docKey: string, name: string) {
    if (!app) return;
    const token = getAdminToken();
    const url = adminApi.providers.documentUrl(app.id, docKey);
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      setMsg(`Download failed (${res.status})`);
      return;
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    URL.revokeObjectURL(href);
  }

  async function advance() {
    if (!app || !nextStage) return;
    if (needsChecklist && !checklistComplete) {
      setMsg('Complete the credential checklist before advancing.');
      return;
    }
    const profile = getAdminProfile();
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.providers.approveStage(
        app.id,
        nextStage,
        profile?.uid || 'console-admin',
        `Advanced by ${profile?.displayName || 'admin'}`,
        needsChecklist ? true : undefined,
      );
      setMsg(`Advanced: ${STAGE_LABEL[nextStage] ?? nextStage} marked complete`);
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Advance failed');
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!app) return;
    const confirmed = window.confirm(
      'Reject this provider application? This cannot be undone from the console.',
    );
    if (!confirmed) return;
    const reason = window.prompt('Rejection reason (required):');
    if (reason == null) return;
    if (!reason.trim()) {
      setMsg('Rejection reason is required');
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.providers.reject(app.id, reason.trim());
      setMsg('Application rejected');
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar
        title="Provider Verification Detail"
        screenId="A-05"
        ref_="G4"
        slug="onboarding/provider/verify"
        actions={
          <Link href="/onboarding/provider">
            <Button variant="outline" size="sm">
              ← Back to queue
            </Button>
          </Link>
        }
      />

      {error && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px]" style={{ background: '#FBE3E3', color: '#C62E2E' }}>
          {error}
        </div>
      )}
      {msg && (
        <div className="mb-4 rounded-md px-4 py-3 text-[13px]" style={{ background: '#DEF3F5', color: '#0B5C66' }} role="status">
          {msg}
        </div>
      )}

      {!app && !error && <div className="text-[13px] text-[#7C8388]">Loading application…</div>}

      {app && (
        <>
          <Card padding="md" className="mb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[18px] font-bold text-[#1A1D1F]">{app.legalName}</div>
                <div className="text-[13px] text-[#7C8388] mt-0.5">
                  Type: {app.providerType.replace(/_/g, ' ')} · ID {app.id.slice(0, 8)}…
                  {app.orgId ? ` · Org ${app.orgId}` : ''}
                  {app.portalEmail ? ` · Portal ${app.portalEmail}` : ''}
                </div>
              </div>
              <Badge variant={rejected ? 'danger' : 'warning'}>
                {rejected ? 'Rejected' : STAGE_LABEL[app.currentStage] ?? app.currentStage}
              </Badge>
            </div>

            <div className="flex items-center gap-0 mt-5 flex-wrap">
              {stageUi.map((s, i) => (
                <div key={s.stage} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2"
                      style={{ background: s.dotBg, color: s.dotColor, borderColor: s.dotBorder }}
                    >
                      {s.num}
                    </div>
                    <div className="text-[11px] mt-1 text-center max-w-[90px]" style={{ color: s.labelColor }}>
                      {s.label}
                    </div>
                  </div>
                  {i < stageUi.length - 1 && <div className="h-0.5 w-8 bg-[#E7EBEC] mx-1 mb-4" />}
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Documents</div>
              <ul className="space-y-2 mb-4">
                {(app.documents ?? []).map((d) => (
                  <li key={d.key} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#4A5054]">{d.name}</span>
                    <Button size="sm" variant="outline" onClick={() => void downloadDoc(d.key, d.name)}>
                      Download
                    </Button>
                  </li>
                ))}
                {(app.documents ?? []).length === 0 && (
                  <li className="text-[12px] text-[#7C8388]">No documents listed for this provider type.</li>
                )}
              </ul>

              {needsChecklist && (
                <>
                  <div className="text-[13px] font-semibold text-[#1A1D1F] mb-2">Credential checklist</div>
                  <ul className="space-y-2 mb-4">
                    {(app.checklist ?? []).map((c) => (
                      <li key={c.key}>
                        <label className="flex items-start gap-2 text-[13px] text-[#4A5054]">
                          <input
                            type="checkbox"
                            checked={Boolean(checks[c.key])}
                            onChange={(e) => setChecks((prev) => ({ ...prev, [c.key]: e.target.checked }))}
                          />
                          <span>{c.label}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Stage actions</div>
              <p className="text-[12px] text-[#7C8388] mb-4">
                {nextStage
                  ? `Next action: complete ${STAGE_LABEL[nextStage] ?? nextStage}.`
                  : rejected
                    ? 'This application was rejected.'
                    : 'All stages complete — portal access is activated.'}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy || !nextStage || rejected || !checklistComplete}
                  onClick={() => void advance()}
                >
                  {nextStage
                    ? `Advance: ${STAGE_LABEL[nextStage] ?? nextStage}`
                    : 'No further stages'}
                </Button>
                <Button variant="danger" size="sm" disabled={busy || rejected || !nextStage} onClick={() => void reject()}>
                  Reject application
                </Button>
              </div>
            </Card>

            <Card padding="md">
              <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Stage log</div>
              <div className="space-y-2">
                {(app.stages ?? [])
                  .slice()
                  .sort(
                    (a, b) =>
                      STAGE_ORDER.indexOf(a.stage as (typeof STAGE_ORDER)[number]) -
                      STAGE_ORDER.indexOf(b.stage as (typeof STAGE_ORDER)[number]),
                  )
                  .map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2 border-b border-[#E7EBEC] last:border-0"
                    >
                      <span className="text-[13px] text-[#1A1D1F]">
                        {STAGE_LABEL[s.stage] ?? s.stage}
                      </span>
                      <Badge
                        variant={
                          s.status === 'COMPLETE' ? 'success' : s.status === 'REJECTED' ? 'danger' : 'warning'
                        }
                      >
                        {s.status}
                      </Badge>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

export default function ProviderVerifyPage() {
  return (
    <Suspense fallback={<div className="text-[13px] text-[#7C8388] p-4">Loading…</div>}>
      <ProviderVerifyInner />
    </Suspense>
  );
}
