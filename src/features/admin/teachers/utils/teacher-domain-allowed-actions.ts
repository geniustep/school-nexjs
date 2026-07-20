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
