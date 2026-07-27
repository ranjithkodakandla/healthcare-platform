'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BedDouble,
  ClipboardList,
  ShieldCheck,
  Briefcase,
  BarChart2,
  Bot,
  Users,
  Settings,
  ScrollText,
  Stethoscope,
  Ambulance,
  Pill,
  Droplet,
  FlaskConical,
  CreditCard,
} from 'lucide-react';

interface SidebarSection {
  title: string;
  items: { href: string; label: string; Icon: React.ElementType; prdId: string }[];
}

// Navigation groups exactly as shown in Provider Portal.dc.html wireframe, all 19 screens.
const HOSPITAL_NAV: SidebarSection[] = [
  {
    title: 'Hospital Portal — Core Shell',
    items: [
      { href: '/hospital/dashboard', label: 'Dashboard', Icon: LayoutDashboard, prdId: 'P-02' },
      { href: '/hospital/beds', label: 'Bed Inventory Update', Icon: BedDouble, prdId: 'P-03' },
      { href: '/hospital/queue', label: 'Incoming Patients / Queue', Icon: ClipboardList, prdId: 'P-04' },
      { href: '/hospital/clinical-ack', label: 'ICU/Vent Clinical Ack', Icon: ShieldCheck, prdId: 'P-05' },
      { href: '/hospital/cases', label: 'Case Management', Icon: Briefcase, prdId: 'P-06' },
      { href: '/hospital/reports', label: 'Reports', Icon: ScrollText, prdId: 'P-07' },
      { href: '/hospital/analytics', label: 'Analytics', Icon: BarChart2, prdId: 'P-08' },
      { href: '/hospital/ai-assistant', label: 'AI Assistant', Icon: Bot, prdId: 'P-09' },
      { href: '/hospital/users', label: 'User Management', Icon: Users, prdId: 'P-10' },
      { href: '/hospital/config', label: 'Configuration', Icon: Settings, prdId: 'P-11' },
      { href: '/hospital/audit', label: 'Audit Logs', Icon: ScrollText, prdId: 'P-12' },
    ],
  },
  {
    title: 'In-House Departments',
    items: [
      { href: '/hospital/doctors', label: 'Doctors', Icon: Stethoscope, prdId: 'IH-01' },
      { href: '/hospital/ambulances', label: 'Ambulances', Icon: Ambulance, prdId: 'IH-02' },
      { href: '/hospital/pharmacy', label: 'Pharmacy', Icon: Pill, prdId: 'IH-03' },
      { href: '/hospital/blood-bank', label: 'Blood Bank', Icon: Droplet, prdId: 'IH-04' },
      { href: '/hospital/diagnostics', label: 'Diagnostics', Icon: FlaskConical, prdId: 'IH-05' },
    ],
  },
];

const OTHER_PORTALS: SidebarSection[] = [
  {
    title: 'Doctor Portal',
    items: [
      { href: '/doctor/availability', label: 'Availability', Icon: Stethoscope, prdId: 'P-13' },
    ],
  },
  {
    title: 'Ambulance Operator',
    items: [
      { href: '/ambulance/fleet', label: 'Fleet Roster + Map', Icon: Ambulance, prdId: 'P-14' },
    ],
  },
  {
    title: 'Pharmacy Portal',
    items: [
      { href: '/pharmacy/stock', label: 'Medicine Stock Update', Icon: Pill, prdId: 'P-15' },
    ],
  },
  {
    title: 'Blood Bank Portal',
    items: [
      { href: '/blood-bank/pre-alerts', label: 'Blood Pre-Alert Queue', Icon: Droplet, prdId: 'P-16' },
    ],
  },
  {
    title: 'Diagnostic Center',
    items: [
      { href: '/diagnostics/results', label: 'Result Upload', Icon: FlaskConical, prdId: 'P-17' },
    ],
  },
  {
    title: 'Insurance Portal',
    items: [
      { href: '/insurance/pre-auth', label: 'Pre-Auth Review Queue', Icon: CreditCard, prdId: 'P-18' },
      { href: '/insurance/network', label: 'Network Mapping Mgmt', Icon: BarChart2, prdId: 'P-19' },
    ],
  },
];

interface SidebarProps {
  portalName: string;
  orgName: string;
  /** Close drawer after navigation (tablet/phone). */
  onNavigate?: () => void;
}

export function Sidebar({ portalName, orgName, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const allSections = [...HOSPITAL_NAV, ...OTHER_PORTALS];

  return (
    <aside
      style={{ background: '#04363D', width: 232 }}
      className="flex-shrink-0 h-full min-h-screen sticky top-0 overflow-y-auto py-[18px] flex flex-col"
    >
      {/* Org header */}
      <div
        style={{ borderColor: 'rgba(255,255,255,0.12)' }}
        className="px-[18px] pb-4 border-b mb-2"
      >
        <p className="text-[13px] font-bold text-white">{portalName}</p>
        <p className="text-[11px] mt-0.5" style={{ color: '#8FC6BE' }}>{orgName}</p>
      </div>

      {/* Nav sections */}
      {allSections.map((section) => (
        <div key={section.title}>
          <p
            className="px-[18px] pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.05em]"
            style={{ color: '#8FC6BE' }}
          >
            {section.title}
          </p>
          {section.items.map(({ href, label, Icon, prdId }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={() => onNavigate?.()}
                className={cn(
                  'flex items-center gap-2.5 px-[18px] py-[9px] mx-2 rounded-[6px]',
                  'text-[13px] transition-colors min-h-11',
                  active
                    ? 'bg-white/15 font-bold text-white'
                    : 'font-normal hover:bg-white/10',
                )}
                style={{ color: active ? '#fff' : '#8FC6BE' }}
              >
                <Icon size={14} className="flex-shrink-0" />
                <span className="flex-1">{label}</span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: active ? 'rgba(255,255,255,0.6)' : 'rgba(143,198,190,0.5)' }}
                >
                  {prdId}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
