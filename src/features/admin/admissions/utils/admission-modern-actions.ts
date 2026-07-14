import type { AdmissionModernAllowedAction, AdmissionNavigation } from '@/types/admission';

export const DAILY_ACTION_CODES = new Set([
  'log_contact',
  'add_note',
  'record_assessment',
  'complete_assessment',
  'accept',
  'reject',
  'waitlist',
  'request_reassessment',
  'record_family_approval',
  'accept_and_record_family_approval',
  'close',
  'reopen',
  'convert_to_student',
]);

export const EXCEPTIONAL_ONLY = 'link_existing_student';

export function normalizeModernAllowedActions(raw: unknown): AdmissionModernAllowedAction[] {
  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === 'string') return [{ code: item, allowed: true }];
      if (item && typeof item === 'object' && typeof (item as { code?: unknown }).code === 'string') {
        const action = item as AdmissionModernAllowedAction;
        return [{ ...action, allowed: action.allowed !== false }];
      }
      return [];
    });
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).flatMap(([code, value]) => {
      if (typeof value === 'boolean') return [{ code, allowed: value }];
      if (value && typeof value === 'object') {
        const action = value as Partial<AdmissionModernAllowedAction>;
        return [{ ...action, code: action.code ?? code, allowed: action.allowed !== false }];
      }
      return [];
    });
  }
  return [];
}

export function isModernActionAllowed(actions: unknown, code: string) {
  return normalizeModernAllowedActions(actions).some((action) => action.code === code && action.allowed);
}

export function resolvePrimaryNextActionCode(primary: unknown): string | null {
  if (typeof primary === 'string') return primary || null;
  if (primary && typeof primary === 'object') {
    const value = primary as { code?: unknown; action?: unknown };
    return typeof value.code === 'string' ? value.code : typeof value.action === 'string' ? value.action : null;
  }
  return null;
}

export function filterDailyModernActions(actions: unknown) {
  return normalizeModernAllowedActions(actions).filter(
    (action) => action.allowed && action.code !== EXCEPTIONAL_ONLY && action.code !== 'start_registration',
  );
}

export function resolveStudentNavigation(
  navigation: AdmissionNavigation | null | undefined,
  fallbackStudentId?: number | false | null,
) {
  const student = navigation?.student;
  if (student?.available === false) return null;
  const id = student?.id ?? (typeof fallbackStudentId === 'number' ? fallbackStudentId : null);
  const href = student?.href ?? student?.url ?? (id ? `/admin/students/${id}` : null);
  return id || href ? { id, href } : null;
}

export function hasModernContract(record: {
  application_status?: unknown;
  modern_allowed_actions?: unknown;
  primary_next_action?: unknown;
}) {
  return Boolean(
    record.application_status ||
      record.modern_allowed_actions ||
      record.primary_next_action,
  );
}
