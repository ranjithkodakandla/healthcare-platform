import { ProviderType } from '@sahayak/shared-constants';

export class CreateProviderApplicationDto {
  providerType!: ProviderType;
  legalName!: string;
  /** Organization ID used on Provider Portal login (required when setting credentials). */
  orgId?: string;
  /** Firebase email for the hospital/provider admin login. */
  portalEmail?: string;
  /** Initial password for portalEmail (min 8 chars). */
  portalPassword?: string;
  /** Optional city for HospitalRegistry seed when type is HOSPITAL. */
  city?: string;
}
