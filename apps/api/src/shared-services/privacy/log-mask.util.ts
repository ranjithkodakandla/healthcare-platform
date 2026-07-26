/** Mask PII/secrets before writing to application logs (DPDP / CERT-In hygiene). */

const PHONE_RE = /(\+?\d[\d\s-]{8,}\d)/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return '[phone]';
  return `${digits.slice(0, 2)}••••${digits.slice(-3)}`;
}

export function maskLogText(input: string, opts?: { keepShortCodes?: boolean }): string {
  let out = input
    .replace(JWT_RE, '[token]')
    .replace(BEARER_RE, 'Bearer [token]')
    .replace(EMAIL_RE, '[email]')
    .replace(PHONE_RE, (m) => maskPhone(m));
  if (!opts?.keepShortCodes) {
    // Avoid masking years; only mask standalone 6-digit OTP-like codes.
    out = out.replace(/\b(\d{6})\b/g, '[otp]');
  }
  return out;
}
