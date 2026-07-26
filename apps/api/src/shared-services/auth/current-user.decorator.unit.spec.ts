import { extractCurrentUser } from './current-user.decorator';

describe('extractCurrentUser', () => {
  it('returns request.user from HTTP context', () => {
    const user = { uid: 'u1', role: 'CITIZEN' };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    };
    expect(extractCurrentUser(ctx as never)).toEqual(user);
  });
});
