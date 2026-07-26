import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Role } from '@sahayak/shared-constants';

// I7 ABAC layer on top of RolesGuard's role-only check. Every provider-portal route is
// shaped `/v1/providers/:hospitalId/*` or `/v1/providers/:providerId/*` — without this
// guard, any PROVIDER_STAFF token can read/write *any other org's* data by changing the
// path param (IDOR), since RolesGuard only checks the role, never which org the caller
// actually belongs to. Must run after AuthGuard (needs `request.user.orgId`).
// Role.ADMIN is exempt — platform admins legitimately operate across orgs (console/ops).
@Injectable()
export class OrgScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('No authenticated principal on request');
    }
    if (user.role === Role.ADMIN) {
      return true;
    }

    const params = request.params ?? {};
    const routeOrgId = params.hospitalId ?? params.providerId;

    if (routeOrgId == null) {
      // Route has neither param — nothing to scope against, defer to RolesGuard only.
      return true;
    }
    if (!user.orgId || user.orgId !== routeOrgId) {
      throw new ForbiddenException('You are not authorized to access this organization');
    }

    return true;
  }
}
