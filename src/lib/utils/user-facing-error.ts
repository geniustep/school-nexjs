/**
 * Strip internal/backend terminology from strings shown in the product UI.
 */

const INTERNAL_TECH_LEAK_RE =
  /(odoo|\/api\/|\bapi\b|endpoint|payload|res\.users|res\.partner|active_school_id|template_code|capability_codes|subject_id|class_ids?|academic_year_id|\bdb\b|database|bff)/i;

const CLASS_ID_PHRASE = /\bclass id\b/i;

export function containsInternalTechLeak(message: string | null | undefined): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return false;
  if (/^odoo$/i.test(trimmed)) return true;
  if (CLASS_ID_PHRASE.test(trimmed)) return true;
  return INTERNAL_TECH_LEAK_RE.test(trimmed);
}

export function isUnsafeUserFacingErrorMessage(message: string | null | undefined): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('Error:')) return true;
  if (trimmed.includes('<')) return true;
  if (/traceback/i.test(trimmed)) return true;
  if (trimmed.startsWith('Unexpected response')) return true;
  return containsInternalTechLeak(trimmed);
}

/** Returns a safe message for UI, or `fallback` when the raw text must not be shown. */
export function sanitizeUserFacingErrorMessage(
  message: string | null | undefined,
  fallback: string,
): string {
  if (isUnsafeUserFacingErrorMessage(message)) return fallback;
  return message!.trim();
}

/** Client-side API envelope sanitizer — keeps i18n fallbacks in UI components. */
export function sanitizeClientApiErrorMessage(message: string | null | undefined): string {
  if (isUnsafeUserFacingErrorMessage(message)) return '';
  return message!.trim();
}
