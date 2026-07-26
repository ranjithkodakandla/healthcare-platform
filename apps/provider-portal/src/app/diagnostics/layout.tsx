import { PortalShell } from '@/components/shell/PortalShell';
import { PortalGuard } from '@/components/shell/PortalGuard';
export default function DiagnosticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard expected="DIAGNOSTIC_CENTER">
      <PortalShell portalName="Diagnostic Center Portal" orgName="Thyrocare · Bengaluru" userInitials="TC">{children}</PortalShell>
    </PortalGuard>
  );
}
