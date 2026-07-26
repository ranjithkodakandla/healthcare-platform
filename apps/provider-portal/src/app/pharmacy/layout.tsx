import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';
export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="PHARMACY">
      <PortalShell portalName="Pharmacy Portal" orgName="MedPlus · Bengaluru" userInitials="MP">{children}</PortalShell>
    </PortalGuard>
  );
}
