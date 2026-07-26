// P-11: Configuration — F2, G16. Hold-expiry windows, notification prefs, HMS/LIS webhook.

import { CardPadded } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

function Toggle({ on }: { on: boolean }) {
  return (
    <div className="relative w-[38px] h-[22px] rounded-full flex-shrink-0" style={{ background: on ? '#0B5C66' : '#C7CDD0' }}>
      <div className="w-[18px] h-[18px] rounded-full bg-white absolute top-[2px]" style={{ [on ? 'right' : 'left']: 2 }} />
    </div>
  );
}

export default function ConfigPage() {
  return (
    <div>
      <h1 className="text-[20px] font-bold mb-4">Configuration</h1>
      <div className="flex flex-col gap-4 max-w-[640px]">
        <CardPadded>
          <p className="text-[13px] font-bold mb-3">Hold-expiry windows</p>
          <div className="flex justify-between items-center py-2" style={{ borderBottom: '1px solid #E7EBEC' }}>
            <p className="text-[13px]">General bed hold expiry</p>
            <p className="text-[13px] font-semibold">10 min</p>
          </div>
          <div className="flex justify-between items-center py-2">
            <p className="text-[13px]">ICU/Ventilator hold expiry</p>
            <p className="text-[13px] font-semibold">5 min</p>
          </div>
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
