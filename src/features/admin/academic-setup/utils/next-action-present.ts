import type { GuidedStep, GuidedStepId } from './guided-flow';

/** Core journey order for next-action presentation (staff excluded). */
export const NEXT_ACTION_STEP_ORDER: GuidedStepId[] = [
  'levels',
  'classes',
  'subjects',
  'teachers',
  'assignments',
];

/**
 * Follow journey dependencies, not the lowest readiness score.
 *
 * A step becomes the next required action when its prerequisite is absent
 * (`not_started`) or it carries a blocking issue. Non-blocking warnings may
 * lower readiness and remain visible, but they must not hold the journey on an
 * earlier step. This keeps readiness advisory unless a true prerequisite is blocked.
 */
export function resolveNextStep(steps: GuidedStep[]): GuidedStep | null {
  for (const id of NEXT_ACTION_STEP_ORDER) {
    const step = steps.find((s) => s.id === id);
    if (!step || !step.available || step.state === 'locked' || step.state === 'completed') {
      continue;
    }
    // Once levels exist, class/subject gaps belong to later steps — not «add levels».
    if (id === 'levels' && step.state !== 'not_started') continue;
    if (step.state === 'not_started' || step.state === 'blocked' || step.blockingCount > 0) {
      return step;
    }
  }

  const review = steps.find((s) => s.id === 'review');
  if (review && review.missingCount > 0) return review;
  return review ?? null;
}

export function primaryCtaFromSteps(steps: GuidedStep[]): GuidedStep | null {
  return resolveNextStep(steps);
}

export const NEXT_ACTION_TITLE_KEYS: Record<GuidedStepId, string> = {
  levels: 'admin.academicSetup.nextActionTitles.levels',
  classes: 'admin.academicSetup.nextActionTitles.classes',
  subjects: 'admin.academicSetup.nextActionTitles.subjects',
  teachers: 'admin.academicSetup.nextActionTitles.teachers',
  staff: 'admin.academicSetup.nextActionTitles.staff',
  assignments: 'admin.academicSetup.nextActionTitles.assignments',
  review: 'admin.academicSetup.nextActionTitles.review',
};

export function nextActionTitleKey(step: GuidedStep): string {
  return NEXT_ACTION_TITLE_KEYS[step.id] ?? step.actionKey;
}
