import { getFirebaseAuth } from './firebase';
import { getCitizenToken, saveCitizenToken } from './token';

export { getCitizenToken, saveCitizenToken, clearCitizenToken } from './token';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Exchange a Firebase ID token for an audited platform session, then persist the token. */
export async function establishCitizenSession(idToken: string): Promise<void> {
  const res = await fetch(`${BASE}/v1/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Session failed: ${res.status} ${body}`);
  }
  saveCitizenToken(idToken);
}

export async function refreshCitizenIdToken(): Promise<string | null> {
  const user = getFirebaseAuth().currentUser;
  if (!user) return getCitizenToken();
  const idToken = await user.getIdToken(/* forceRefresh */ true);
  saveCitizenToken(idToken);
  return idToken;
}
