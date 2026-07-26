import { PortalShell } from '@/components/shell/PortalShell';

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      portalName="Hospital Portal"
      orgName="Apollo Hospitals · Bengaluru"
      userInitials="AS"
    >
      {children}
    </PortalShell>
  );
}
