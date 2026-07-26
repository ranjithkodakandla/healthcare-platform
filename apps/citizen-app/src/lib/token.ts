const TOKEN_KEY = 'citizen_token';

export function getCitizenToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveCitizenToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearCitizenToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
