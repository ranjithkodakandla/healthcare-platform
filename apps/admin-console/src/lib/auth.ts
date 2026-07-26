import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { clearAdminSession, saveAdminProfile, saveAdminToken } from './api';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

function displayNameFromUser(email: string, firebaseName: string | null): string {
  if (firebaseName?.trim()) return firebaseName.trim();
  const local = email.split('@')[0] || 'Staff';
  return local
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function signInAdmin(params: { email: string; password: string }): Promise<void> {
  // Drop any stale profile/token before writing the new session (D17).
  clearAdminSession();

  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), params.email.trim(), params.password);
  const idToken = await cred.user.getIdToken(true);

  const res = await fetch(`${BASE}/v1/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Session failed: ${res.status} ${body}`);
  }

  const email = cred.user.email ?? params.email.trim();
  saveAdminToken(idToken);
  saveAdminProfile({
    uid: cred.user.uid,
    email,
    displayName: displayNameFromUser(email, cred.user.displayName),
    roleLabel: 'Console Administrator',
  });
}

export async function signOutAdmin(): Promise<void> {
  clearAdminSession();
  try {
    await signOut(getFirebaseAuth());
  } catch {
    /* Firebase may already be signed out */
  }
  if (typeof window !== 'undefined') {
    window.location.assign('/login');
  }
}
