jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: { getIdToken: jest.fn().mockResolvedValue('admin-token') },
  }),
}));

jest.mock('./firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

import { signInAdmin } from './auth';
import { getAdminToken } from './api';

describe('signInAdmin', () => {
  beforeEach(() => localStorage.clear());

  it('stores token on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' }) as never;
    await signInAdmin({ email: 'a@b.c', password: 'x' });
    expect(getAdminToken()).toBe('admin-token');
  });

  it('throws on session failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'no',
    }) as never;
    await expect(signInAdmin({ email: 'a@b.c', password: 'x' })).rejects.toThrow(/Session failed/);
  });
});
