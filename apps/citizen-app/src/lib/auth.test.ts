jest.mock('./firebase', () => ({
  getFirebaseAuth: () => ({
    currentUser: {
      getIdToken: jest.fn().mockResolvedValue('fresh-token'),
    },
  }),
}));

import { establishCitizenSession, refreshCitizenIdToken } from './auth';
import { getCitizenToken } from './token';

describe('citizen auth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('establishCitizenSession posts and stores token', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, text: async () => '' }) as never;
    await establishCitizenSession('id-1');
    expect(getCitizenToken()).toBe('id-1');
  });

  it('establishCitizenSession throws on failure', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'nope',
    }) as never;
    await expect(establishCitizenSession('bad')).rejects.toThrow(/Session failed/);
  });

  it('refreshCitizenIdToken refreshes from firebase user', async () => {
    await expect(refreshCitizenIdToken()).resolves.toBe('fresh-token');
    expect(getCitizenToken()).toBe('fresh-token');
  });
});
