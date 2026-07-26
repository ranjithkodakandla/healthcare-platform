import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// A-08: Remote Session Assist — G6, FR-ADM-RSA-001.
// Coordinator can view a citizen's live case context and annotate on their behalf (consent-gated).
export default function RemoteAssistPage() {
  return (
    <>
      <TopBar title="Remote Session Assist" screenId="A-08" ref_="G6, FR-ADM-RSA-001" slug="support/remote-assist" />

      <div className="grid grid-cols-3 gap-5">
        {/* Active session */}
        <div className="col-span-2 space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[15px] font-bold text-[#1A1D1F]">Live session — Priya Menon</div>
                <div className="text-[12px] text-[#7C8388] mt-0.5">ACC-22910 · CASE-88213 · Session started 4 min ago</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                <Badge variant="success">Connected</Badge>
              </div>
            </div>

            {/* Screen share placeholder */}
            <div className="h-52 rounded-lg bg-[#F2F4F5] border border-[#E7EBEC] flex items-center justify-center mb-4">
              <div className="text-center">
                <div className="text-3xl mb-2">📱</div>
                <div className="text-[13px] text-[#7C8388]">Citizen screen share (consent granted)</div>
                <div className="text-[11px] text-[#C7CDD0] mt-1">Viewing: Case Dashboard · C-09</div>
              </div>
            </div>

            {/* Coordinator actions */}
            <div className="flex gap-2">
              <Button size="sm">Send guidance message</Button>
              <Button variant="secondary" size="sm">Annotate screen</Button>
              <Button variant="outline" size="sm">Escalate to human</Button>
              <Button variant="danger" size="sm" className="ml-auto">End session</Button>
            </div>
          </Card>
        </div>

        {/* Session context */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Session context</div>
            <div className="space-y-2 text-[12px]">
              {[
                { label: 'Ticket', value: 'TCK-3390' },
                { label: 'Initiated by', value: 'A. Fernandes (support)' },
                { label: 'Consent', value: 'Granted at 2:38 PM' },
                { label: 'Reason', value: 'Ambulance tracking issue' },
              ].map((row) => (
                <div key={row.label} className="flex justify-between">
                  <span className="text-[#7C8388]">{row.label}</span>
                  <span className="font-medium text-[#1A1D1F] text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card padding="md">
            <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Recent sessions</div>
            <div className="space-y-2 text-[12px]">
              {[
                { name: 'Rahul Gupta', time: '1h ago', duration: '6 min' },
                { name: 'Vikram Singh', time: '3h ago', duration: '12 min' },
              ].map((s) => (
                <div key={s.name} className="flex justify-between text-[#4A5054]">
                  <span>{s.name}</span>
                  <span className="text-[#7C8388]">{s.time} · {s.duration}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
