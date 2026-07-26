import { BadRequestException } from '@nestjs/common';

jest.mock('firebase-admin', () => {
  const createUser = jest.fn();
  const setCustomUserClaims = jest.fn();
  const generatePasswordResetLink = jest.fn();
  const initializeApp = jest.fn(() => ({ name: 'app' }));
  const auth = jest.fn(() => ({ createUser, setCustomUserClaims, generatePasswordResetLink }));
  const api = {
    apps: [] as unknown[],
    app: jest.fn(() => ({ name: 'app' })),
    initializeApp,
    auth,
    credential: {
      cert: jest.fn(() => 'cert'),
      applicationDefault: jest.fn(() => 'adc'),
    },
  };
  return { __esModule: true, default: api, ...api };
});

import * as admin from 'firebase-admin';
import { ProviderUserService } from './provider-user.service';
import { resetFirebaseAdminAppCache } from '../shared-services/auth/firebase-admin.app';

const config = { get: (k: string) => (k === 'FIREBASE_PROJECT_ID' ? 'sahyak' : 'ADC') } as never;

describe('ProviderUserService (unit)', () => {
  const auditRecord = jest.fn();
  const service = new ProviderUserService(config, { record: auditRecord } as never);

  beforeEach(() => {
    jest.clearAllMocks();
    resetFirebaseAdminAppCache();
    (admin as unknown as { apps: unknown[] }).apps = [];
  });

  it('creates a Firebase user, stamps org/role claims, and audits the invite', async () => {
    const authApi = (admin.auth as unknown as jest.Mock)();
    authApi.createUser.mockResolvedValue({ uid: 'new-uid' });
    authApi.generatePasswordResetLink.mockResolvedValue('https://example.com/reset');

    const result = await service.inviteUser(
      'hosp-apollo-blr',
      { name: 'Kavitha R.', email: 'kavitha@apollo.example', role: 'HOSPITAL_ADMISSIONS_STAFF' as never },
      'actor-uid',
    );

    expect(result).toEqual({
      uid: 'new-uid',
      name: 'Kavitha R.',
      email: 'kavitha@apollo.example',
      role: 'HOSPITAL_ADMISSIONS_STAFF',
      passwordResetLink: 'https://example.com/reset',
    });
    expect(authApi.setCustomUserClaims).toHaveBeenCalledWith(
      'new-uid',
      expect.objectContaining({ orgId: 'hosp-apollo-blr', portalRole: 'HOSPITAL_ADMISSIONS_STAFF' }),
    );
    expect(auditRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actor: 'actor-uid', action: 'PROVIDER_USER_INVITED', entityId: 'new-uid' }),
    );
  });

  it('maps a duplicate email to a friendly BadRequestException', async () => {
    const authApi = (admin.auth as unknown as jest.Mock)();
    authApi.createUser.mockRejectedValue({ code: 'auth/email-already-exists' });

    await expect(
      service.inviteUser(
        'hosp-apollo-blr',
        { name: 'X', email: 'dup@apollo.example', role: 'HOSPITAL_ADMISSIONS_STAFF' as never },
        'actor-uid',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
