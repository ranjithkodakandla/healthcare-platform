import { AuthController } from './auth.controller';

describe('AuthController (unit)', () => {
  it('createSession returns principal envelope', async () => {
    const authService = {
      login: jest.fn().mockResolvedValue({ uid: 'u1', role: 'CITIZEN' }),
    };
    const controller = new AuthController(authService as never);
    await expect(controller.createSession({ idToken: 'tok' })).resolves.toEqual({
      data: { uid: 'u1', role: 'CITIZEN' },
      meta: {},
      errors: [],
    });
  });
});
