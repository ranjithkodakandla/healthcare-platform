/** Strip direct identifiers before sending text to third-party AI providers. */

const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const NAME_HINT_RE = /\b(my name is|i am|i'm)\s+[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})?/gi;

export function sanitizeForAi(text: string): string {
  return text
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, '[phone]')
    .replace(AADHAAR_RE, '[id]')
    .replace(NAME_HINT_RE, '$1 [name]')
    .trim();
}

/** Reduce location precision for retention / erasure (approx. ~1km). */
export function coarsenCoordinates(lat: number, lng: number): { lat: number; lng: number } {
  return {
    lat: Math.round(lat * 100) / 100,
    lng: Math.round(lng * 100) / 100,
  };
}

export function redactLocationJson(location: Record<string, unknown> | null | undefined): Record<string, unknown> {
  if (!location) return {};
  const next: Record<string, unknown> = { ...location };
  delete next.phone;
  delete next.mobile;
  delete next.guestPhone;
  if (typeof next.lat === 'number' && typeof next.lng === 'number') {
    const c = coarsenCoordinates(next.lat, next.lng);
    next.lat = c.lat;
    next.lng = c.lng;
    next.precision = 'coarse';
  }
  if (typeof next.address === 'string') {
    next.address = '[redacted address]';
  }
  next.erased = true;
  return next;
}
