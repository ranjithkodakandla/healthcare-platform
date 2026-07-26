// Shared enums/constants per PRD M5 — never hand-written per module.
// CaseStatus/CaseType/Severity are transcribed verbatim from the PRD's `HealthcareCase`
// definition (Part A2) — corrected in Session 4 after Session 3 shipped a guessed,
// PRD-inconsistent set (see Decision Log DL-006).

export enum CaseType {
  EMERGENCY = 'EMERGENCY',
  PLANNED = 'PLANNED',
  CHRONIC_MANAGEMENT = 'CHRONIC_MANAGEMENT',
}

export enum CaseStatus {
  INITIATED = 'INITIATED',
  IN_PROGRESS = 'IN_PROGRESS',
  STABILIZED = 'STABILIZED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum CaseSeverity {
  CRITICAL = 'CRITICAL',
  URGENT = 'URGENT',
  MODERATE = 'MODERATE',
  ROUTINE = 'ROUTINE',
}

export enum ResourceType {
  AMBULANCE = 'AMBULANCE',
  BED = 'BED',
  DOCTOR_SLOT = 'DOCTOR_SLOT',
  PHARMACY_STOCK = 'PHARMACY_STOCK',
  BLOOD_UNIT = 'BLOOD_UNIT',
  INSURANCE_PREAUTH_SLOT = 'INSURANCE_PREAUTH_SLOT',
  DIAGNOSTIC_SLOT = 'DIAGNOSTIC_SLOT',
  TREATMENT_SLOT = 'TREATMENT_SLOT',
}

export enum ResourceHoldStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
}

export enum DomainEvent {
  CASE_CREATED = 'case.created',
  CASE_STATUS_CHANGED = 'case.status_changed',
  CASE_SEVERITY_CLASSIFIED = 'case.severity_classified',
  RESOURCE_HOLD_CREATED = 'resource_hold.created',
  RESOURCE_HOLD_CONFIRMED = 'resource_hold.confirmed',
  RESOURCE_HOLD_RELEASED = 'resource_hold.released',
  RESOURCE_HOLD_EXPIRED = 'resource_hold.expired',
  // Phase 4 — Beds module events (FR-BED-001, BR-03)
  BED_INVENTORY_UPDATED = 'bed_inventory.updated',
  BED_INVENTORY_STALE = 'bed_inventory.stale',
  // Phase 4 — Hospital Portal events (FR-HOSP-001, FR-HOSP-002)
  HOLD_CONFIRMED_BY_ADMISSIONS = 'hold.confirmed_by_admissions',
  HOLD_DECLINED_BY_ADMISSIONS = 'hold.declined_by_admissions',
  CLINICAL_ACK_COMPLETED = 'hold.clinical_ack_completed',
  // Phase 6 — Ambulance dispatch events (FR-AMB-001–FR-AMB-004)
  AMBULANCE_REQUEST_CREATED = 'ambulance_request.created',
  AMBULANCE_MATCHED = 'ambulance_request.matched',
  AMBULANCE_ARRIVED_PICKUP = 'ambulance_request.arrived_pickup',
  AMBULANCE_ARRIVED_HOSPITAL = 'ambulance_request.arrived_hospital',
  AMBULANCE_REQUEST_CANCELLED = 'ambulance_request.cancelled',
  AMBULANCE_OFFER_ACCEPTED = 'ambulance_offer.accepted',
  AMBULANCE_OFFER_DECLINED = 'ambulance_offer.declined',
  AMBULANCE_OFFER_EXPIRED = 'ambulance_offer.expired',
  // Phase 6 / E-09 — AI Platform wrapper (M8 / GT-11)
  AI_FALLBACK_USED = 'ai.fallback_used',
}

// M8 — AI Coordination Layer capabilities. CLINICAL_DECISION is permanently
// disallowed (PRD §A4 non-goal); enforced by unit test, never add it here.
export enum AiCapability {
  MATCHING_RANKING = 'MATCHING_RANKING',
  TRIAGE_INTAKE = 'TRIAGE_INTAKE',
  DOCUMENT_DRAFTING = 'DOCUMENT_DRAFTING',
  SCHEDULE_OPTIMIZATION = 'SCHEDULE_OPTIMIZATION',
}

export const ERROR_CODES = {
  RESOURCE_HOLD_CAPACITY_EXCEEDED: 'RESOURCE_HOLD_CAPACITY_EXCEEDED',
  RESOURCE_HOLD_NOT_FOUND: 'RESOURCE_HOLD_NOT_FOUND',
  RESOURCE_HOLD_INVALID_STATE_TRANSITION: 'RESOURCE_HOLD_INVALID_STATE_TRANSITION',
  GUEST_ACTIVE_REQUEST_LIMIT_EXCEEDED: 'GUEST_ACTIVE_REQUEST_LIMIT_EXCEEDED',
  AUTH_PROVIDER_NOT_CONFIGURED: 'AUTH_PROVIDER_NOT_CONFIGURED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  ONBOARDING_STAGE_OUT_OF_ORDER: 'ONBOARDING_STAGE_OUT_OF_ORDER',
  ONBOARDING_STAGE_ALREADY_COMPLETE: 'ONBOARDING_STAGE_ALREADY_COMPLETE',
  // Phase 4 — Beds module
  BED_INVENTORY_NEGATIVE_COUNT: 'BED_INVENTORY_NEGATIVE_COUNT',
  BED_INVENTORY_COUNT_EXCEEDS_TOTAL: 'BED_INVENTORY_COUNT_EXCEEDS_TOTAL',
  HOLD_NOT_FOUND: 'HOLD_NOT_FOUND',
  HOLD_ALREADY_CONFIRMED: 'HOLD_ALREADY_CONFIRMED',
  HOLD_REQUIRES_CLINICAL_ACK: 'HOLD_REQUIRES_CLINICAL_ACK',
  CLINICAL_ACK_NOT_AUTHORIZED: 'CLINICAL_ACK_NOT_AUTHORIZED',
  CLINICAL_ACK_PRECONDITION_NOT_MET: 'CLINICAL_ACK_PRECONDITION_NOT_MET',
} as const;

