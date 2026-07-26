import { PortalShell } from '@/components/shell/PortalShell';
export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalName="Ambulance Operator Portal" orgName="LifeLine Ambulance · KA Zone" userInitials="LL">{children}</PortalShell>;
}
