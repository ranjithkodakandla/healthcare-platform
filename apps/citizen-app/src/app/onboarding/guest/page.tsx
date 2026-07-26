'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MobileShell } from '@/components/shell/MobileShell'
import { getStoredLang, t } from '@/lib/i18n'

export default function GuestEntryPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [lang, setLang] = useState(getStoredLang())
  const s = t(lang)

  useEffect(() => {
    setLang(getStoredLang())
  }, [])

  function persistGuest(child?: boolean) {
    try {
      const digits = phone.replace(/\D/g, '')
      if (digits.length === 10) localStorage.setItem('sahayak_guest_phone', `+91${digits}`)
      else localStorage.removeItem('sahayak_guest_phone')
      localStorage.setItem('sahayak_guest_mode', '1')
      if (child === true) localStorage.setItem('sahayak_patient_is_child', '1')
      else if (child === false) localStorage.removeItem('sahayak_patient_is_child')
    } catch {
      /* ignore */
    }
  }

  function goEmergency(child: boolean, e?: FormEvent) {
    e?.preventDefault()
    persistGuest(child)
    router.push(child ? '/home/triage?patient=child' : '/home/triage')
  }

  function goBrowse() {
    persistGuest()
    router.push('/home/dashboard')
  }

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col px-5 pt-12 pb-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B2422' }}>
            {s.needHelpNow}
          </h1>
          <p className="text-[16px] leading-relaxed" style={{ color: '#5B6B68' }}>
            {s.guestHelp}
          </p>
        </div>

        <form onSubmit={(e) => goEmergency(false, e)} className="mb-3">
          <label htmlFor="guest-phone" className="text-sm font-semibold mb-2 block" style={{ color: '#5B6B68' }}>
            {s.mobileOptional}
          </label>
          <div
            className="h-14 border rounded-btn flex items-center px-3 gap-2"
            style={{ borderColor: '#D8D3C8', background: '#fff' }}
          >
            <span className="text-base font-semibold" style={{ color: '#5B6B68' }}>+91</span>
            <div className="w-px h-6" style={{ background: '#D8D3C8' }} aria-hidden />
            <input
              id="guest-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder={s.mobilePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="flex-1 text-base bg-transparent outline-none min-h-12"
              style={{ color: '#1B2422' }}
              aria-describedby="guest-phone-help"
            />
          </div>
          <p id="guest-phone-help" className="text-sm mt-2" style={{ color: '#7A8884' }}>
            {s.mobileHelp}
          </p>
          <p className="text-sm mt-3 leading-relaxed" style={{ color: '#5B6B68' }} role="note">
            In an emergency we use your approximate location and a few health questions to dispatch
            help. Phone number stays on this device unless you choose to share it. You can manage
            privacy choices after you sign in.
          </p>
        </form>

        <div className="flex-1" />

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => goEmergency(false)}
            className="w-full h-16 rounded-pill text-lg font-bold text-white"
            style={{ background: '#B3261E' }}
          >
            {s.requestAmbulance}
          </button>
          <button
            type="button"
            onClick={() => goEmergency(true)}
            className="w-full h-14 rounded-pill text-base font-bold"
            style={{ background: '#FBE3E3', color: '#8C1D1D', border: '1.5px solid #B3261E' }}
          >
            {s.childEmergency}
          </button>
          <button
            type="button"
            onClick={goBrowse}
            className="w-full h-14 rounded-pill text-base font-bold"
            style={{ background: '#E9F3F0', color: '#0F766E' }}
          >
            {s.browseServices}
          </button>
          <Link
            href="/driver/dispatch"
            className="w-full h-12 rounded-pill text-sm font-semibold flex items-center justify-center"
            style={{ color: '#5B6B68', border: '1px solid #EAE5DC' }}
            onClick={() => {
              try {
                localStorage.setItem('sahayak_driver_mode', '1')
              } catch {
                /* ignore */
              }
            }}
          >
            {s.imDriver}
          </Link>
          <div className="text-center">
            <Link
              href="/onboarding/otp"
              className="inline-flex min-h-11 items-center text-base font-semibold"
              style={{ color: '#0F766E' }}
            >
              {s.signInMobile}
            </Link>
          </div>
        </div>
      </div>
    </MobileShell>
  )
}
