// Provider Portal type definitions — aligned with backend DTOs and PRD FR-ID schemas.

export type BedCategory = 'GENERAL' | 'ICU' | 'VENTILATOR' | 'NICU' | 'ISOLATION' | 'MATERNITY';
export type StalenessStatus = 'FRESH' | 'STALE';
export type HoldStatus = 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
export type CaseSeverity = 'CRITICAL' | 'URGENT' | 'MODERATE' | 'ROUTINE';

// Mirrors backend `ProviderType` (packages/shared-constants) — the value carried in the
// Firebase custom claim and returned by POST /v1/auth/session, per PRD Part G4.
export type ProviderType =
  | 'HOSPITAL'
  | 'DOCTOR'
  | 'AMBULANCE_OPERATOR'
  | 'PHARMACY'
  | 'BLOOD_BANK'
  | 'DIAGNOSTIC_CENTER'
  | 'INSURER';

// Route segment each portal type is mounted under (apps/provider-portal/src/app/<segment>).
export type PortalSegment =
  | 'hospital'
  | 'doctor'
  | 'ambulance'
  | 'pharmacy'
  | 'blood-bank'
  | 'diagnostics'
  | 'insurance';

export const PROVIDER_TYPE_SEGMENT: Record<ProviderType, PortalSegment> = {
  HOSPITAL: 'hospital',
  DOCTOR: 'doctor',
  AMBULANCE_OPERATOR: 'ambulance',
  PHARMACY: 'pharmacy',
  BLOOD_BANK: 'blood-bank',
  DIAGNOSTIC_CENTER: 'diagnostics',
  INSURER: 'insurance',
};

// Each portal's landing screen (only Hospital has a dedicated "dashboard" route).
export const PROVIDER_TYPE_LANDING_PATH: Record<ProviderType, string> = {
  HOSPITAL: '/hospital/dashboard',
  DOCTOR: '/doctor/availability',
  AMBULANCE_OPERATOR: '/ambulance/fleet',
  PHARMACY: '/pharmacy/stock',
  BLOOD_BANK: '/blood-bank/pre-alerts',
  DIAGNOSTIC_CENTER: '/diagnostics/results',
  INSURER: '/insurance/pre-auth',
};

export interface BedInventoryRow {
  id: string;
  hospitalId: string;
  category: BedCategory;
  availableCount: number;
  occupiedCount: number;
  totalCount: number;
  stalenessStatus: StalenessStatus;
  lastUpdatedAt: string;
  version: number;
}

export interface QueueEntry {
  holdId: string;
  caseId: string | null;
  caseNumber: string | null;
  category: string;
  status: HoldStatus;
  requiresSecondaryAck: boolean;
  heldAt: string;
  expiresAt: string;
  caseSeverity: CaseSeverity | null;
}

export interface DashboardData {
  hospitalId: string;
  bedOccupancy: {
    total: number;
    occupied: number;
    available: number;
    occupancyPercent: number;
  };
  stalenessStatus: StalenessStatus;
  pendingActionsCount: number;
  pendingClinicalAckCount: number;
  activeLinkedCasesCount: number;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
}
