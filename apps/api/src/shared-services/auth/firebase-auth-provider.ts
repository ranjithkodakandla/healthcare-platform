import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Role } from '@sahayak/shared-constants';
import { AuthenticatedPrincipal, AuthProvider } from './auth-provider.interface';
import { getFirebaseAdminApp } from './firebase-admin.app';

// DL-001/DL-007/DL-008: Firebase Auth on GCP project `sahyak`. Lazily initializes
// the Admin SDK on first real use so /health still boots when credentials are
// missing (GT-11 NotConfiguredAuthProvider path).
@Injectable()
export class FirebaseAuthProvider implements AuthProvider {
  constructor(private readonly config: ConfigService) {}

  async verifyToken(idToken: string): Promise<AuthenticatedPrincipal> {
    const app = getFirebaseAdminApp(this.config);

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth(app).verifyIdToken(idToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired auth token');
    }

    // Role/orgId are assigned as Firebase custom claims at provider-onboarding time
    // (Phase 3, G4) or citizen-registration time — not decided by this provider.
    const role = (decoded.role as Role | undefined) ?? Role.CITIZEN;

    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number,
      email: decoded.email,
      role,
      orgId: decoded.orgId as string | undefined,
    };
  }
}
