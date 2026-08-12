import type { AllowedActionsMap } from '@/types/teacher-domain';

export function normalizeAllowedActions(
  raw: AllowedActionsMap | string[] | undefined | null,
): AllowedActionsMap {
  if (!raw) return {};
  const out: AllowedActionsMap = {};
  if (Array.isArray(raw)) {
    for (const key of raw) {
      if (typeof key === 'string') out[key] = true;
    }
  } else {
    for (const [key, value] of Object.entries(raw)) {
      if (value === true) out[key] = true;
    }
  }

  // Odoo 1C intentionally hides legacy `reactivate` for a terminated teacher and
  // exposes `restart_membership` instead. The existing profile action remains the
  // single lifecycle entry point; the dialog distinguishes restart from resume.
  if (out.restart_membership === true) out.reactivate = true;
  return out;
}

export function hasAllowedAction(
  raw: AllowedActionsMap | string[] | undefined | null,
  action: string,
): boolean {
  return normalizeAllowedActions(raw)[action] === true;
}

/** Backend may expose either edit_eligibility or can_edit_academic_profile (238 aliases). */
export function canEditAcademicProfile(
  raw: AllowedActionsMap | string[] | undefined | null,
): boolean {
  const actions = normalizeAllowedActions(raw);
  return actions.edit_eligibility === true || actions.can_edit_academic_profile === true;
}

export function canEditAcademicLimits(
  raw: AllowedActionsMap | string[] | undefined | null,
): boolean {
  const actions = normalizeAllowedActions(raw);
  if (actions.edit_limits === true) return true;
  return canEditAcademicProfile(actions);
}
