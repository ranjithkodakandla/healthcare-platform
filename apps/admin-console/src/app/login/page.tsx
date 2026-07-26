'use client';

// A-01: Console Login — Firebase email/password → POST /v1/auth/session → Bearer token.
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInAdmin } from '@/lib/auth';

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
      setError('Enter your staff email and password');
      return;
    }
    setBusy(true);
    try {
      await signInAdmin({ email, password });
      router.push('/dashboard');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('auth/')
            ? 'Email or password is incorrect. Try again or ask a platform admin to reset access.'
            : err.message
          : 'Sign-in failed. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F5] flex items-center justify-center p-10">
      <form onSubmit={onSubmit} className="w-full max-w-[400px] bg-white rounded-lg border border-[#C7CDD0] p-6 sm:p-9 mx-4">
        <div className="w-11 h-11 rounded-md bg-[#1A1D1F] flex items-center justify-center mb-5" aria-hidden>
          <svg width="16" height="16" fill="none" viewBox="0 0 14 14">
            <rect x="5" y="0" width="4" height="14" rx="1" fill="white" />
            <rect x="0" y="5" width="14" height="4" rx="1" fill="white" />
          </svg>
        </div>

        <h1 className="text-[20px] font-bold text-[#1A1D1F]">Admin Console</h1>
        <p className="text-[14px] text-[#7C8388] mt-1 mb-6">
          Internal staff sign-in for support, onboarding, and platform operations
        </p>

        <label htmlFor="admin-email" className="block text-[13px] font-semibold text-[#4A5054] mb-1.5">
          Staff email
        </label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sahayak.in"
          className="w-full h-12 border border-[#C7CDD0] rounded-md px-3 text-[15px] text-[#1A1D1F] mb-3.5 outline-none"
          disabled={busy}
          autoComplete="username"
        />

        <label htmlFor="admin-password" className="block text-[13px] font-semibold text-[#4A5054] mb-1.5">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="w-full h-12 border border-[#C7CDD0] rounded-md px-3 text-[15px] text-[#1A1D1F] mb-5 outline-none"
          disabled={busy}
          autoComplete="current-password"
        />

        {error && (
          <p className="text-[13px] text-[#C62E2E] mb-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-md bg-[#1A1D1F] text-white flex items-center justify-center text-[15px] font-bold cursor-pointer hover:bg-[#0B5C66] transition-colors disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-[13px] text-[#7C8388] text-center mt-4">
          Need access or a password reset? Ask a Console Administrator.
        </p>
        <p className="text-[12px] text-[#7C8388] text-center mt-2">
          If your account uses two-factor authentication, you will be prompted after this step.
        </p>
      </form>
    </div>
  );
}
