/** Resolve Odoo term create/edit API errors into safe user-facing copy. */

import { isUnsafeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';

const TERM_EDIT_ERROR_CODES = new Set([
  'term_not_found',
  'term_edit_not_allowed',
  'invalid_term_field',
  'invalid_term_name',
  'invalid_term_code',
  'term_dates_invalid',
  'term_dates_outside_academic_year',
  'term_dates_overlap',
  'term_code_conflict',
]);

export type AcademicTermMutationErrorInput = {
  code?: string | null;
  message?: string | null;
  /** Loose alternate field some envelopes may use. */
  detail?: unknown;
  details?: unknown;
};

export function academicTermEditErrorI18nKey(code: string | undefined | null): string {
  if (code && TERM_EDIT_ERROR_CODES.has(code)) {
    return `academicContext.errors.${code}`;
  }
  return 'academicContext.errors.term_edit_failed';
}

function readSafeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isUnsafeUserFacingErrorMessage(trimmed)) return null;
  return trimmed;
}

/**
 * Prefer the server's user-facing message, then fall back to known-code i18n,
 * then a generic localised failure string. Never invent Odoo validation rules.
 */
export function resolveAcademicTermEditErrorMessage(
  error: AcademicTermMutationErrorInput | null | undefined,
  translate: (key: string) => string,
): string {
  const fromMessage = readSafeText(error?.message);
  if (fromMessage) return fromMessage;

  const fromDetail = readSafeText(error?.detail);
  if (fromDetail) return fromDetail;

  if (typeof error?.details === 'string') {
    const fromDetailsString = readSafeText(error.details);
    if (fromDetailsString) return fromDetailsString;
  } else if (error?.details && typeof error.details === 'object' && !Array.isArray(error.details)) {
    const details = error.details as Record<string, unknown>;
    const fromDetailsMessage = readSafeText(details.message);
    if (fromDetailsMessage) return fromDetailsMessage;
    const fromDetailsDetail = readSafeText(details.detail);
    if (fromDetailsDetail) return fromDetailsDetail;
  }

  return translate(academicTermEditErrorI18nKey(error?.code));
}
