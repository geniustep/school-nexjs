import type {
  GradebookAllowedActions,
  GradebookDetail,
  GradebookLifecycleAction,
} from '@/types/gradebook';

export function normalizeGradebookAllowedActions(
  raw: GradebookAllowedActions | string[] | undefined | null,
): GradebookAllowedActions {
  if (!raw) return {};
  if (Array.isArray(raw)) {
    const out: GradebookAllowedActions = {};
    for (const key of raw) {
      if (typeof key === 'string') {
        out[key] = true;
      }
    }
    return out;
  }
  return raw;
}

export function hasGradebookAllowedAction(
  actions: GradebookAllowedActions | string[] | undefined | null,
  key: keyof GradebookAllowedActions | GradebookLifecycleAction | string,
): boolean {
  const normalized = normalizeGradebookAllowedActions(actions);
  return Boolean((normalized as Record<string, boolean | undefined>)[key]);
}

export function normalizeGradebookDetail(detail: GradebookDetail): GradebookDetail {
  // Keep allowed_actions normalization for callers that already hold UI-shaped detail.
  return {
    ...detail,
    allowed_actions: normalizeGradebookAllowedActions(detail.allowed_actions),
  };
}

export const GRADEBOOK_LIFECYCLE_ACTIONS: readonly GradebookLifecycleAction[] = [
  'build_roster',
  'sync_roster',
  'open',
  'submit',
  'validate',
  'publish',
  'lock',
];

export const GRADEBOOK_SENSITIVE_ACTIONS: readonly GradebookLifecycleAction[] = [
  'submit',
  'validate',
  'publish',
  'lock',
];

export function gradebookLifecycleActionLabelKey(action: GradebookLifecycleAction): string {
  return `admin.gradebooks.actions.${action}`;
}
