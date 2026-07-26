'use client';

import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

// A-08: Remote Session Assist — G6, FR-ADM-RSA-001.
// Live co-browse backend is not shipped yet — UI is honest about that (no silent clicks).
export default function RemoteAssistPage() {
  return (
    <>
      <TopBar title="Remote Session Assist" screenId="A-08" ref_="G6, FR-ADM-RSA-001" slug="support/remote-assist" />

      <div
        className="mb-4 rounded-md px-4 py-3 text-[13px]"
        style={{ background: '#FBF0D9', color: '#8A5A00' }}
        role="status"
      >
        Live remote assist (screen share, annotate, escalate) is not available yet. Session controls below are
        disabled until the FR-ADM-RSA-001 service ships — nothing is sent when you click them.
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[15px] font-bold text-[#1A1D1F]">Preview — no live session</div>
                <div className="text-[12px] text-[#7C8388] mt-0.5">
                  Placeholder layout for when remote assist is enabled
                </div>
              </div>
              <Badge variant="warning">Not connected</Badge>
            </div>

            <div className="h-52 rounded-lg bg-[#F2F4F5] border border-[#E7EBEC] flex items-center justify-center mb-4">
              <div className="text-center px-6">
                <div className="text-[13px] text-[#7C8388]">Citizen screen share will appear here</div>
                <div className="text-[11px] text-[#C7CDD0] mt-1">Requires consent + live session service</div>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button size="sm" disabled title="Not available yet">
                Send guidance message
              </Button>
              <Button variant="secondary" size="sm" disabled title="Not available yet">
                Annotate screen
              </Button>
              <Button variant="outline" size="sm" disabled title="Not available yet">
                Escalate to human
              </Button>
              <Button variant="danger" size="sm" className="ml-auto" disabled title="Not available yet">
                End session
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card padding="md">
            <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Session context</div>
            <p className="text-[12px] text-[#7C8388]">
              When live assist ships, ticket, consent, and case context will load here from the support session API.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
