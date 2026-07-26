jest.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: jest.fn().mockResolvedValue({
    user: {
      uid: 'uid-1',
      email: 'ranjith@sahyak.test',
      displayName: 'Ranjith',
      getIdToken: jest.fn().mockResolvedValue('admin-token'),
    },
  }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('./firebase', () => ({
  getFirebaseAuth: () => ({}),
}));

import { signInAdmin, signOutAdmin } from './auth';
import { getAdminProfile, getAdminToken, saveAdminProfile, saveAdminToken } from './api';

describe('signInAdmin', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom location.assign stub
    // @ts-expect-error test stub
    delete window.location;
    // @ts-expect-error test stub
    window.location = { assign: jest.fn(), pathname: '/dashboard' };
  });

  it('clears stale profile and stores token + identity on success', async () => {
    saveAdminToken('stale');
    saveAdminProfile({
      uid: 'old',
      email: 'old@sahyak.test',
      displayName: 'T. Krishnan',
      roleLabel: 'Trust & Safety Analyst',
    });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' }) as never;
    await signInAdmin({ email: 'ranjith@sahyak.test', password: 'x' });
    expect(getAdminToken()).toBe('admin-token');
    expect(getAdminProfile()?.displayName).toBe('Ranjith');
    expect(getAdminProfile()?.email).toBe('ranjith@sahyak.test');
  });

  it('throws on session failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'no',
    }) as never;
    await expect(signInAdmin({ email: 'a@b.co', password: 'x' })).rejects.toThrow(/Session failed/);
  });

  it('signOutAdmin clears session and navigates to login', async () => {
    saveAdminToken('tok');
    saveAdminProfile({
      uid: 'u',
      email: 'ranjith@sahyak.test',
      displayName: 'Ranjith',
      roleLabel: 'Console Administrator',
    });
    await signOutAdmin();
    expect(getAdminToken()).toBeNull();
    expect(getAdminProfile()).toBeNull();
    expect(window.location.assign).toHaveBeenCalledWith('/login');
  });
});
