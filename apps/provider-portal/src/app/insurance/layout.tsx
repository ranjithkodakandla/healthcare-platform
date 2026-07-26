import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';
export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="INSURER">
      <PortalShell portalName="Insurance Portal" orgName="Star Health · KA Zone" userInitials="SH">{children}</PortalShell>
    </PortalGuard>
  );
}
