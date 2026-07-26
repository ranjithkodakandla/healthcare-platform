'use client';

import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';

interface PortalShellProps {
  portalName: string;
  orgName: string;
  userInitials: string;
  children: React.ReactNode;
}

/**
 * F2 enterprise shell — desktop persistent sidebar (≥1024);
 * tablet/phone: off-canvas drawer (UX Spec §9).
 */
export function PortalShell({ portalName, orgName, userInitials, children }: PortalShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-screen" style={{ background: '#F2F4F5' }}>
      {/* Desktop / laptop persistent sidebar */}
      <div className="shell-sidebar-desktop">
        <Sidebar portalName={portalName} orgName={orgName} />
      </div>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="shell-drawer-root" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="shell-drawer-backdrop"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="shell-drawer-panel">
            <div className="flex justify-end p-3">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-11 h-11 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.12)', color: '#fff' }}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <Sidebar
              portalName={portalName}
              orgName={orgName}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <TopHeader
          userInitials={userInitials}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto shell-main-pad">
          <div className="shell-content-max">{children}</div>
        </main>
      </div>

      {/* Menu FAB affordance for keyboard users when header menu is off-screen — header owns the button */}
      <span className="sr-only">
        <Menu aria-hidden />
      </span>
    </div>
  );
}
