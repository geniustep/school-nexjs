import { describe, expect, it } from 'vitest';
import {
  CORE_JOURNEY_IDS,
  journeyDisplayState,
  limitQuickActions,
  partitionGuidedSteps,
} from './overview-present';
import type { GuidedStep } from './guided-flow';
import type { SetupQuickAction } from '@/types/academic-setup';

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

describe('limitQuickActions', () => {
  it('returns at most four actions prioritized by code', () => {
    const actions: SetupQuickAction[] = [
      { code: 'no_teachers', section: 'teachers', count: 1 },
      { code: 'level_without_classes', section: 'classes', count: 12 },
      { code: 'assignment_missing', section: 'assignments', count: 3 },
      { code: 'subject_without_teacher', section: 'subjects', count: 2 },
      { code: 'teacher_high_workload', section: 'teachers', count: 1 },
    ];
    const limited = limitQuickActions(actions, 4);
    expect(limited).toHaveLength(4);
    expect(limited[0].code).toBe('level_without_classes');
  });
});

describe('partitionGuidedSteps', () => {
  it('splits core staff and review', () => {
    const steps = CORE_JOURNEY_IDS.map((id, i) => step(id, { number: i + 1 }))
      .concat(step('staff', { number: 5 }))
      .concat(step('review', { number: 7 }));
    const { core, staff, review } = partitionGuidedSteps(steps);
    expect(core.map((s) => s.id)).toEqual(CORE_JOURNEY_IDS);
    expect(staff?.id).toBe('staff');
    expect(review?.id).toBe('review');
  });
});

describe('journeyDisplayState', () => {
  it('maps locked to unavailable', () => {
    expect(journeyDisplayState(step('assignments', { state: 'locked', available: false }))).toBe(
      'unavailable',
    );
  });

  it('maps needs_attention to needs_review', () => {
    expect(journeyDisplayState(step('subjects', { state: 'needs_attention' }))).toBe('needs_review');
  });
});
