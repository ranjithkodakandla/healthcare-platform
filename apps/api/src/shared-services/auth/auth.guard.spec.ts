import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@sahayak/shared-constants';
import { AuthGuard } from './auth.guard';
import type { AuthProvider } from './auth-provider.interface';

function mockContext(authorization?: string) {
  const request: { headers: { authorization?: string }; user?: unknown } = {
    headers: { authorization },
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    request,
  };
}

describe('AuthGuard', () => {
  const principal = { uid: 'u1', role: Role.CITIZEN };

  it('rejects missing bearer token', async () => {
    const provider: AuthProvider = { verifyToken: jest.fn() };
    const guard = new AuthGuard(provider);
    await expect(guard.canActivate(mockContext() as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('attaches verified principal to request', async () => {
    const provider: AuthProvider = {
      verifyToken: jest.fn().mockResolvedValue(principal),
    };
    const guard = new AuthGuard(provider);
    const ctx = mockContext('Bearer tok-123');
    await expect(guard.canActivate(ctx as never)).resolves.toBe(true);
    expect(provider.verifyToken).toHaveBeenCalledWith('tok-123');
    expect(ctx.request.user).toEqual(principal);
  });
});
