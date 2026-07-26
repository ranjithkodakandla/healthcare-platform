import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

let cached: admin.app.App | undefined;

/** Shared Firebase Admin app (ADC or explicit SA JSON). */
export function getFirebaseAdminApp(config: ConfigService): admin.app.App {
  if (cached) return cached;
  if (admin.apps.length > 0) {
    cached = admin.app();
    return cached;
  }

  const projectId = config.get<string>('FIREBASE_PROJECT_ID');
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required to use Firebase Admin');
  }

  const serviceAccountJson = config.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
  const credential =
    serviceAccountJson && serviceAccountJson !== 'ADC'
      ? admin.credential.cert(JSON.parse(serviceAccountJson))
      : admin.credential.applicationDefault();

  cached = admin.initializeApp({ credential, projectId });
  return cached;
}
