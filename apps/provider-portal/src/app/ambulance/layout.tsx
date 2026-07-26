import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';
export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="AMBULANCE_OPERATOR">
      <PortalShell portalName="Ambulance Operator Portal" orgName="LifeLine Ambulance · KA Zone" userInitials="LL">{children}</PortalShell>
    </PortalGuard>
  );
}
