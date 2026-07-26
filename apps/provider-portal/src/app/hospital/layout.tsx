import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="HOSPITAL">
      <PortalShell
        portalName="Hospital Portal"
        orgName="Apollo Hospitals · Bengaluru"
        userInitials="AS"
      >
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
