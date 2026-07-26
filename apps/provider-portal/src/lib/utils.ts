import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#C62E2E',
  URGENT: '#D98C0E',
  MODERATE: '#0B5C66',
  ROUTINE: '#7C8388',
};

export const SEVERITY_BG: Record<string, string> = {
  CRITICAL: '#FDEAEA',
  URGENT: '#FBF0D9',
  MODERATE: '#DEF3F5',
  ROUTINE: '#F2F4F5',
};

export const BED_CATEGORY_LABEL: Record<string, string> = {
  GENERAL: 'General',
  ICU: 'ICU',
  VENTILATOR: 'Ventilator',
  NICU: 'NICU',
  ISOLATION: 'Isolation',
  MATERNITY: 'Maternity',
};

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function occupancyColor(pct: number): string {
  if (pct >= 90) return '#C62E2E';
  if (pct >= 75) return '#D98C0E';
  return '#1A1D1F';
}
