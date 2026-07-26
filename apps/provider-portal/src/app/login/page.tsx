'use client';

// P-01: Portal Login — Firebase email/password → POST /v1/auth/session → Bearer token.
// Which portal a signed-in user lands on is derived from the verified `providerType`
// the backend returns (Firebase custom claim), never from a pre-login UI choice — see
// Finding #1/#9 of PROVIDER_UAT_REPORT.md: a free-text org id and a self-selected
// "workplace type" let any account reach any other org's/portal's screens.

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { signInProvider } from '@/lib/auth';
import { PROVIDER_TYPE_LANDING_PATH } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Work email and password are required');
      return;
    }
    setBusy(true);
    try {
      const { providerType } = await signInProvider({ email, password });
      const landingPath = providerType ? PROVIDER_TYPE_LANDING_PATH[providerType] : null;
      if (!landingPath) {
        setError('This account is not linked to a provider portal. Contact your administrator.');
        return;
      }
      router.push(landingPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-10"
      style={{ background: '#F3FBFC' }}
    >
      <form
        onSubmit={onSubmit}
        className="w-full max-w-[420px] bg-white rounded-[12px] p-6 sm:p-9 mx-4"
        style={{ border: '1px solid #E7EBEC', boxShadow: '0 4px 12px rgba(26,29,31,0.08)' }}
      >
        <div
          className="w-11 h-11 rounded-[10px] flex items-center justify-center mb-[18px]"
          style={{ background: '#0B5C66' }}
        >
          <div className="relative w-[18px] h-[18px]">
            <div className="absolute left-[7px] top-0 w-1 h-[18px] bg-white rounded-sm" />
            <div className="absolute left-0 top-[7px] w-[18px] h-1 bg-white rounded-sm" />
          </div>
        </div>

        <h1 className="text-[20px] font-bold" style={{ color: '#1A1D1F' }}>
          Provider Portal sign in
        </h1>
        <p className="text-[14px] mt-1 mb-5" style={{ color: '#7C8388' }}>
          For hospital, pharmacy, ambulance, and partner staff
        </p>

        <label htmlFor="provider-email" className="block text-[13px] font-semibold mb-1.5" style={{ color: '#4A5054' }}>
          Work email
        </label>
        <input
          id="provider-email"
          type="email"
          placeholder="you@hospital.org"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-12 rounded-[8px] px-3 text-[15px] outline-none mb-3.5"
          style={{ border: '1px solid #C7CDD0', color: '#1A1D1F' }}
          disabled={busy}
          autoComplete="username"
        />

        <label htmlFor="provider-password" className="block text-[13px] font-semibold mb-1.5" style={{ color: '#4A5054' }}>
          Password
        </label>
        <input
          id="provider-password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-12 rounded-[8px] px-3 text-[15px] outline-none mb-[18px]"
          style={{ border: '1px solid #C7CDD0', color: '#1A1D1F' }}
          disabled={busy}
          autoComplete="current-password"
        />

        {error && (
          <p className="text-[12px] mb-3" style={{ color: '#C62E2E' }} role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full rounded-[8px] mb-3 min-h-12" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>

        <p className="text-[13px] text-center" style={{ color: '#7C8388' }}>
          Forgot password? Contact your hospital administrator to reset access.
        </p>
      </form>
    </div>
  );
}
