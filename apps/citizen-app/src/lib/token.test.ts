import { clearCitizenToken, getCitizenToken, saveCitizenToken } from './token';

describe('citizen token storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves gets and clears token', () => {
    expect(getCitizenToken()).toBeNull();
    saveCitizenToken('abc');
    expect(getCitizenToken()).toBe('abc');
    clearCitizenToken();
    expect(getCitizenToken()).toBeNull();
  });
});
