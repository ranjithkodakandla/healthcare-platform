'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileShell } from '@/components/shell/MobileShell'
import { LANGUAGE_META, LangCode, setStoredLang, t } from '@/lib/i18n'

export default function SplashPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<LangCode>('en')
  const strings = t(selected)
  const active = useMemo(
    () => LANGUAGE_META.find((l) => l.code === selected) ?? LANGUAGE_META[0],
    [selected],
  )

  function continueWithLanguage() {
    setStoredLang(selected)
    router.push('/onboarding/guest')
  }

  return (
    <MobileShell>
      <div
        className="flex-shrink-0 flex flex-col items-center justify-center gap-3 py-14"
        style={{ background: '#E9F3F0' }}
      >
        <div
          className="w-20 h-20 rounded-pill flex items-center justify-center"
          style={{ background: '#0F766E' }}
          aria-hidden
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3l7 3v6c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V6l7-3z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#1B2422' }}>Sahayak</h1>
        <p className="text-sm text-center px-10" style={{ color: '#5B6B68' }}>
          {strings.brandTagline}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <p className="text-sm font-semibold mb-3" style={{ color: '#5B6B68' }}>
          {strings.chooseLanguage}
        </p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Language">
          {LANGUAGE_META.map((lang) => {
            const isActive = selected === lang.code
            return (
              <button
                key={lang.code}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setSelected(lang.code)}
                className="flex items-center justify-between p-4 min-h-14 rounded-card border text-left"
                style={{
                  borderColor: isActive ? '#0F766E' : '#EAE5DC',
                  borderWidth: isActive ? '1.5px' : '1px',
                  background: isActive ? '#E9F3F0' : '#fff',
                }}
              >
                <span className="text-[16px] font-semibold" style={{ color: '#1B2422' }}>
                  {lang.native}
                </span>
                {isActive && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        <p className="text-xs mt-3" style={{ color: '#7A8884' }}>
          {strings.languageNote}
        </p>
      </div>

      <div className="p-5 flex-shrink-0">
        <button
          type="button"
          onClick={continueWithLanguage}
          className="w-full h-14 rounded-pill text-base font-bold text-white"
          style={{ background: '#0F766E' }}
        >
          {active.cta}
        </button>
      </div>
    </MobileShell>
  )
}
