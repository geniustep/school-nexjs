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

export function isModernActionExplicitlyDenied(actions: unknown, code: string) {
  return normalizeModernAllowedActions(actions).some(
    (action) => action.code === code && action.allowed === false,
  );
}

function hasLinkedStudentGuard(record: {
  student_id?: unknown;
  navigation?: AdmissionNavigation | null;
}): boolean {
  const sid = record.student_id;
  if (typeof sid === 'number' && Number.isFinite(sid) && sid > 0) return true;
  const navId = record.navigation?.student?.id;
  return typeof navId === 'number' && Number.isFinite(navId) && navId > 0;
}

/**
 * Convert-to-student visibility — Backend permission first.
 *
 * Rule:
 *   unregistered + convert_to_student.allowed=true → show
 *
 * Must NOT require ready_for_registration / accepted / family approval /
 * processing_stage / registration_readiness. Status only blocks `registered`.
 */
export function shouldShowConvertToStudentAction(record: {
  application_status?: unknown;
  modern_allowed_actions?: unknown;
  primary_next_action?: unknown;
  student_id?: unknown;
  navigation?: AdmissionNavigation | null;
}): boolean {
  const status =
    typeof record.application_status === 'string' ? record.application_status : null;
  if (status === 'registered') return false;
  if (hasLinkedStudentGuard(record)) return false;
  if (isModernActionExplicitlyDenied(record.modern_allowed_actions, 'convert_to_student')) {
    return false;
  }
  if (isModernActionAllowed(record.modern_allowed_actions, 'convert_to_student')) {
    return true;
  }
  // Primary-only signal when allowed list omitted convert but Backend still set it primary.
  return resolvePrimaryNextActionCode(record.primary_next_action) === 'convert_to_student';
}

/**
 * Which code owns the primary CTA — presentation only.
 * Convert is primary only when primary_next_action says so (and convert is allowed).
 * Never elevates convert from application_status alone (e.g. ready_for_registration).
 */
export function resolveDetailPrimaryActionCode(record: {
  application_status?: unknown;
  modern_allowed_actions?: unknown;
  primary_next_action?: unknown;
  student_id?: unknown;
  navigation?: AdmissionNavigation | null;
}): string | null {
  const status =
    typeof record.application_status === 'string' ? record.application_status : null;
  if (status === 'registered') return null;

  const primary = resolvePrimaryNextActionCode(record.primary_next_action);

  // Operational preference on accepted: family approval as primary when allowed,
  // while convert remains a secondary admin CTA via shouldShowConvertToStudentAction.
  if (status === 'accepted') {
    if (isModernActionAllowed(record.modern_allowed_actions, 'accept_and_record_family_approval')) {
      return 'accept_and_record_family_approval';
    }
    if (isModernActionAllowed(record.modern_allowed_actions, 'record_family_approval')) {
      return 'record_family_approval';
    }
    if (
      primary === 'record_family_approval' ||
      primary === 'accept_and_record_family_approval'
    ) {
      return primary;
    }
  }

  if (primary === 'convert_to_student') {
    return shouldShowConvertToStudentAction(record) ? 'convert_to_student' : null;
  }

  if (!primary || primary === 'start_registration') return null;
  if (isModernActionExplicitlyDenied(record.modern_allowed_actions, primary)) return null;
  return primary;
}

export function isModernActionAllowedOrPrimary(
  actions: unknown,
  code: string,
  primary: unknown,
): boolean {
  if (isModernActionExplicitlyDenied(actions, code)) return false;
  if (isModernActionAllowed(actions, code)) return true;
  return resolvePrimaryNextActionCode(primary) === code;
}

export function resolvePrimaryNextActionCode(primary: unknown): string | null {
  if (typeof primary === 'string') return primary || null;
  if (primary && typeof primary === 'object') {
    const value = primary as { code?: unknown; action?: unknown };
    return typeof value.code === 'string'
      ? value.code
      : typeof value.action === 'string'
        ? value.action
        : null;
  }
  return null;
}

