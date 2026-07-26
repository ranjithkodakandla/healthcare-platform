'use client'

// DPDP data principal rights — view / export / erase
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BackHeader } from '@/components/ui/BackHeader'
import { Card } from '@/components/ui/Card'
import { privacyApi } from '@/lib/api'
import { clearCitizenToken, getCitizenToken } from '@/lib/token'

export default function PrivacyRightsPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const signedIn = Boolean(getCitizenToken())

  useEffect(() => {
    if (!signedIn) return
    privacyApi
      .me()
      .then((r) => setSummary(r.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
  }, [signedIn])

  async function downloadExport() {
    setBusy(true)
    setError(null)
    try {
      const res = await privacyApi.export()
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sahayak-data-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  async function erase() {
    if (
      !confirm(
        'This will anonymize your personal data on Sahayak and deactivate your account. Continue?',
      )
    ) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await privacyApi.erasure(true, 'user_requested_from_app')
      clearCitizenToken()
      try {
        localStorage.removeItem('sahayak_guest_phone')
        localStorage.removeItem('sahayak_display_name')
        localStorage.removeItem('sahayak_active_case_id')
      } catch {
        /* ignore */
      }
      window.location.href = '/onboarding/splash'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erasure failed')
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F4F1EA' }}>
      <BackHeader title="Your data rights" backHref="/account/profile" />
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <Card className="p-4 bg-white">
          <p className="text-base font-bold mb-2" style={{ color: '#1B2422' }}>
            Under India&apos;s DPDP Act
          </p>
          <p className="text-sm" style={{ color: '#5B6B68' }}>
            You can see what we hold, download a copy, correct profile details, withdraw consent, or
            ask us to delete / anonymize your personal data.
          </p>
        </Card>

        {!signedIn ? (
          <Card className="p-4 bg-white">
            <p className="text-sm mb-2" style={{ color: '#5B6B68' }}>
              Sign in to use these rights for your account.
            </p>
            <Link href="/onboarding/otp" className="text-sm font-bold" style={{ color: '#0F766E' }}>
              Sign in →
            </Link>
          </Card>
        ) : (
          <>
            {summary && (
              <Card className="p-4 bg-white">
                <p className="text-sm" style={{ color: '#5B6B68' }}>
                  Active consents: {String(summary.activeConsents)} · Linked cases:{' '}
                  {String(summary.linkedCases)}
                </p>
                <p className="text-xs mt-2" style={{ color: '#7A8884' }}>
                  Policy v{String(summary.privacyPolicyVersion)} · Terms v
                  {String(summary.termsVersion)}
                </p>
              </Card>
            )}

            {error && (
              <p className="text-sm" style={{ color: '#C62E2E' }} role="alert">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => void downloadExport()}
              className="w-full min-h-12 rounded-pill text-base font-bold text-white"
              style={{ background: '#0F766E' }}
            >
              Download my data
            </button>

            <Link
              href="/account/consent"
              className="w-full min-h-12 rounded-pill text-base font-bold flex items-center justify-center"
              style={{ background: '#E9F3F0', color: '#0F766E' }}
            >
              Manage consents
            </Link>

            <button
              type="button"
              disabled={busy}
              onClick={() => void erase()}
              className="w-full min-h-12 rounded-pill text-base font-bold"
              style={{ background: '#FBE3E3', color: '#8C1D1D', border: '1px solid #B3261E' }}
            >
              Delete / anonymize my data
            </button>
          </>
        )}
      </div>
    </div>
  )
}
