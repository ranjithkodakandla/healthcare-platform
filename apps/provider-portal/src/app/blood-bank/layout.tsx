import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';
export default function BloodBankLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="BLOOD_BANK">
      <PortalShell portalName="Blood Bank Portal" orgName="Rotary Blood Bank · Bengaluru" userInitials="RB">{children}</PortalShell>
    </PortalGuard>
  );
}
