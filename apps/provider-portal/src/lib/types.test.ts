import { PROVIDER_TYPE_SEGMENT, PROVIDER_TYPE_LANDING_PATH, ProviderType } from './types';

describe('provider type maps', () => {
  const ALL: ProviderType[] = [
    'HOSPITAL',
    'DOCTOR',
    'AMBULANCE_OPERATOR',
    'PHARMACY',
    'BLOOD_BANK',
    'DIAGNOSTIC_CENTER',
    'INSURER',
  ];

  it('has a route segment and landing path for every provider type', () => {
    for (const type of ALL) {
      expect(PROVIDER_TYPE_SEGMENT[type]).toBeTruthy();
      expect(PROVIDER_TYPE_LANDING_PATH[type]).toMatch(new RegExp(`^/${PROVIDER_TYPE_SEGMENT[type]}/`));
    }
  });
});
