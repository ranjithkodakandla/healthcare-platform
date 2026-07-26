import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@sahayak/shared-constants';
import { ROLES_KEY } from './roles.decorator';

// RBAC per PRD I7. Must run after AuthGuard (relies on `request.user` being set).
// ABAC (e.g. "Doctor role AND active participant in this specific Case") is
// deliberately out of scope here — it's resolved per-endpoint once the modules that
// need it exist (Phase 4/5), consistent with I7's "role alone is insufficient" note.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
