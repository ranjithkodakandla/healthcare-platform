/**
 * Configurable retention defaults (DPDP purpose limitation + CERT-In guidance).
 * Values can be overridden via admin PlatformConfig groupKey = "retention".
 */
export const PRIVACY_POLICY_VERSION = '1.0.0';
export const TERMS_VERSION = '1.0.0';

export const PLATFORM_GRANTEE = 'PLATFORM';

export const ConsentPurpose = {
  PRIVACY_POLICY: `PRIVACY_POLICY:v${PRIVACY_POLICY_VERSION}`,
  TERMS_OF_SERVICE: `TERMS_OF_SERVICE:v${TERMS_VERSION}`,
  EMERGENCY_PROCESSING: 'EMERGENCY_PROCESSING:v1',
  MARKETING_UPDATES: 'MARKETING_UPDATES:v1',
  ABHA_LINK: 'ABHA_LINK:v1',
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED:v1',
} as const;

export type RetentionPolicy = {
  /** Days to keep precise guest location after case CLOSED/CANCELLED */
  locationPreciseDays: number;
  /** Days to keep application logs (CERT-In recommends ≥180 for certain classes) */
  applicationLogDays: number;
  /** Days to keep AI prompt metadata (never full free-text PII) */
  aiMetadataDays: number;
  /** Days after which inactive guest device bindings may be purged */
  guestDeviceDays: number;
  /** Days to retain support ticket free text after resolved */
  supportTicketDays: number;
};

export const DEFAULT_RETENTION: RetentionPolicy = {
  locationPreciseDays: 90,
  applicationLogDays: 180,
  aiMetadataDays: 30,
  guestDeviceDays: 90,
  supportTicketDays: 365,
};
