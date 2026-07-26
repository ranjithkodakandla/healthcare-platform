import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@sahayak/shared-constants';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: { role: Role } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

// I7 RBAC — no live Firebase project needed: AuthProvider is mocked out entirely by
// constructing the request.user object directly, since RolesGuard only cares about
// what AuthGuard would have already attached to the request.
describe('RolesGuard', () => {
  function makeGuard(requiredRoles: Role[] | undefined): RolesGuard {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    return new RolesGuard(reflector);
  }

  it('allows access when the user has one of the required roles', () => {
    const guard = makeGuard([Role.HOSPITAL_ER_COORDINATOR]);
    const ctx = contextWithUser({ role: Role.HOSPITAL_ER_COORDINATOR });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when the user lacks the required role', () => {
    const guard = makeGuard([Role.PLATFORM_COORDINATOR]);
    const ctx = contextWithUser({ role: Role.CITIZEN });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('allows access when no roles are required on the route', () => {
    const guard = makeGuard(undefined);
    const ctx = contextWithUser({ role: Role.CITIZEN });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
