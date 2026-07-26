'use client'

// C-29 — Profile / Family Linkage
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export default function ProfilePage() {
  const [name, setName] = useState('Guest')
  const [phone, setPhone] = useState<string | null>(null)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    try {
      const storedName = localStorage.getItem('sahayak_display_name')
      const guestPhone = localStorage.getItem('sahayak_guest_phone')
      const token = localStorage.getItem('sahayak_auth_token') || localStorage.getItem('citizen_token')
      if (storedName) setName(storedName)
      else if (localStorage.getItem('sahayak_guest_mode') === '1') setName('Guest')
      if (guestPhone) setPhone(guestPhone.replace(/(\+91)(\d{2})\d+(\d{3})/, '$1 $2••••$3'))
      setSignedIn(Boolean(token))
    } catch {
      /* ignore */
    }
  }, [])

  const initial = name === 'Guest' ? 'G' : name.slice(0, 1).toUpperCase()

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F4F1EA' }}>
      <div className="px-5 pt-10 pb-3 flex-shrink-0">
        <h1 className="text-xl font-bold" style={{ color: '#1B2422' }}>Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-5">
        <div className="flex items-center gap-3 mb-5">
          <div
            className="w-14 h-14 rounded-pill flex items-center justify-center text-lg font-bold"
            style={{ background: '#E9F3F0', color: '#0F766E' }}
            aria-hidden
          >
            {initial}
          </div>
          <div>
            <div className="text-base font-bold" style={{ color: '#1B2422' }}>{name}</div>
            <div className="text-sm" style={{ color: '#5B6B68' }}>
              {phone ?? (signedIn ? 'Signed in' : 'Using guest mode')}
            </div>
          </div>
        </div>

        {!signedIn && (
          <Link href="/onboarding/otp" className="block mb-4">
            <Card className="p-4 bg-white">
              <p className="text-base font-bold mb-1" style={{ color: '#1B2422' }}>
                Save your care history
              </p>
              <p className="text-sm mb-2" style={{ color: '#5B6B68' }}>
                Sign in with your mobile number to keep cases, family links, and preferences.
              </p>
              <span className="text-sm font-bold" style={{ color: '#0F766E' }}>
                Sign in with mobile →
              </span>
            </Card>
          </Link>
        )}

        <Card className="p-3 mb-4 bg-white flex justify-between items-center">
          <div className="text-sm font-semibold" style={{ color: '#1B2422' }}>ABHA health ID</div>
          <Badge variant="pending">{signedIn ? 'Not linked yet' : 'Sign in to link'}</Badge>
        </Card>

        <p className="text-sm font-semibold mb-2" style={{ color: '#5B6B68' }}>
          Family &amp; caregivers
        </p>
        <Card className="p-4 mb-3 bg-white">
          <p className="text-sm" style={{ color: '#5B6B68' }}>
            Add a family member so they can follow an emergency case with you. Available after you sign in.
          </p>
        </Card>
        <button
          type="button"
          disabled={!signedIn}
          className="text-sm font-semibold mb-5 min-h-11"
          style={{ color: signedIn ? '#0F766E' : '#7A8884' }}
        >
          + Add family member
        </button>

        <p className="text-sm font-semibold mb-2" style={{ color: '#5B6B68' }}>More</p>
        <div className="flex flex-col gap-2">
          {[
            { label: 'Privacy & consent', href: '/account/consent' },
            { label: 'Your data rights', href: '/account/privacy' },
            { label: 'Long-term care plans', href: '/account/chronic' },
            { label: 'Ambulance driver tools', href: '/driver/dispatch' },
          ].map((item) => (
            <Link key={item.label} href={item.href}>
              <Card className="p-4 bg-white flex justify-between items-center min-h-14">
                <span className="text-sm font-semibold" style={{ color: '#1B2422' }}>{item.label}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7A8884" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
