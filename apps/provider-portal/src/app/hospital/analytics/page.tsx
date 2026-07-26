// P-08: Analytics — F2, G12. Benchmark vs zone peers toggle.

import { CardPadded } from '@/components/ui/Card';

const CHART_BG = 'repeating-linear-gradient(120deg,#F3FBFC,#F3FBFC 8px,#DEF3F5 8px,#DEF3F5 16px)';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-[20px] font-bold">Analytics</h1>
        <button
          type="button"
          className="text-[13px] font-semibold min-h-11 px-4 rounded-[6px]"
          style={{ color: '#0B5C66', background: '#DEF3F5' }}
          aria-pressed="true"
        >
          Compare with nearby hospitals: On
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <CardPadded>
          <p className="text-[13px] font-bold mb-2.5">Occupancy trend — 30 days</p>
          <div className="h-[180px] rounded-[8px] flex items-center justify-center font-mono text-[11px]"
            style={{ background: CHART_BG, color: '#0B5C66' }}>
            occupancy line chart
          </div>
        </CardPadded>
        <CardPadded>
          <p className="text-[13px] font-bold mb-2.5">Admission source</p>
          <div className="h-[180px] rounded-[8px] flex items-center justify-center font-mono text-[11px]"
            style={{ background: CHART_BG, color: '#0B5C66' }}>
            breakdown chart
          </div>
        </CardPadded>
      </div>
    </div>
  );
}
