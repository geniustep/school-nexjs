const TECHNICAL_EMAIL_DOMAINS = new Set([
  'example.invalid',
  'example.com',
  'example.net',
  'example.org',
  'localhost',
  'invalid',
  'test',
]);

const BASIC_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isUsableGuardianEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  const normalized = normalizeEmail(email);
  if (!BASIC_EMAIL.test(normalized)) return false;

  const [, domain = ''] = normalized.split('@');
  if (TECHNICAL_EMAIL_DOMAINS.has(domain)) return false;
  if (/^guardian\+\d+@/.test(normalized)) return false;
  if (normalized.includes('+') && domain.startsWith('example.')) return false;

  return true;
}

export type GuardianEmailPresentation =
  | { kind: 'usable'; email: string }
  | { kind: 'hidden_technical' }
  | { kind: 'missing' };

export function getGuardianEmailPresentation(
  email: string | null | undefined,
): GuardianEmailPresentation {
  if (!email?.trim()) return { kind: 'missing' };
  if (!isUsableGuardianEmail(email)) return { kind: 'hidden_technical' };
  return { kind: 'usable', email: email.trim() };
}

export function hasUsableGuardianPhone(phone: string | null | undefined): boolean {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 9;
}

export function hasCompleteGuardianContact(
  phone: string | null | undefined,
  secondaryPhone: string | null | undefined,
  email: string | null | undefined,
): boolean {
  return (
    hasUsableGuardianPhone(phone) ||
    hasUsableGuardianPhone(secondaryPhone) ||
    isUsableGuardianEmail(email)
  );
}
