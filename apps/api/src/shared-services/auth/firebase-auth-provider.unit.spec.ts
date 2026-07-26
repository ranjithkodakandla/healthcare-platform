import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@sahayak/shared-constants';

jest.mock('firebase-admin', () => {
  const verifyIdToken = jest.fn();
  const initializeApp = jest.fn(() => ({ name: 'app' }));
  const auth = jest.fn(() => ({ verifyIdToken }));
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
  return {
    __esModule: true,
    default: api,
    ...api,
  };
});

import * as admin from 'firebase-admin';
import { FirebaseAuthProvider } from './firebase-auth-provider';
import { resetFirebaseAdminAppCache } from './firebase-admin.app';

describe('FirebaseAuthProvider (unit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFirebaseAdminAppCache();
    (admin as unknown as { apps: unknown[] }).apps = [];
  });

  it('throws without project id', async () => {
    const provider = new FirebaseAuthProvider({ get: () => undefined } as never);
    await expect(provider.verifyToken('t')).rejects.toThrow(/FIREBASE_PROJECT_ID/);
  });

  it('verifies token with ADC and maps claims', async () => {
    (admin.auth as unknown as jest.Mock)().verifyIdToken.mockResolvedValue({
      uid: 'u1',
      phone_number: '+91',
      email: 'a@b.c',
      role: Role.ADMIN,
      orgId: 'org',
    });
    const provider = new FirebaseAuthProvider({
      get: (k: string) => (k === 'FIREBASE_PROJECT_ID' ? 'sahyak' : 'ADC'),
    } as never);
    const principal = await provider.verifyToken('tok');
    expect(principal).toEqual(
      expect.objectContaining({ uid: 'u1', role: Role.ADMIN, orgId: 'org' }),
    );
    // second call reuses app
    await provider.verifyToken('tok');
  });

  it('uses service account JSON cert path and maps default role', async () => {
    (admin.auth as unknown as jest.Mock)().verifyIdToken.mockResolvedValue({ uid: 'u2' });
    const provider = new FirebaseAuthProvider({
      get: (k: string) =>
        k === 'FIREBASE_PROJECT_ID'
          ? 'sahyak'
          : JSON.stringify({ project_id: 'sahyak', client_email: 'a@b.c', private_key: 'k' }),
    } as never);
    const principal = await provider.verifyToken('tok');
    expect(principal.role).toBe(Role.CITIZEN);
  });

  it('wraps verify failures as UnauthorizedException', async () => {
    (admin.auth as unknown as jest.Mock)().verifyIdToken.mockRejectedValue(new Error('bad'));
    const provider = new FirebaseAuthProvider({
      get: (k: string) => (k === 'FIREBASE_PROJECT_ID' ? 'sahyak' : 'ADC'),
    } as never);
    await expect(provider.verifyToken('bad')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
