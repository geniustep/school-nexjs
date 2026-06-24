/** Moroccan Massar code: one Latin letter + nine digits (e.g. G412252321). */
export const MASSAR_CODE_PATTERN = /^[A-Z][0-9]{9}$/;

const TAALIM_EMAIL_SUFFIX = '@taalim.ma';

/**
 * Normalize user input to a Massar code candidate (Odoo-aligned).
 * Empty after trim → '' (not an error).
 */
export function normalizeMassarCodeInput(raw: string): string {
  let value = raw.trim();
  if (!value) return '';

  const lower = value.toLowerCase();
  const suffixIndex = lower.indexOf(TAALIM_EMAIL_SUFFIX);
  if (suffixIndex >= 0) {
    value = value.slice(0, suffixIndex);
  }

  value = value.replace(/[\s-]/g, '');
  return value.toUpperCase();
}

export function isValidMassarCodeNormalized(normalized: string): boolean {
  if (!normalized) return true;
  return MASSAR_CODE_PATTERN.test(normalized);
}

export function shouldCheckMassarCodeDuplicate(raw: string): boolean {
  const normalized = normalizeMassarCodeInput(raw);
  return normalized.length > 0 && MASSAR_CODE_PATTERN.test(normalized);
}
