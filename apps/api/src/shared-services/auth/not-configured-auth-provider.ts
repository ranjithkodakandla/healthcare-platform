import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ERROR_CODES } from '@sahayak/shared-constants';
import { AuthenticatedPrincipal, AuthProvider } from './auth-provider.interface';

// GT-11: every dependency has a fallback, every fallback is visible — never silent
// degradation. Used in place of FirebaseAuthProvider when FIREBASE_PROJECT_ID
// isn't configured, so the rest of the platform can
// still boot and guest-flow endpoints (which never call this) keep working while
// authenticated-login endpoints fail loudly with a clear, actionable error instead of
// the app crashing at startup.
@Injectable()
export class NotConfiguredAuthProvider implements AuthProvider {
  async verifyToken(): Promise<AuthenticatedPrincipal> {
    throw new ServiceUnavailableException({
      code: ERROR_CODES.AUTH_PROVIDER_NOT_CONFIGURED,
      message:
        'Firebase Auth is not configured on this deployment (FIREBASE_PROJECT_ID unset). Authenticated login is unavailable; guest flows are unaffected.',
    });
  }
}