// Platform-wide role model per PRD I7 (RBAC), consolidating the per-module permission
// tables (e.g. Module 1 §1.15) into one coherent set. GUEST is the GT-10 unregistered/
// bystander actor — present in the model but never requires login (I7 MFA note: "must
// never be compromised by security friction"). Provider-portal-specific roles beyond
// this generic set are expected to expand in Phase 4 once Modules 3-9 get their full
// FR-ID-table treatment (DL-004).
export enum Role {
  GUEST = 'GUEST',
  CITIZEN = 'CITIZEN',
  FAMILY_CAREGIVER = 'FAMILY_CAREGIVER',
  AMBULANCE_DRIVER = 'AMBULANCE_DRIVER',
  HOSPITAL_ER_COORDINATOR = 'HOSPITAL_ER_COORDINATOR',
  PROVIDER_STAFF = 'PROVIDER_STAFF',
  GOVERNMENT_OVERSIGHT = 'GOVERNMENT_OVERSIGHT',
  PLATFORM_COORDINATOR = 'PLATFORM_COORDINATOR',
  ADMIN = 'ADMIN',
}

// PRD Part G4 — the seven provider types named in FR-ADM-PRV-001's stage-gated
// onboarding workflow, transcribed verbatim.
export enum ProviderType {
  HOSPITAL = 'HOSPITAL',
  DOCTOR = 'DOCTOR',
  AMBULANCE_OPERATOR = 'AMBULANCE_OPERATOR',
  PHARMACY = 'PHARMACY',
  BLOOD_BANK = 'BLOOD_BANK',
  DIAGNOSTIC_CENTER = 'DIAGNOSTIC_CENTER',
  INSURER = 'INSURER',
}

// PRD Part G4 / FR-ADM-PRV-001 Main Flow, transcribed verbatim and in strict order:
// "Application intake → Credential verification → Integration test (sandbox
// booking/hold cycle) → Go-live approval → Provider Portal (Part F) access activated."
// This is the actual sequence `ProviderOnboardingService` enforces — never reorder
// without a Decision Log entry, since portal go-live is a zero-tolerance gate on it
// (UX Spec A-04: "no provider reaches Portal access without every mandatory stage
// logged complete").
export enum OnboardingStage {
  APPLICATION_INTAKE = 'APPLICATION_INTAKE',
  CREDENTIAL_VERIFICATION = 'CREDENTIAL_VERIFICATION',
  INTEGRATION_TEST = 'INTEGRATION_TEST',
  GO_LIVE_APPROVAL = 'GO_LIVE_APPROVAL',
  PORTAL_ACCESS_ACTIVATED = 'PORTAL_ACCESS_ACTIVATED',
}

export enum OnboardingStageStatus {
  PENDING = 'PENDING',
  COMPLETE = 'COMPLETE',
  REJECTED = 'REJECTED',
}

// PRD Part G9 — Console-internal role catalogue, distinct from the platform-wide
// `Role` model above (G9: "distinct from Provider Portal's F2 User Management ...
// distinct from the Citizen App's user base entirely"). Transcribed verbatim.
export enum ConsoleRole {
  SUPPORT_AGENT = 'SUPPORT_AGENT',
  CUSTOMER_SUCCESS_MANAGER = 'CUSTOMER_SUCCESS_MANAGER',
  PROVIDER_ONBOARDING_SPECIALIST = 'PROVIDER_ONBOARDING_SPECIALIST',
  TRUST_SAFETY_ANALYST = 'TRUST_SAFETY_ANALYST',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  PLATFORM_OPERATIONS_ENGINEER = 'PLATFORM_OPERATIONS_ENGINEER',
  CONSOLE_ADMINISTRATOR = 'CONSOLE_ADMINISTRATOR',
}

// PRD §2.15 — Hospital-specific staff roles for the Hospital Portal (F3).
// "Hospital Administrator" and "Finance/Insurance Desk" are F3.6 additions;
// "Hospital Admissions Staff" and "Hospital Clinical Lead" are transcribed
// verbatim from Module 2 §2.15 (the permission table already there).
export enum HospitalPortalRole {
  HOSPITAL_ADMINISTRATOR = 'HOSPITAL_ADMINISTRATOR',
  HOSPITAL_ADMISSIONS_STAFF = 'HOSPITAL_ADMISSIONS_STAFF',
  HOSPITAL_CLINICAL_LEAD = 'HOSPITAL_CLINICAL_LEAD',
  FINANCE_INSURANCE_DESK = 'FINANCE_INSURANCE_DESK',
}

// PRD Module 2 §2.16 — bed categories used in search filters and inventory.
// Transcribed verbatim from the search-filter list.
export enum BedCategory {
  GENERAL = 'GENERAL',
  ICU = 'ICU',
  VENTILATOR = 'VENTILATOR',
  NICU = 'NICU',
  ISOLATION = 'ISOLATION',
  MATERNITY = 'MATERNITY',
}

// PRD Module 2 §2.8 BR-03 — staleness states for hospital bed inventory.
export enum BedInventoryStatus {
  FRESH = 'FRESH',
  STALE = 'STALE',
}
