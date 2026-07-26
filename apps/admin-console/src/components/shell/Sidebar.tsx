'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV = [
  {
    group: 'Console',
    items: [
      { id: 'A02', label: 'Operations Dashboard', href: '/dashboard' },
    ],
  },
  {
    group: 'Onboarding',
    items: [
      { id: 'A03', label: 'Citizen Onboarding Queue', href: '/onboarding/citizen' },
      { id: 'A04', label: 'Provider Onboarding — Stage Gate', href: '/onboarding/provider' },
      { id: 'A05', label: 'Provider Verification Detail', href: '/onboarding/provider/verify' },
    ],
  },
  {
    group: 'Support',
    items: [
      { id: 'A06', label: 'Support Ticket Queue', href: '/support/tickets' },
      { id: 'A07', label: 'Support Ticket Detail', href: '/support/tickets/detail' },
      { id: 'A19', label: 'Provider Issue Resolution', href: '/support/provider-tickets' },
      { id: 'A08', label: 'Remote Session Assist', href: '/support/remote-assist' },
      { id: 'A09', label: 'Issue Tracking Board', href: '/issues/board' },
      { id: 'A10', label: 'SLA Monitoring', href: '/issues/sla' },
      { id: 'A11', label: 'Knowledge Base', href: '/knowledge-base' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { id: 'A12', label: 'User & Role Management', href: '/users' },
      { id: 'A13', label: 'Workflow Management', href: '/workflows' },
      { id: 'A14', label: 'Platform Monitoring', href: '/monitoring' },
      { id: 'A15', label: 'Analytics', href: '/analytics' },
      { id: 'A16', label: 'Communication Center', href: '/communications' },
      { id: 'A17', label: 'AI Operations Assistant', href: '/ai-assistant' },
    ],
  },
  {
    group: 'Governance',
    items: [
      { id: 'A18', label: 'Feature Flags / Config / Audit', href: '/governance' },
    ],
  },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      style={{ width: 240, flexShrink: 0, background: '#1A1D1F' }}
      className="h-full min-h-screen sticky top-0 flex flex-col overflow-y-auto"
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-[10px] font-semibold tracking-widest uppercase text-[#B7D9DD] mb-1">
          India Healthcare
        </div>
        <div className="text-white font-bold text-base leading-tight">Admin Console</div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV.map((group) => (
          <div key={group.group} className="mb-1">
            <div className="px-5 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-[#7C8388]">
              {group.group}
            </div>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onNavigate?.()}
                  className={cn(
                    'flex items-center gap-2.5 mx-2 px-3 py-2 rounded-lg text-[13px] transition-colors min-h-11',
                    active
                      ? 'bg-white/14 text-white font-semibold'
                      : 'text-[#B7D9DD] hover:bg-white/8 font-medium',
                  )}
                >
                  <span className="text-[10px] font-bold text-[#7C8388] w-7 flex-shrink-0">
                    {item.id}
                  </span>
                  <span className="leading-snug">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Staff footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0B5C66] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            TK
          </div>
          <div>
            <div className="text-white text-xs font-semibold leading-tight">T. Krishnan</div>
            <div className="text-[#7C8388] text-[10px]">Trust & Safety Analyst</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
