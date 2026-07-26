'use client'

// C-30 — Consent Management (Part I1 / DPDP)
import { useEffect, useState } from 'react'
import { BackHeader } from '@/components/ui/BackHeader'
import { Card } from '@/components/ui/Card'
import { privacyApi } from '@/lib/api'
import { getCitizenToken } from '@/lib/token'

type ConsentRow = {
  id: string
  purpose: string
  granteeId: string
  grantedAt: string
  revokedAt?: string | null
  scope?: Record<string, unknown> | null
}

function Toggle({
  enabled,
  onClick,
  disabled,
}: {
  enabled: boolean
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      role="switch"
      aria-checked={enabled}
      className="relative flex-shrink-0 min-h-11 min-w-[44px]"
      style={{
        width: 44,
        height: 28,
        borderRadius: 999,
        background: enabled ? '#0F766E' : '#D8D3C8',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: '#fff',
          position: 'absolute',
          top: 3,
          right: enabled ? 3 : undefined,
          left: enabled ? undefined : 3,
        }}
      />
    </button>
  )
}

function purposeLabel(purpose: string): string {
  if (purpose.startsWith('PRIVACY_POLICY')) return 'Privacy Policy'
  if (purpose.startsWith('TERMS_OF_SERVICE')) return 'Terms of Service'
  if (purpose.startsWith('EMERGENCY_PROCESSING')) return 'Emergency care processing'
  if (purpose.startsWith('MARKETING')) return 'Product updates (optional)'
  if (purpose.startsWith('ABHA')) return 'ABHA health ID link'
  if (purpose.startsWith('ACCOUNT_DEACTIVATED')) return 'Account deactivated'
  return purpose
}

export default function ConsentManagementPage() {
  const [rows, setRows] = useState<ConsentRow[]>([])
  const [notice, setNotice] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const signedIn = Boolean(getCitizenToken())

  async function refresh() {
    if (!signedIn) return
    const res = await privacyApi.consents()
    setRows(res.data as ConsentRow[])
  }

  useEffect(() => {
    privacyApi
      .notices()
      .then((n) => setNotice(n.data.summary))
      .catch(() => setNotice('You control how Sahayak uses your personal data.'))
    if (!signedIn) return
    privacyApi
      .consents()
      .then((res) => setRows(res.data as ConsentRow[]))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load consents'))
  }, [signedIn])

  async function acceptCore() {
    setBusy(true)
    setError(null)
    try {
      await privacyApi.accept({ privacyPolicy: true, terms: true, emergencyProcessing: true })
      try {
        localStorage.setItem('sahayak_privacy_accepted', '1')
      } catch {
        /* ignore */
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save consent')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(id: string) {
    setBusy(true)
    setError(null)
    try {
      await privacyApi.revoke(id)
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not withdraw consent')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#fff' }}>
      <BackHeader title="Privacy & consent" backHref="/account/profile" />

      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-sm mb-4" style={{ color: '#5B6B68' }}>{notice}</p>
        <p className="text-sm mb-4" style={{ color: '#5B6B68' }}>
          Each permission is separate. You can withdraw any time. Emergency dispatch may still use
          limited location and triage answers when you request an ambulance.
        </p>

        {!signedIn ? (
          <Card className="p-4 bg-white mb-4">
            <p className="text-base font-bold mb-2" style={{ color: '#1B2422' }}>Sign in to manage consents</p>
            <p className="text-sm mb-3" style={{ color: '#5B6B68' }}>
              Guest mode can request help without an account. Sign in to save privacy choices and
              download your data.
            </p>
            <a href="/onboarding/otp" className="text-sm font-bold" style={{ color: '#0F766E' }}>
              Sign in with mobile →
            </a>
          </Card>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void acceptCore()}
              className="w-full min-h-12 rounded-pill text-base font-bold text-white mb-4"
              style={{ background: '#0F766E' }}
            >
              Accept Privacy Policy &amp; Terms
            </button>

            {error && (
              <p className="text-sm mb-3" style={{ color: '#C62E2E' }} role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              {rows.length === 0 && (
                <Card className="p-4 bg-white">
                  <p className="text-sm" style={{ color: '#5B6B68' }}>
                    No saved consents yet. Tap accept above to record your choices with a timestamp.
                  </p>
                </Card>
              )}
              {rows.map((c) => {
                const active = !c.revokedAt
                return (
                  <Card
                    key={c.id}
                    className="p-3 bg-white flex items-center gap-3"
                    style={{ opacity: active ? 1 : 0.55 }}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: '#1B2422' }}>
                        {purposeLabel(c.purpose)}
                      </div>
                      <div className="text-xs" style={{ color: '#7A8884' }}>
                        {active ? 'Active' : 'Withdrawn'} ·{' '}
                        {new Date(c.grantedAt).toLocaleString()}
                        {c.scope && typeof c.scope === 'object' && 'version' in c.scope
                          ? ` · v${String((c.scope as { version?: string }).version)}`
                          : ''}
                      </div>
                    </div>
                    <Toggle
                      enabled={active}
                      disabled={busy || !active || c.purpose.startsWith('ACCOUNT_DEACTIVATED')}
                      onClick={() => {
                        if (active) void revoke(c.id)
                      }}
                    />
                  </Card>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
