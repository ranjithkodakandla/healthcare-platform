import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="DOCTOR">
      <PortalShell portalName="Doctor Portal" orgName="Apollo Hospitals · Bengaluru" userInitials="DS">
        {children}
      </PortalShell>
    </PortalGuard>
  );
}
