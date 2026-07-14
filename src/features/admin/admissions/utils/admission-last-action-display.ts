import type { AdmissionLastAction } from '@/types/admission';

type Formatters = {
  formatTime?: (value: string) => string;
  actorLabel?: (value: string) => string;
};

function actorName(action: AdmissionLastAction) {
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

export function formatLastActionSummary(action: AdmissionLastAction | null | undefined, formatters: Formatters = {}) {
  if (!action) return { key: 'admin.admissions.lastAction.none', parts: [] as string[] };
  const parts = [action.result_label ?? action.result ?? action.label ?? action.code].filter(
    (part): part is string => typeof part === 'string' && Boolean(part),
  );
  const actor = actorName(action);
  if (actor) parts.push(formatters.actorLabel?.(actor) ?? actor);
  const occurredAt = action.occurred_at ?? action.at;
  if (occurredAt) parts.push(formatters.formatTime?.(occurredAt) ?? occurredAt);
  return { key: null, parts };
}
