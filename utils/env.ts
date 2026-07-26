export const env = {
  apiUrl: process.env.E2E_API_URL ?? 'https://sahayak-dev-api-j2iqu7nnqq-el.a.run.app',
  citizenUrl: process.env.E2E_CITIZEN_URL ?? 'https://sahayak-dev-citizen-j2iqu7nnqq-el.a.run.app',
  providerUrl:
    process.env.E2E_PROVIDER_URL ?? 'https://sahayak-dev-provider-j2iqu7nnqq-el.a.run.app',
  adminUrl: process.env.E2E_ADMIN_URL ?? 'https://sahayak-dev-admin-j2iqu7nnqq-el.a.run.app',
  providerEmail: process.env.E2E_PROVIDER_EMAIL ?? '',
  providerPassword: process.env.E2E_PROVIDER_PASSWORD ?? '',
  providerHospitalId: process.env.E2E_PROVIDER_HOSPITAL_ID ?? 'APL-BLR-0142',
  adminEmail: process.env.E2E_ADMIN_EMAIL ?? 'ranjith@sahyak.test',
  adminPassword: process.env.E2E_ADMIN_PASSWORD ?? '',
  demo: process.env.E2E_DEMO === '1' || process.env.E2E_DEMO === 'true',
};

export function hasProviderCreds(): boolean {
  return Boolean(env.providerEmail && env.providerPassword);
}

export function hasAdminCreds(): boolean {
  return Boolean(env.adminEmail && env.adminPassword);
}
