import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AUTH_PROVIDER, AuthProvider } from './auth-provider.interface';

// Verifies the bearer token via AuthProvider and attaches the resulting principal to
// `request.user` for RolesGuard/@CurrentUser to consume. Applied per-route (not
// globally) — guest-flow endpoints (GT-10) never carry this guard, since GT-10
// requires no login by design.
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const idToken = authHeader.slice('Bearer '.length);
    request.user = await this.authProvider.verifyToken(idToken);
    return true;
  }
}
