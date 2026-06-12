import { describe, expect, it } from 'vitest';
import type { GuidedStep } from './guided-flow';
import {
  NEXT_ACTION_STEP_ORDER,
  nextActionTitleKey,
  primaryCtaFromSteps,
  resolveNextStep,
} from './next-action-present';

function step(id: GuidedStep['id'], partial: Partial<GuidedStep> = {}): GuidedStep {
  return {
    id,
    number: 1,
    state: 'not_started',
    lockReasonKey: null,
    missingCount: 0,
    summaryKey: 'k',
    summaryParams: {},
    href: '/',
    available: true,
    actionKey: 'a',
    ...partial,
  };
}

describe('resolveNextStep priority order', () => {
  it('prefers levels before classes when no levels exist', () => {
    const steps = [
      step('levels', { state: 'not_started' }),
      step('classes', { state: 'locked', available: false }),
    ];
    expect(resolveNextStep(steps)?.id).toBe('levels');
  });

  it('skips levels step when levels already exist', () => {
    const steps = [
      step('levels', { state: 'in_progress' }),
      step('classes', { state: 'not_started' }),
    ];
    expect(resolveNextStep(steps)?.id).toBe('classes');
  });

  it('prefers classes before teachers even if teachers is not_started', () => {
    const steps = [
      step('levels', { state: 'completed' }),
      step('classes', { state: 'in_progress', available: true }),
      step('subjects', { state: 'completed' }),
      step('teachers', { state: 'not_started', available: true }),
    ];
    expect(primaryCtaFromSteps(steps)?.id).toBe('classes');
  });

  it('skips staff in core order', () => {
    expect(NEXT_ACTION_STEP_ORDER).not.toContain('staff');
    const steps = [
      step('levels', { state: 'completed' }),
      step('classes', { state: 'completed' }),
      step('subjects', { state: 'completed' }),
      step('teachers', { state: 'completed' }),
      step('staff', { state: 'not_started' }),
      step('assignments', { state: 'needs_attention' }),
    ];
    expect(resolveNextStep(steps)?.id).toBe('assignments');
  });

  it('returns review when core journey is complete but issues remain', () => {
    const steps = [
      step('levels', { state: 'completed' }),
      step('classes', { state: 'completed' }),
      step('subjects', { state: 'completed' }),
      step('teachers', { state: 'completed' }),
      step('assignments', { state: 'completed' }),
      step('review', { state: 'needs_attention', missingCount: 2 }),
    ];
    expect(resolveNextStep(steps)?.id).toBe('review');
  });
});

describe('nextActionTitleKey', () => {
  it('maps step ids to presentation keys', () => {
    expect(nextActionTitleKey(step('classes'))).toBe(
      'admin.academicSetup.nextActionTitles.classes',
    );
  });
});
