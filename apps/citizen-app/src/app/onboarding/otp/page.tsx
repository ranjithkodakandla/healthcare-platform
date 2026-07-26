'use client';

// C-03 — Registration / OTP Login (Firebase Phone Auth → POST /v1/auth/session)
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  ConfirmationResult,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth';
import { MobileShell } from '@/components/shell/MobileShell';
import { privacyApi } from '@/lib/api';
import { establishCitizenSession } from '@/lib/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function OtpPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  function ensureVerifier(): RecaptchaVerifier {
    if (verifierRef.current) return verifierRef.current;
    const auth = getFirebaseAuth();
    verifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
    return verifierRef.current;
  }

  async function sendOtp() {
    setError(null);
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setBusy(true);
    try {
      const e164 = `+91${digits}`;
      const confirmation = await signInWithPhoneNumber(getFirebaseAuth(), e164, ensureVerifier());
      confirmationRef.current = confirmation;
      setStep('otp');
      setResendIn(30);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } catch (err) {
      verifierRef.current?.clear();
      verifierRef.current = null;
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    setError(null);
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter the 6-digit OTP');
      return;
    }
    if (!acceptedPolicies) {
      setError('Please accept the Privacy Policy and Terms to continue');
      return;
    }
    if (!confirmationRef.current) {
      setError('Request a new OTP first');
      return;
    }
    setBusy(true);
    try {
      const cred = await confirmationRef.current.confirm(code);
      const idToken = await cred.user.getIdToken();
      await establishCitizenSession(idToken);
      try {
        await privacyApi.accept({
          privacyPolicy: true,
          terms: true,
          emergencyProcessing: true,
        });
        localStorage.setItem('sahayak_privacy_accepted', '1');
      } catch {
        // Consent API failure must not block emergency access; user can retry in Account.
      }
      router.push('/home/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid OTP');
    } finally {
      setBusy(false);
    }
  }

  function onOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 'phone') void sendOtp();
    else void verifyOtp();
  }

  return (
    <MobileShell>
      <form className="flex-1 flex flex-col px-5 pt-10 pb-8" onSubmit={onSubmit}>
        <Link href="/onboarding/guest" className="mb-8 block">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </Link>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#1B2422' }}>
          {step === 'phone' ? 'Enter your number' : 'Enter OTP'}
        </h1>
        <p className="text-sm mb-8" style={{ color: '#5B6B68' }}>
          {step === 'phone'
            ? "We'll send a 6-digit OTP to verify your identity."
            : `Code sent to +91 ${phone.replace(/\D/g, '')}`}
        </p>

        <div className="mb-5">
          <div
            className="h-12 border rounded-btn flex items-center px-3 gap-2"
            style={{ borderColor: '#0F766E', borderWidth: '1.5px', background: '#fff' }}
          >
            <span className="text-sm font-semibold" style={{ color: '#5B6B68' }}>+91</span>
            <div className="w-px h-5" style={{ background: '#D8D3C8' }} />
            <input
              type="tel"
              inputMode="numeric"
              placeholder="10-digit mobile number"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: '#1B2422' }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy || step === 'otp'}
              maxLength={10}
            />
          </div>
        </div>

        {step === 'otp' && (
          <div className="mb-4">
            <label className="text-xs font-semibold uppercase tracking-wider mb-2 block" style={{ color: '#7A8884' }}>
              One-time password
            </label>
            <div className="flex gap-2">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  className="flex-1 h-12 rounded-btn border text-center text-lg font-bold outline-none"
                  style={{ borderColor: '#D8D3C8', background: '#fff', color: '#1B2422' }}
                  value={digit}
                  onChange={(e) => onOtpChange(i, e.target.value)}
                  disabled={busy}
                />
              ))}
            </div>
            <p className="text-xs mt-2" style={{ color: '#7A8884' }}>
              {resendIn > 0 ? (
                <>
                  Resend OTP in{' '}
                  <span className="font-semibold" style={{ color: '#0F766E' }}>
                    00:{String(resendIn).padStart(2, '0')}
                  </span>
                </>
              ) : (
                <button
                  type="button"
                  className="font-semibold"
                  style={{ color: '#0F766E' }}
                  onClick={() => void sendOtp()}
                  disabled={busy}
                >
                  Resend OTP
                </button>
              )}
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm mb-3" style={{ color: '#B3261E' }} role="alert">
            {error}
          </p>
        )}

        <div className="flex-1" />
        <div id="recaptcha-container" />

        {step === 'phone' && (
          <label className="flex items-start gap-3 mb-4 min-h-11">
            <input
              type="checkbox"
              checked={acceptedPolicies}
              onChange={(e) => setAcceptedPolicies(e.target.checked)}
              className="mt-1 h-5 w-5 flex-shrink-0"
              style={{ accentColor: '#0F766E' }}
            />
            <span className="text-sm" style={{ color: '#5B6B68' }}>
              I agree to the{' '}
              <Link href="/account/consent" className="font-semibold" style={{ color: '#0F766E' }}>
                Privacy Policy
              </Link>{' '}
              and Terms. Sahayak may use my mobile number and limited location to coordinate care when
              I request help.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={busy || (step === 'phone' && !acceptedPolicies)}
          className="w-full h-14 rounded-pill text-base font-bold text-white disabled:opacity-60"
          style={{ background: '#0F766E' }}
        >
          {busy ? 'Please wait…' : step === 'phone' ? 'Send OTP' : 'Verify & Continue'}
        </button>
      </form>
    </MobileShell>
  );
}
