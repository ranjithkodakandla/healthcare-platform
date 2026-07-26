import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { Role } from '@sahayak/shared-constants';
import { AuthenticatedPrincipal, AuthProvider } from './auth-provider.interface';

// DL-001/DL-007/DL-008: Firebase Auth on GCP project `sahyak`. Lazily initializes
// the Admin SDK on first real use so /health still boots when credentials are
// missing (GT-11 NotConfiguredAuthProvider path).
@Injectable()
export class FirebaseAuthProvider implements AuthProvider {
  private app: admin.app.App | undefined;

  constructor(private readonly config: ConfigService) {}

  async verifyToken(idToken: string): Promise<AuthenticatedPrincipal> {
    const app = this.getOrInitApp();

    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth(app).verifyIdToken(idToken);
    } catch (err) {
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

  private getOrInitApp(): admin.app.App {
    if (this.app) return this.app;

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const serviceAccountJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');

    if (!projectId) {
      throw new Error('FirebaseAuthProvider used without FIREBASE_PROJECT_ID configured');
    }

    // Prefer explicit service-account JSON when present. Org policy may block key
    // creation (`iam.disableServiceAccountKeyCreation`); in that case set
    // FIREBASE_SERVICE_ACCOUNT_JSON=ADC and rely on Application Default Credentials
    // (gcloud ADC locally, attached SA on Cloud Run).
    const credential =
      serviceAccountJson && serviceAccountJson !== 'ADC'
        ? admin.credential.cert(JSON.parse(serviceAccountJson))
        : admin.credential.applicationDefault();

    this.app = admin.initializeApp({
      credential,
      projectId,
    });
    return this.app;
  }
}
