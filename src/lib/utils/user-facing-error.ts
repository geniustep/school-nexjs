/**
 * Strip internal/backend terminology from strings shown in the product UI.
 */

const INTERNAL_TECH_LEAK_RE =
  /(odoo|\/api\/|\bapi\b|endpoint|payload|res\.users|res\.partner|active_school_id|template_code|capability_codes|subject_id|class_ids?|academic_year_id|\bdb\b|database|bff)/i;

const CLASS_ID_PHRASE = /\bclass id\b/i;

/** English infrastructure / proxy messages that must never be shown raw in the UI. */
const ENGLISH_INFRA_ERROR_RE =
  /\b(bad gateway|gateway timeout|service unavailable|web server reported|could not reach the server|could not reach server|unexpected server response|unexpected response|request failed|econnrefused|etimedout|socket hang up|internal server error|502 bad gateway|503 service|504 gateway)\b/i;

const KNOWN_ENGLISH_ERROR_I18N_KEYS: Record<string, string> = {
  'The web server reported a bad gateway error.': 'errors.badGateway',
  'The web server reported a bad gateway error': 'errors.badGateway',
  'Could not reach the server. Please check your connection.': 'errors.network',
  'Could not reach the server. Please try again.': 'errors.network',
  'Could not reach server.': 'errors.network',
  'Could not reach the server.': 'errors.network',
  'Unexpected server response.': 'errors.serverError',
  'Unexpected server response': 'errors.serverError',
  'Request failed.': 'errors.serverError',
  'Request failed': 'errors.serverError',
};

export function containsInternalTechLeak(message: string | null | undefined): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return false;
  if (/^odoo$/i.test(trimmed)) return true;
  if (CLASS_ID_PHRASE.test(trimmed)) return true;
  return INTERNAL_TECH_LEAK_RE.test(trimmed);
}

export function isEnglishInfrastructureErrorMessage(
  message: string | null | undefined,
): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return false;
  if (KNOWN_ENGLISH_ERROR_I18N_KEYS[trimmed]) return true;
  return ENGLISH_INFRA_ERROR_RE.test(trimmed);
}

export function isUnsafeUserFacingErrorMessage(message: string | null | undefined): boolean {
  const trimmed = message?.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith('Error:')) return true;
  if (trimmed.includes('<')) return true;
  if (/traceback/i.test(trimmed)) return true;
  if (trimmed.startsWith('Unexpected response')) return true;
  if (isEnglishInfrastructureErrorMessage(trimmed)) return true;
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

/**
 * Map known English API/proxy messages to i18n keys.
 * Returns null when no mapping applies (caller should fall back to sanitize + generic).
 */
export function resolveKnownApiErrorMessageKey(
  message: string | null | undefined,
): string | null {
  const trimmed = message?.trim();
  if (!trimmed) return null;
  const exact = KNOWN_ENGLISH_ERROR_I18N_KEYS[trimmed];
  if (exact) return exact;
  if (/\bbad gateway\b/i.test(trimmed) || /\bweb server reported\b/i.test(trimmed)) {
    return 'errors.badGateway';
  }
  if (/\bcould not reach\b/i.test(trimmed) || /\bcheck your connection\b/i.test(trimmed)) {
    return 'errors.network';
  }
  if (/\bgateway timeout\b|\bservice unavailable\b/i.test(trimmed)) {
    return 'errors.badGateway';
  }
  return null;
}
