'use client';

// P-11: Configuration — F2, G16. Hold-expiry windows, notification prefs, HMS/LIS webhook.
// Hold-expiry rows are now fetched from the real BR-02 config (severity-keyed:
// CRITICAL/PLANNED), replacing the previous hardcoded, category-keyed mock values
// (PROVIDER_UAT_REPORT.md Finding #7).

import { useCallback, useEffect, useState } from 'react';
import { CardPadded } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getSession, providerApi } from '@/lib/api';

function Toggle({ on }: { on: boolean }) {
  return (
    <div className="relative w-[38px] h-[22px] rounded-full flex-shrink-0" style={{ background: on ? '#0B5C66' : '#C7CDD0' }}>
      <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px]" style={{ [on ? 'right' : 'left']: 2 }} />
    </div>
  );
}

export default function ConfigPage() {
  const [holdExpiry, setHoldExpiry] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const hospitalId = getSession()?.hospitalId;
    if (!hospitalId) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await providerApi.config.get(hospitalId);
      setHoldExpiry(res.data.holdExpiry);
    } catch {
      setError('Failed to load configuration.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Configuration</h1>
      <div className="flex flex-col gap-4 max-w-[640px]">
        <CardPadded>
          <p className="text-[13px] font-bold mb-3">Hold-expiry windows (BR-02)</p>
          {loading ? (
            <div className="h-10 rounded bg-gray-100 animate-pulse" />
          ) : error ? (
            <p className="text-[12px] font-semibold" style={{ color: '#C62E2E' }}>{error}</p>
          ) : (
            holdExpiry.map((row, idx) => (
              <div
                key={row.label}
                className="flex justify-between items-center py-2"
                style={idx < holdExpiry.length - 1 ? { borderBottom: '1px solid #E7EBEC' } : undefined}
              >
                <p className="text-[13px]">{row.label}</p>
                <p className="text-[13px] font-semibold">{row.value}</p>
              </div>
            ))
          )}
        </CardPadded>

        <CardPadded>
          <p className="text-[13px] font-bold mb-3">Notification preferences</p>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #E7EBEC' }}>
            <p className="text-[13px]">In-portal + WhatsApp</p>
            <Toggle on={true} />
          </div>
          <div className="flex justify-between items-center py-2">
            <p className="text-[13px]">SMS fallback</p>
            <Toggle on={false} />
          </div>
        </CardPadded>

        <CardPadded>
          <p className="text-[13px] font-bold mb-3">HMS / LIS integration</p>
          <p className="text-[12px] mb-1.5" style={{ color: '#7C8388' }}>Webhook credential</p>
          <div
            className="h-10 rounded-[8px] flex items-center px-3 text-[13px] mb-2.5"
            style={{ border: '1px solid #C7CDD0', color: '#7C8388' }}
          >
            whk_live_••••••••••••4f2a
          </div>
          <Button variant="secondary" size="sm">Test connection</Button>
        </CardPadded>
      </div>
    </div>
  );
}
