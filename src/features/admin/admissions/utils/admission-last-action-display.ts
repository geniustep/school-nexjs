import type { AdmissionLastAction } from '@/types/admission';

type Formatters = {
  formatTime?: (value: string) => string;
  actorLabel?: (value: string) => string;
  /** Map raw result/code → user-facing label (never return technical enums). */
  resolveResult?: (raw: string) => string;
  /** Map raw actor display name → user-facing label. */
  resolveActor?: (raw: string) => string | null;
};

export function actorName(action: AdmissionLastAction) {
  if (action.actor_name) return action.actor_name;
  if (typeof action.actor === 'string') return action.actor;
  if (action.actor && typeof action.actor === 'object' && 'name' in action.actor) {
    return String((action.actor as { name?: unknown }).name ?? '') || null;
  }
  if (typeof action.user === 'string') return action.user;
  if (action.user && typeof action.user === 'object' && 'name' in action.user) {
    return String((action.user as { name?: unknown }).name ?? '') || null;
  }
  return null;
}

export function rawLastActionResult(action: AdmissionLastAction): string | null {
  const value = action.result_label ?? action.result ?? action.label ?? action.code;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function formatLastActionSummary(
  action: AdmissionLastAction | null | undefined,
  formatters: Formatters = {},
) {
  if (!action) return { key: 'admin.admissions.lastAction.none', parts: [] as string[] };

  const rawResult = rawLastActionResult(action);
  const result = rawResult
    ? formatters.resolveResult?.(rawResult) ?? rawResult
    : null;

  const parts: string[] = [];
  if (result) parts.push(result);

  const actorRaw = actorName(action);
  const actor = actorRaw
    ? formatters.resolveActor?.(actorRaw) ?? actorRaw
    : null;
  if (actor) parts.push(formatters.actorLabel?.(actor) ?? actor);

  const occurredAt = action.occurred_at ?? action.at;
  if (occurredAt) parts.push(formatters.formatTime?.(occurredAt) ?? occurredAt);

  return { key: null, parts, result, actor, occurredAt: occurredAt ?? null };
}
