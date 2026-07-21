import type { AllowedActionsMap } from '@/types/teacher-domain';

export function normalizeAllowedActions(
  raw: AllowedActionsMap | string[] | undefined | null,
): AllowedActionsMap {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    return Object.fromEntries(raw.filter((k) => typeof k === 'string').map((k) => [k, true]));
  }
  const out: AllowedActionsMap = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === true) out[key] = true;
  }
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
