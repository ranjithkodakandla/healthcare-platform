import { Inject, Injectable } from '@nestjs/common';
import { AUTH_PROVIDER, AuthenticatedPrincipal, AuthProvider } from './auth-provider.interface';
import { AuditService } from '../audit/audit.service';

// GT-06: every login is audited, no exceptions — this is the one entry point every
// login flow (citizen OTP, provider/admin MFA) must go through, regardless of which
// AuthProvider is configured underneath.
@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: AuthProvider,
    private readonly audit: AuditService,
  ) {}

  async login(idToken: string): Promise<AuthenticatedPrincipal> {
    const principal = await this.authProvider.verifyToken(idToken);

    await this.audit.record({
      actor: principal.uid,
      action: 'LOGIN',
      entityType: 'AuthenticatedPrincipal',
      entityId: principal.uid,
      metadata: { role: principal.role, orgId: principal.orgId },
    });

    return principal;
  }
}
