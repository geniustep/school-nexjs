import type { AdmissionAllowedActions, AdmissionDetail } from '@/types/admission';
import { hasUserCapability } from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';

export const ADMISSION_UPDATE_LIMITED_CAPABILITY = 'admission.update_limited';

export function normalizeAdmissionAllowedActions(
  raw: AdmissionAllowedActions | string[] | undefined | null,
): AdmissionAllowedActions {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: AdmissionAllowedActions = {};
    for (const key of raw) {
      if (typeof key === 'string') {
        (out as Record<string, boolean>)[key] = true;
      }
    }
    return out;
  }
  return raw;
}

export function hasAdmissionAllowedAction(
  actions: AdmissionAllowedActions | string[] | undefined | null,
  key: keyof AdmissionAllowedActions | string,
): boolean {
  const normalized = normalizeAdmissionAllowedActions(actions);
  return Boolean((normalized as Record<string, boolean | undefined>)[key]);
}

/** Limited PATCH — honors API deny, then allowed_actions.edit, then admission.update_limited. */
export function canEditAdmissionDetail(
  actions: AdmissionAllowedActions | string[] | undefined | null,
  user?: CurrentUser | null,
): boolean {
  const normalized = normalizeAdmissionAllowedActions(actions);
  if (normalized.edit === false) return false;
  if (normalized.edit === true) return true;
  return hasUserCapability(user, ADMISSION_UPDATE_LIMITED_CAPABILITY);
}

/** Full state transitions — not granted by admission.update_limited alone. */
export function canChangeAdmissionState(
  actions: AdmissionAllowedActions | string[] | undefined | null,
): boolean {
  if (hasAdmissionAllowedAction(actions, 'change_state')) return true;
  return hasAdmissionAllowedAction(actions, 'decide');
}

export function normalizeAdmissionDetail(detail: AdmissionDetail): AdmissionDetail {
  return {
    ...detail,
    allowed_actions: normalizeAdmissionAllowedActions(
      detail.allowed_actions as AdmissionAllowedActions | string[] | undefined,
    ),
  };
}
