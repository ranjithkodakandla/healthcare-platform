import { ProviderType } from '@sahayak/shared-constants';

export class CreateProviderApplicationDto {
  providerType!: ProviderType;
  legalName!: string;
}
