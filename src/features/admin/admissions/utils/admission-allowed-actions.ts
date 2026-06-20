import type { AdmissionAllowedActions, AdmissionDetail } from '@/types/admission';

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

export function normalizeAdmissionDetail(detail: AdmissionDetail): AdmissionDetail {
  return {
    ...detail,
    allowed_actions: normalizeAdmissionAllowedActions(
      detail.allowed_actions as AdmissionAllowedActions | string[] | undefined,
    ),
  };
}
