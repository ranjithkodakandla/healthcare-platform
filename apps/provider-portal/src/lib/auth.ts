import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { saveSession } from './api';
import { ProviderType } from './types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface SessionResponse {
  data: {
    uid: string;
    role: string;
    orgId?: string;
    providerType?: ProviderType;
  };
}

// Returns the verified providerType so the caller (login page) can route to the
// correct portal — never trust a portal choice the user clicked before sign-in.
export async function signInProvider(params: {
  email: string;
  password: string;
}): Promise<{ providerType: ProviderType | null }> {
  const cred = await signInWithEmailAndPassword(getFirebaseAuth(), params.email.trim(), params.password);
  const idToken = await cred.user.getIdToken();

  const res = await fetch(`${BASE}/v1/auth/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Session failed: ${res.status} ${body}`);
  }

  const body: SessionResponse = await res.json();
  const { role, orgId, providerType } = body.data;
  if (!orgId) {
    throw new Error('Sign-in succeeded but no organization is linked to this account. Contact your administrator.');
  }

  saveSession({ orgId, token: idToken, role, providerType: providerType ?? null });
  return { providerType: providerType ?? null };
}
