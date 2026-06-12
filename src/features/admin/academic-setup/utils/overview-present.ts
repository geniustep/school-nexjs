import type { SetupQuickAction } from '@/types/academic-setup';
import type { GuidedStep, GuidedStepId, GuidedStepState } from './guided-flow';

export const QUICK_ACTION_PRIORITY: string[] = [
  'level_without_classes',
  'no_classes',
  'class_without_subjects',
  'level_without_subjects',
  'subject_without_teacher',
  'no_teachers',
  'teacher_without_assignments',
  'assignment_missing',
  'complete_assignments',
];

export function limitQuickActions(actions: SetupQuickAction[], limit = 4): SetupQuickAction[] {
  const sorted = [...actions].sort((a, b) => {
    const ai = QUICK_ACTION_PRIORITY.indexOf(a.code);
    const bi = QUICK_ACTION_PRIORITY.indexOf(b.code);
    const ap = ai === -1 ? 999 : ai;
    const bp = bi === -1 ? 999 : bi;
    if (ap !== bp) return ap - bp;
    return (b.priority ?? 0) - (a.priority ?? 0) || b.count - a.count;
  });
  return sorted.slice(0, limit);
}

export const CORE_JOURNEY_IDS: GuidedStepId[] = [
  'levels',
  'classes',
  'subjects',
  'teachers',
  'assignments',
];

export function partitionGuidedSteps(steps: GuidedStep[]): {
  core: GuidedStep[];
  staff: GuidedStep | null;
  review: GuidedStep | null;
} {
  const staff = steps.find((s) => s.id === 'staff') ?? null;
  const review = steps.find((s) => s.id === 'review') ?? null;
  const core = CORE_JOURNEY_IDS.map((id) => steps.find((s) => s.id === id)).filter(
    (s): s is GuidedStep => !!s,
  );
  return { core, staff, review };
}

export type JourneyDisplayState =
  | 'not_started'
  | 'in_progress'
  | 'needs_completion'
  | 'needs_review'
  | 'complete'
  | 'unavailable'
  | 'blocker';

export function journeyDisplayState(step: GuidedStep): JourneyDisplayState {
  if (!step.available && step.state === 'locked') return 'unavailable';
  if (step.state === 'blocked') return 'blocker';
  if (step.state === 'completed') return 'complete';
  if (step.state === 'needs_attention') return 'needs_review';
  if (step.state === 'in_progress') return 'in_progress';
  if (step.state === 'not_started' && step.missingCount > 0) return 'needs_completion';
  return 'not_started';
}

export const JOURNEY_DISPLAY_TONE: Record<JourneyDisplayState, string> = {
  not_started: 'slate',
  in_progress: 'blue',
  needs_completion: 'amber',
  needs_review: 'amber',
  complete: 'green',
  unavailable: 'slate',
  blocker: 'red',
};
