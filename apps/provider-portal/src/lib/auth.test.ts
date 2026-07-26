jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: { getIdToken: jest.fn().mockResolvedValue('id-token') },
  }),
}));

jest.mock('./firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

import { signInProvider } from './auth';
import { getSession } from './api';

describe('signInProvider', () => {
  beforeEach(() => localStorage.clear());

  it('establishes session on success and returns the verified providerType', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { uid: 'u1', role: 'PROVIDER_STAFF', orgId: 'hosp-apollo-blr', providerType: 'HOSPITAL' },
      }),
      text: async () => '',
    }) as never;
    const result = await signInProvider({ email: 'a@b.c', password: 'x' });
    expect(result.providerType).toBe('HOSPITAL');
    expect(getSession()?.token).toBe('id-token');
    expect(getSession()?.hospitalId).toBe('hosp-apollo-blr');
    expect(getSession()?.providerType).toBe('HOSPITAL');
  });

  it('throws when session endpoint fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'no',
    }) as never;
    await expect(signInProvider({ email: 'a@b.c', password: 'x' })).rejects.toThrow(/Session failed/);
  });

  it('throws when the account has no linked organization', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { uid: 'u1', role: 'CITIZEN' } }),
      text: async () => '',
    }) as never;
    await expect(signInProvider({ email: 'a@b.c', password: 'x' })).rejects.toThrow(/no organization/);
  });
});
