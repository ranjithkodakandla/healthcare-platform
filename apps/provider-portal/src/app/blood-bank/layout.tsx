import { PortalShell } from '@/components/shell/PortalShell';
export default function BloodBankLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalName="Blood Bank Portal" orgName="Rotary Blood Bank · Bengaluru" userInitials="RB">{children}</PortalShell>;
}
