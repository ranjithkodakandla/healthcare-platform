'use client';

// P-01: Portal Login — Firebase email/password → POST /v1/auth/session → Bearer token.

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { signInProvider } from '@/lib/auth';

const PORTAL_CHOICES = [
  { id: 'hospital', label: 'Hospital' },
  { id: 'doctor', label: 'Doctor' },
  { id: 'ambulance', label: 'Ambulance Operator' },
  { id: 'pharmacy', label: 'Pharmacy' },
  { id: 'blood_bank', label: 'Blood Bank' },
  { id: 'diagnostic', label: 'Diagnostic Center' },
  { id: 'insurance', label: 'Insurance' },
];

export default function LoginPage() {
  const router = useRouter();
  const [selectedPortal, setSelectedPortal] = useState('hospital');
  const [hospitalId, setHospitalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!hospitalId.trim() || !email.trim() || !password) {
      setError('Organization ID, email, and password are required');
      return;
    }
    setBusy(true);
    try {
      await signInProvider({ email, password, hospitalId });
      localStorage.setItem('provider_portal_type', selectedPortal);
      // Hospital console home (there is no /dashboard route in this app).
      router.push('/hospital/dashboard');
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

        <p className="text-[13px] font-semibold mb-2" style={{ color: '#4A5054' }}>
          What kind of workplace?
        </p>
        <div className="grid grid-cols-2 gap-2 mb-5" role="radiogroup" aria-label="Workplace type">
          {PORTAL_CHOICES.map((p) => {
            const active = selectedPortal === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setSelectedPortal(p.id)}
                className="rounded-[8px] min-h-12 px-3 py-3 text-[13px] font-semibold text-center transition-colors cursor-pointer"
                style={{
                  border: `1.5px solid ${active ? '#0B5C66' : '#E7EBEC'}`,
                  background: active ? '#DEF3F5' : '#FFFFFF',
                  color: active ? '#0B5C66' : '#4A5054',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <label htmlFor="provider-org-id" className="block text-[13px] font-semibold mb-1.5" style={{ color: '#4A5054' }}>
          Organization ID
        </label>
        <input
          id="provider-org-id"
          value={hospitalId}
          onChange={(e) => setHospitalId(e.target.value)}
          placeholder="Given by your hospital admin"
          className="w-full h-12 rounded-[8px] px-3 text-[15px] outline-none mb-1.5"
          style={{ border: '1px solid #C7CDD0', color: '#1A1D1F' }}
          disabled={busy}
          autoComplete="organization"
        />
        <p className="text-[12px] mb-3.5" style={{ color: '#7C8388' }}>
          Ask your admin if you do not have this ID.
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
