import { PortalShell } from '@/components/shell/PortalShell';
export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalName="Pharmacy Portal" orgName="MedPlus · Bengaluru" userInitials="MP">{children}</PortalShell>;
}
