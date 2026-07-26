import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Role } from '@sahayak/shared-constants';
import { OrgScopeGuard } from './org-scope.guard';

function contextWith(user: { role: Role; orgId?: string } | undefined, params: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

// I7 ABAC — mirrors roles.guard.spec.ts's isolated-mock pattern: no live Firebase
// needed, just a fabricated request.user/params shape.
describe('OrgScopeGuard', () => {
  const guard = new OrgScopeGuard();

  it('allows access when the caller org matches the :hospitalId param', () => {
    const ctx = contextWith({ role: Role.PROVIDER_STAFF, orgId: 'hosp-apollo-blr' }, { hospitalId: 'hosp-apollo-blr' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the caller org matches the :providerId param', () => {
    const ctx = contextWith({ role: Role.PROVIDER_STAFF, orgId: 'lifeline-amb' }, { providerId: 'lifeline-amb' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies cross-org access even for a valid PROVIDER_STAFF token (IDOR guard)', () => {
    const ctx = contextWith({ role: Role.PROVIDER_STAFF, orgId: 'hosp-apollo-blr' }, { hospitalId: 'hosp-other-hospital' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('denies access when the caller has no orgId at all', () => {
    const ctx = contextWith({ role: Role.PROVIDER_STAFF }, { hospitalId: 'hosp-apollo-blr' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('exempts platform ADMIN from org scoping', () => {
    const ctx = contextWith({ role: Role.ADMIN, orgId: 'admin-org' }, { hospitalId: 'hosp-apollo-blr' });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when the route has no org param to scope against', () => {
    const ctx = contextWith({ role: Role.PROVIDER_STAFF, orgId: 'hosp-apollo-blr' }, {});
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('denies access when there is no authenticated principal', () => {
    const ctx = contextWith(undefined, { hospitalId: 'hosp-apollo-blr' });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
