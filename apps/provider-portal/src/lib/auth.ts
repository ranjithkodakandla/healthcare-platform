import { signInWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseAuth } from './firebase';
import { saveSession } from './api';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function signInProvider(params: {
  email: string;
  password: string;
  hospitalId: string;
}): Promise<void> {
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

  saveSession(params.hospitalId.trim(), idToken);
}
