'use client';

import { Bell, Menu } from 'lucide-react';

interface TopHeaderProps {
  userInitials: string;
  hasNotifications?: boolean;
  onMenuClick?: () => void;
}

export function TopHeader({
  userInitials,
  hasNotifications = true,
  onMenuClick,
}: TopHeaderProps) {
  return (
    <header
      style={{ borderBottom: '1px solid #E7EBEC' }}
      className="h-14 flex-shrink-0 bg-white flex items-center justify-between gap-3 px-4 md:px-6"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            className="shell-menu-btn w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#F2F4F5', color: '#1A1D1F' }}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
        )}
        <div
          style={{ border: '1px solid #E7EBEC', background: '#F2F4F5' }}
          className="h-10 flex-1 max-w-md min-w-0 rounded-lg flex items-center px-3 gap-2"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#7C8388"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4-4" />
          </svg>
          <span className="text-[12px] truncate" style={{ color: '#7C8388' }}>
            Search cases, patients, staff…
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative w-5 h-5" aria-hidden>
          <Bell size={20} stroke="#4A5054" />
          {hasNotifications && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{ background: '#C62E2E' }}
            />
          )}
        </div>
        <div
          style={{ background: '#DEF3F5', color: '#0B5C66' }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold"
        >
          {userInitials}
        </div>
      </div>
    </header>
  );
}
