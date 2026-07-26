'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { getAdminToken } from '@/lib/api';

function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Admin enterprise shell — persistent sidebar ≥1280px;
 * tablet/phone: off-canvas drawer (UX Spec §9).
 */
export function ConsoleShell({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (!getAdminToken()) {
      window.location.assign('/login');
      return;
    }
    setAuthed(true);
  }, []);

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

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F5] text-[13px] text-[#7C8388]">
        Checking session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F2F4F5]">
      <div className="admin-sidebar-desktop">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="admin-drawer-root" role="dialog" aria-modal="true" aria-label="Console navigation">
          <button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="admin-drawer-panel">
            <div className="flex justify-end p-3 bg-[#1A1D1F]">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="w-11 h-11 rounded-lg flex items-center justify-center text-white"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                aria-label="Close menu"
              >
                <IconClose />
              </button>
            </div>
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="admin-mobile-bar">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 rounded-lg flex items-center justify-center"
            style={{ background: '#fff', border: '1px solid #E7EBEC', color: '#1A1D1F' }}
            aria-label="Open navigation menu"
          >
            <IconMenu />
          </button>
          <span className="text-sm font-bold text-[#1A1D1F]">Admin Console</span>
        </div>
        <main className="flex-1 min-w-0 admin-main-pad overflow-y-auto">
          <div className="max-w-[1560px] mx-auto w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
