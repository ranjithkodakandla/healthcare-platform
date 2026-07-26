import Link from 'next/link';
import { TopBar } from '@/components/shell/TopBar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

// A-05: Provider Verification Detail — G4.
export default function ProviderVerifyPage() {
  const stages = [
    { num: '✓', label: 'Application', dotBg: '#1E9E5C', dotColor: '#fff', dotBorder: '#1E9E5C', labelColor: '#0E6B3A' },
    { num: '2', label: 'Credential Verification', dotBg: '#fff', dotColor: '#0B5C66', dotBorder: '#0B5C66', labelColor: '#1A1D1F' },
    { num: '3', label: 'Integration Test', dotBg: '#fff', dotColor: '#C7CDD0', dotBorder: '#C7CDD0', labelColor: '#7C8388' },
    { num: '4', label: 'Go-Live Approval', dotBg: '#fff', dotColor: '#C7CDD0', dotBorder: '#C7CDD0', labelColor: '#7C8388' },
  ];

  const checklist = [
    { name: 'NABH Accreditation', source: 'NABH registry', status: 'Checking', variant: 'warning' as const },
    { name: 'Government Hospital Registry', source: 'State registry', status: 'Verified', variant: 'success' as const },
    { name: 'HMS Webhook Integration', source: 'Sandbox test cycle', status: 'Pending', variant: 'warning' as const },
    { name: 'Business Registration', source: 'Manual document review', status: 'Verified', variant: 'success' as const },
  ];

  const docs = [
    { name: 'NABH_Certificate.pdf', size: '1.2 MB' },
    { name: 'Registration_Cert.pdf', size: '840 KB' },
    { name: 'Facility_Photos.zip', size: '6.4 MB' },
  ];

  return (
    <>
      <TopBar
        title="Provider Verification Detail"
        screenId="A-05"
        ref_="G4"
        slug="onboarding/provider/verify"
        actions={<Link href="/onboarding/provider"><Button variant="outline" size="sm">← Back to queue</Button></Link>}
      />

      {/* Provider header */}
      <Card padding="md" className="mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[18px] font-bold text-[#1A1D1F]">Apollo Hospital, Whitefield</div>
            <div className="text-[13px] text-[#7C8388] mt-0.5">Type: Hospital · APP-4471 · Submitted Jul 20, 2026</div>
          </div>
          <Badge variant="warning">Stage 2 — Credential Verification</Badge>
        </div>

        {/* Stage progress */}
        <div className="flex items-center gap-0 mt-5">
          {stages.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold border-2"
                  style={{ background: s.dotBg, color: s.dotColor, borderColor: s.dotBorder }}
                >
                  {s.num}
                </div>
                <div className="text-[11px] mt-1 text-center max-w-[80px]" style={{ color: s.labelColor }}>
                  {s.label}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="h-0.5 w-10 bg-[#E7EBEC] mx-1 mb-4" />
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5">
        {/* Credential checklist */}
        <Card padding="md">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Credential verification checklist</div>
          <div className="space-y-3">
            {checklist.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-[#1A1D1F]">{item.name}</div>
                  <div className="text-[11px] text-[#7C8388]">{item.source}</div>
                </div>
                <Badge variant={item.variant}>{item.status}</Badge>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="primary" size="sm">Advance to Stage 3</Button>
            <Button variant="danger" size="sm">Reject application</Button>
          </div>
        </Card>

        {/* Uploaded documents */}
        <Card padding="md">
          <div className="text-[13px] font-semibold text-[#1A1D1F] mb-3">Uploaded documents</div>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.name} className="flex items-center justify-between py-2 border-b border-[#E7EBEC] last:border-0">
                <div className="flex items-center gap-2">
                  <svg width="14" height="16" fill="none" viewBox="0 0 14 16">
                    <rect x="0" y="0" width="14" height="16" rx="2" fill="#DEF3F5" />
                    <rect x="3" y="4" width="8" height="1.5" rx="0.5" fill="#0B5C66" />
                    <rect x="3" y="7" width="8" height="1.5" rx="0.5" fill="#0B5C66" />
                    <rect x="3" y="10" width="5" height="1.5" rx="0.5" fill="#0B5C66" />
                  </svg>
                  <span className="text-[13px] text-[#1A1D1F]">{doc.name}</span>
                </div>
                <span className="text-[12px] text-[#7C8388]">{doc.size}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