export function filterDailyModernActions(actions: unknown) {
  return normalizeModernAllowedActions(actions).filter(
    (action) =>
      action.allowed &&
      action.code !== EXCEPTIONAL_ONLY &&
      action.code !== 'start_registration' &&
      // Dedicated dialog (needs target_status + note) — never auto-run.
      action.code !== 'return_to_status' &&
      action.code !== 'change_status',
  );
}

/** Normalize Backend status-target lists into status code strings. No local fallback list. */
export function normalizeAllowedStatusTargets(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    let code = '';
    if (typeof item === 'string') {
      code = item.trim();
    } else if (item && typeof item === 'object') {
      const row = item as {
        code?: unknown;
        status?: unknown;
        target_status?: unknown;
      };
      const candidate = row.code ?? row.status ?? row.target_status;
      code = typeof candidate === 'string' ? candidate.trim() : '';
    }
    if (!code || seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/** @deprecated Prefer normalizeAllowedStatusTargets — 14A alias. */
export function normalizeAllowedReturnTargets(raw: unknown): string[] {
  return normalizeAllowedStatusTargets(raw);
}

/**
 * Unified change_status visibility — Backend allowed_status_targets only.
 * registered is never changeable; rejected/closed may show when Backend allows reopen via targets.
 */
export function canShowChangeStatusAction(record: {
  application_status?: unknown;
  modern_allowed_actions?: unknown;
  allowed_status_targets?: unknown;
  allowed_return_targets?: unknown;
} | null | undefined): boolean {
  if (!record) return false;
  const status =
    typeof record.application_status === 'string' ? record.application_status.trim() : '';
  if (status === 'registered') return false;
  const targets = normalizeAllowedStatusTargets(record.allowed_status_targets);
  if (targets.length === 0) return false;
  if (isModernActionExplicitlyDenied(record.modern_allowed_actions, 'change_status')) {
    return false;
  }
  const modern = normalizeModernAllowedActions(record.modern_allowed_actions);
  const hasChangeEntry = modern.some((action) => action.code === 'change_status');
  if (hasChangeEntry) {
    return isModernActionAllowed(record.modern_allowed_actions, 'change_status');
  }
  return true;
}

/**
 * Intersection of allowed_status_targets across selected records (bulk).
 */
export function intersectAllowedStatusTargets(
  records: Array<{ allowed_status_targets?: unknown } | null | undefined>,
): string[] {
  const lists = records.map((record) => normalizeAllowedStatusTargets(record?.allowed_status_targets));
  if (lists.length === 0) return [];
  let intersection = lists[0] ?? [];
  for (let i = 1; i < lists.length; i += 1) {
    const set = new Set(lists[i]);
    intersection = intersection.filter((code) => set.has(code));
  }
  return intersection;
}

/**
 * Return-to-earlier-status visibility — Backend fields only (14A retained).
 * Prefer canShowChangeStatusAction for the unified UI.
 */
export function canShowReturnToStatusAction(record: {
  application_status?: unknown;
  modern_allowed_actions?: unknown;
  allowed_return_targets?: unknown;
} | null | undefined): boolean {
  if (!record) return false;
  const status =
    typeof record.application_status === 'string' ? record.application_status.trim() : '';
  if (status === 'registered' || status === 'rejected' || status === 'closed') return false;
  const targets = normalizeAllowedReturnTargets(record.allowed_return_targets);
  if (targets.length === 0) return false;
  if (isModernActionExplicitlyDenied(record.modern_allowed_actions, 'return_to_status')) {
    return false;
  }
  const modern = normalizeModernAllowedActions(record.modern_allowed_actions);
  const hasReturnEntry = modern.some((action) => action.code === 'return_to_status');
  if (hasReturnEntry) {
    return isModernActionAllowed(record.modern_allowed_actions, 'return_to_status');
  }
  return true;
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
