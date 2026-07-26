'use client';

// Client-side route guard for the 7 provider portals (Finding #1/#9,
// PROVIDER_UAT_REPORT.md): each portal's layout wraps its children in this guard so a
// session for one provider type can no longer render another portal's screens just by
// navigating to its URL. This is UX/defense-in-depth only — the real security boundary
// is the API's OrgScopeGuard (apps/api/src/shared-services/auth/org-scope.guard.ts),
// which rejects cross-org requests server-side regardless of what the UI shows.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession } from '@/lib/api';
import { ProviderType } from '@/lib/types';

interface PortalGuardProps {
  expected: ProviderType;
  children: React.ReactNode;
}

export function PortalGuard({ expected, children }: PortalGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ok' | 'denied'>('checking');

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }
    if (session.providerType !== expected) {
      setStatus('denied');
      return;
    }
    setStatus('ok');
  }, [expected, router]);

  if (status === 'checking') {
    return null;
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center p-10" style={{ background: '#F2F4F5' }}>
        <div
          className="max-w-[420px] text-center bg-white rounded-[12px] p-8"
          style={{ border: '1px solid #E7EBEC' }}
          role="alert"
        >
          <h1 className="text-[18px] font-bold mb-2" style={{ color: '#1A1D1F' }}>
            Not authorized
          </h1>
          <p className="text-[14px] mb-5" style={{ color: '#7C8388' }}>
            Your account does not have access to this portal. If you believe this is a
            mistake, contact your administrator.
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="h-11 px-5 rounded-[8px] text-[14px] font-semibold"
            style={{ background: '#0B5C66', color: '#FFFFFF' }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
