import { PortalShell } from '@/components/shell/PortalShell';
export default function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell portalName="Diagnostic Center Portal" orgName="Thyrocare · Bengaluru" userInitials="TC">{children}</PortalShell>;
}
