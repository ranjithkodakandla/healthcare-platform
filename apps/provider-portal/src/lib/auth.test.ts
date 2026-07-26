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

  it('establishes session on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' }) as never;
    await signInProvider({ email: 'a@b.c', password: 'x', hospitalId: 'h1' });
    expect(getSession()?.token).toBe('id-token');
  });

  it('throws when session endpoint fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'no',
    }) as never;
    await expect(
      signInProvider({ email: 'a@b.c', password: 'x', hospitalId: 'h1' }),
    ).rejects.toThrow(/Session failed/);
  });
});
