/**
 * User-facing labels for technical Admissions enums/codes.
 * Keep raw codes for tests/API; never surface them in UI text.
 */

const CONTACT_RESULT_CODES = new Set([
  'reached',
  'no_answer',
  'wrong_number',
  'call_later',
  'family_interested',
  'family_not_interested',
  'appointment_scheduled',
  'information_sent',
  'other',
]);

const TECHNICAL_ACTOR_NAMES = new Map<string, string>([
  ['administrator', 'admin.admissions.card.administrativeRole'],
  ['admin', 'admin.admissions.card.administrativeRole'],
  ['odooBot', 'admin.admissions.card.administrativeRole'],
  ['odoobot', 'admin.admissions.card.administrativeRole'],
]);

export function modernActionLabelKey(code: string): string {
  switch (code) {
    case 'log_contact':
      return 'admin.admissions.actions.logContact';
    case 'accept':
      return 'admin.admissions.actions.accept';
    case 'reject':
      return 'admin.admissions.actions.reject';
    case 'record_family_approval':
      return 'admin.admissions.actions.recordFamilyApproval';
    case 'accept_and_record_family_approval':
      return 'admin.admissions.actions.acceptAndRecordFamilyApproval';
    case 'convert_to_student':
      return 'admin.admissions.actions.convertToStudent';
    case 'reopen':
      return 'admin.admissions.actions.reopen';
    case 'close':
      return 'admin.admissions.actions.close';
    case 'waitlist':
      return 'admin.admissions.actions.waitlist';
    case 'add_note':
      return 'admin.admissions.actions.addNote';
    case 'record_assessment':
      return 'admin.admissions.actions.recordAssessment';
    case 'complete_assessment':
      return 'admin.admissions.actions.completeAssessment';
    case 'request_reassessment':
      return 'admin.admissions.actions.requestReassessment';
    default:
      return 'admin.admissions.card.unknownActivity';
  }
}

export function contactResultLabelKey(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  if (!CONTACT_RESULT_CODES.has(normalized)) return null;
  return `admin.admissions.contactResults.${normalized}`;
}

export function isTechnicalRawCode(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (CONTACT_RESULT_CODES.has(trimmed.toLowerCase())) return true;
  if (/^[a-z][a-z0-9_]*$/i.test(trimmed) && trimmed.includes('_')) return true;
  return Boolean(TECHNICAL_ACTOR_NAMES.has(trimmed.toLowerCase()));
}

export function resolveOperationalResultLabel(
  raw: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!raw?.trim()) return t('admin.admissions.card.unknownActivity');
  const key = contactResultLabelKey(raw);
  if (key) return t(key);
  if (isTechnicalRawCode(raw)) return t('admin.admissions.card.unknownActivity');
  return raw.trim();
}

export function resolveOperationalActorLabel(
  raw: string | null | undefined,
  t: (key: string) => string,
): string | null {
  if (!raw?.trim()) return null;
  const mapped = TECHNICAL_ACTOR_NAMES.get(raw.trim().toLowerCase());
  if (mapped) return t(mapped);
  if (isTechnicalRawCode(raw)) return t('admin.admissions.card.administrativeRole');
  return raw.trim();
}

export function resolveOperationalActionLabel(
  code: string | null | undefined,
  t: (key: string) => string,
): string | null {
  if (!code?.trim()) return null;
  const key = modernActionLabelKey(code.trim());
  const label = t(key);
  // If i18n falls back to the key path, treat as unknown.
  if (!label || label === key || label.startsWith('admin.admissions.')) {
    return t('admin.admissions.card.unknownActivity');
  }
  return label;
}
