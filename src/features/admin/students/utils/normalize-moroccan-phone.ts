export interface MoroccanPhoneNormalization {
  /** Digits-only local form: 0XXXXXXXXX (10 digits starting with 0) */
  local: string | null;
  /** E.164 without plus: 212XXXXXXXXX */
  international: string | null;
  /** Whether input looked like a phone number */
  isPhoneLike: boolean;
}

const PHONE_LIKE = /^[\d+\s().-]+$/;

export function isPhoneLikeQuery(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!PHONE_LIKE.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 8;
}

export function normalizeMoroccanPhone(input: string): MoroccanPhoneNormalization {
  const trimmed = input.trim();
  if (!trimmed) {
    return { local: null, international: null, isPhoneLike: false };
  }

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) {
    return { local: null, international: null, isPhoneLike: isPhoneLikeQuery(trimmed) };
  }

  if (digits.startsWith('00212')) {
    digits = digits.slice(2);
  }
  if (digits.startsWith('212') && digits.length >= 12) {
    digits = `0${digits.slice(3)}`;
  }

  if (digits.length === 9 && digits.startsWith('6')) {
    digits = `0${digits}`;
  }

  const local = digits.length === 10 && digits.startsWith('0') ? digits : null;
  const international = local ? `212${local.slice(1)}` : null;

  return {
    local,
    international,
    isPhoneLike: isPhoneLikeQuery(trimmed),
  };
}

/** Prefer local 06… form for School API search (confirmed on production). */
export function moroccanPhoneSearchQuery(input: string): string {
  const norm = normalizeMoroccanPhone(input);
  if (norm.local) return norm.local;
  return input.trim();
}

export function formatMoroccanPhoneDisplay(input: string | null | undefined): string {
  if (!input?.trim()) return '';
  const norm = normalizeMoroccanPhone(input);
  return norm.local ?? input.trim();
}

export function validateMoroccanPhone(input: string): boolean {
  const norm = normalizeMoroccanPhone(input);
  return norm.local != null;
}

export function emailsEqual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function moroccanPhoneSearchVariants(input: string): string[] {
  const norm = normalizeMoroccanPhone(input);
  const variants = new Set<string>();
  const trimmed = input.trim();
  if (trimmed) variants.add(trimmed);
  if (norm.local) variants.add(norm.local);
  if (norm.international) {
    variants.add(norm.international);
    variants.add(`+${norm.international}`);
    variants.add(`212${norm.local?.slice(1) ?? ''}`);
  }
  return [...variants].filter(Boolean);
}
