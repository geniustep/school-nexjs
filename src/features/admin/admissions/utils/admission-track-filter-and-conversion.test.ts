import { describe, expect, it } from 'vitest';
import type { AdmissionDetail } from '@/types/admission';
import {
  buildContinueRegistrationHref,
  buildOpenStudentHref,
  canConvertAdmissionToStudentAnyStage,
  shouldShowEarlyStudentConversionHint,
} from './admission-registration';
import {
  buildContextQuery,
  resetLevelIfIncompatibleWithCycle,
  parseWorkspaceListStateFromSearchParams,
  workspaceListStateToSearchParams,
  hasManualContextOrAdvancedFilters,
  type AdmissionWorkspaceListState,
} from './admission-workspace';

function detail(patch: Partial<AdmissionDetail> = {}): AdmissionDetail {
  return {
    id: 42,
    student_name: 'Child',
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    processing_stage: 'new',
    student_id: false,
    allowed_actions: {},
    ...patch,
  } as AdmissionDetail;
}

describe('track/level filter workspace helpers', () => {
  it('sends requested_cycle_code and resets incompatible level', () => {
    const levels = [
      { id: 10, cycle: 'primary' },
      { id: 20, cycle: 'middle_school' },
    ];
    expect(resetLevelIfIncompatibleWithCycle('10', 'primary', levels)).toBe('10');
    expect(resetLevelIfIncompatibleWithCycle('10', 'middle_school', levels)).toBeUndefined();

    const query = buildContextQuery({
      workspace: 'follow_up',
      followStage: '',
      awaitingSub: '',
      postSub: 'awaiting',
      closedSub: 'rejected',
      cycleCode: 'primary',
      levelId: '10',
      page: 1,
      view: 'kanban',
    });
    expect(query.requested_cycle_code).toBe('primary');
    expect(query.requested_level_id).toBe(10);
  });

  it('round-trips cycle in URL and counts it as a manual filter', () => {
    const state: AdmissionWorkspaceListState = {
      workspace: 'follow_up',
      followStage: '',
      awaitingSub: '',
      postSub: 'awaiting',
      closedSub: 'rejected',
      cycleCode: 'primary',
      page: 1,
      view: 'kanban',
    };
    const params = workspaceListStateToSearchParams(state);
    expect(params.get('cycle')).toBe('primary');
    const parsed = parseWorkspaceListStateFromSearchParams(params);
    expect(parsed.cycleCode).toBe('primary');
    expect(hasManualContextOrAdvancedFilters(parsed)).toBe(true);
  });
});

describe('any-stage student conversion', () => {
  it('shows convert for every processing stage when not linked', () => {
    for (const stage of [
      'new',
      'initial_follow_up',
      'assessment_ready',
      'assessment_in_progress',
      'decision_ready',
    ] as const) {
      expect(
        canConvertAdmissionToStudentAnyStage(detail({ processing_stage: stage })),
      ).toBe(true);
    }
  });

  it('hides convert and uses open-student when linked', () => {
    const linked = detail({ student_id: 99, registration_flow_state: 'linked' });
    expect(canConvertAdmissionToStudentAnyStage(linked)).toBe(false);
    expect(buildOpenStudentHref(99)).toBe('/admin/students/99');
  });

  it('builds prefill route without mutating stage on click', () => {
    expect(buildContinueRegistrationHref(42)).toBe('/admin/students/new?admission_id=42');
  });

  it('shows non-blocking incomplete hint before registration readiness', () => {
    expect(
      shouldShowEarlyStudentConversionHint(
        detail({ processing_stage: 'new', registration_readiness: 'not_applicable' }),
      ),
    ).toBe(true);
    expect(
      shouldShowEarlyStudentConversionHint(
        detail({ processing_stage: 'decision_ready', registration_readiness: 'ready' }),
      ),
    ).toBe(false);
  });
});
