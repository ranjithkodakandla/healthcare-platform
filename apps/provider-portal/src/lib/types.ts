// Provider Portal type definitions — aligned with backend DTOs and PRD FR-ID schemas.

export type BedCategory = 'GENERAL' | 'ICU' | 'VENTILATOR' | 'NICU' | 'ISOLATION' | 'MATERNITY';
export type StalenessStatus = 'FRESH' | 'STALE';
export type HoldStatus = 'PENDING' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
export type CaseSeverity = 'CRITICAL' | 'URGENT' | 'MODERATE' | 'ROUTINE';

export type PortalType =
  | 'hospital'
  | 'doctor'
  | 'ambulance'
  | 'pharmacy'
  | 'blood_bank'
  | 'diagnostic'
  | 'insurance';

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
