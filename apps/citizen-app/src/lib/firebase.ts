import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

// Client-side Firebase (DL-001/DL-008). Config is public by design (NEXT_PUBLIC_*);
// security is enforced by Auth rules + server-side verifyIdToken.
//
// IMPORTANT: Next.js only inlines env vars accessed via static property paths
// (process.env.NEXT_PUBLIC_FOO). Dynamic process.env[name] is undefined in the
// browser bundle — do not use a requireEnv(name) helper.
function requirePublic(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not set — copy .env.local.example to .env.local`);
  }
  return value;
}

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length) return getApp();
  return initializeApp({
    apiKey: requirePublic(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, 'NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: requirePublic(
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    ),
    projectId: requirePublic(
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: requirePublic(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, 'NEXT_PUBLIC_FIREBASE_APP_ID'),
  });
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
