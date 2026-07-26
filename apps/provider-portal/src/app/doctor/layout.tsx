import { PortalShell } from '@/components/shell/PortalShell';

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell portalName="Doctor Portal" orgName="Apollo Hospitals · Bengaluru" userInitials="DS">
      {children}
    </PortalShell>
  );
}
