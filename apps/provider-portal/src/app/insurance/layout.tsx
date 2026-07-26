import { PortalShell } from '@/components/shell/PortalShell';
export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalName="Insurance Portal" orgName="Star Health · KA Zone" userInitials="SH">{children}</PortalShell>;
}
