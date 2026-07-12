import { describe, expect, it, vi } from 'vitest';
import {
  admissionDecisionLabelKey,
  decisionRequiresConditions,
  decisionRequiresRejectionReason,
  getAdmissionDecisionOptions,
  isAdmissionDecisionOption,
} from './admission-decision-options';
import {
  admissionManualStageLabelKey,
  evaluateManualStageChange,
  getAdmissionManualStageOptions,
  isAdmissionManualStage,
  isDerivedOrTerminalAdmissionState,
} from './admission-stage-options';
import { runBulkStageChange } from './admission-bulk-stage-change';
import { resolveAdmissionPrimaryDisplay } from './admission-status-display';

describe('getAdmissionDecisionOptions', () => {
  it('returns the five school decisions in fixed order', () => {
    expect([...getAdmissionDecisionOptions()]).toEqual([
      'accepted',
      'accepted_with_condition',
      'waitlisted',
      'needs_reassessment',
      'rejected',
    ]);
  });

  it('marks conditions and rejection requirements correctly', () => {
    expect(decisionRequiresConditions('accepted_with_condition')).toBe(true);
    expect(decisionRequiresConditions('accepted')).toBe(false);
    expect(decisionRequiresRejectionReason('rejected')).toBe(true);
    expect(decisionRequiresRejectionReason('waitlisted')).toBe(false);
  });

  it('maps rejected label to schoolDecision.rejected', () => {
    expect(admissionDecisionLabelKey('rejected')).toBe(
      'admin.admissions.schoolDecision.rejected',
    );
    expect(admissionDecisionLabelKey('accepted')).toBe('admin.admissions.decisions.accepted');
  });

  it('validates decision option membership', () => {
    expect(isAdmissionDecisionOption('needs_reassessment')).toBe(true);
    expect(isAdmissionDecisionOption('confirmed')).toBe(false);
  });
});

describe('getAdmissionManualStageOptions', () => {
  it('returns only the three follow-up processing stages', () => {
    expect([...getAdmissionManualStageOptions()]).toEqual([
      'new',
      'initial_follow_up',
      'assessment_ready',
    ]);
  });

  it('excludes decision/derived/terminal states from manual options', () => {
    const options = getAdmissionManualStageOptions();
    for (const forbidden of [
      'accepted',
      'waitlisted',
      'offer_sent',
      'confirmed',
      'lost',
      'cancelled',
      'duplicate',
      'registered',
      'awaiting_registration',
      'assessment_in_progress',
      'decision_ready',
      'qualified',
      'visit_pending',
    ]) {
      expect(options).not.toContain(forbidden as never);
      expect(isAdmissionManualStage(forbidden)).toBe(false);
    }
  });

  it('uses processing-stage label keys', () => {
    expect(admissionManualStageLabelKey('initial_follow_up')).toBe(
      'admin.admissions.processingStages.initial_follow_up',
    );
  });
});

describe('evaluateManualStageChange', () => {
  it('allows transition between processing stages', () => {
    expect(
      evaluateManualStageChange({ processing_stage: 'new' }, 'initial_follow_up'),
    ).toEqual({
      apply: true,
      targetState: 'initial_follow_up',
    });
  });

  it('blocks transitions from accepted/confirmed/lost', () => {
    expect(evaluateManualStageChange({ state: 'accepted' }, 'new').apply).toBe(false);
    expect(
      evaluateManualStageChange({ state: 'confirmed' }, 'assessment_ready').apply,
    ).toBe(false);
    expect(
      evaluateManualStageChange({ state: 'lost' }, 'initial_follow_up').apply,
    ).toBe(false);
  });

  it('blocks registered and derived targets', () => {
    expect(
      evaluateManualStageChange(
        { processing_stage: 'new', student_id: 9 },
        'initial_follow_up',
      ).reason,
    ).toBe('registered');
    expect(evaluateManualStageChange({ processing_stage: 'new' }, 'confirmed').reason).toBe(
      'invalid_target',
    );
  });

  it('marks derived/terminal states', () => {
    expect(isDerivedOrTerminalAdmissionState('confirmed')).toBe(true);
    expect(isDerivedOrTerminalAdmissionState('under_review')).toBe(false);
  });
});

describe('current stage display vs manual options', () => {
  it('shows ready_for_registration for confirmed without making it a manual option', () => {
    const primary = resolveAdmissionPrimaryDisplay({
      state: 'confirmed',
      registration_status: 'awaiting_registration',
      decision: 'accepted',
    });
    expect(primary.kind).toBe('ready_for_registration');
    expect(getAdmissionManualStageOptions()).not.toContain('confirmed' as never);
  });

  it('keeps accepted as current display outside manual options', () => {
    expect(isAdmissionManualStage('accepted')).toBe(false);
    expect(isDerivedOrTerminalAdmissionState('accepted')).toBe(true);
  });
});

describe('bulk manual stage change', () => {
  it('only patches eligible manual-stage rows and reports ineligible', async () => {
    const changeState = vi.fn(async () => true);
    const result = await runBulkStageChange(
      [
        { id: 1, record: { processing_stage: 'new', state: 'new' } },
        { id: 2, record: { state: 'confirmed' } },
        { id: 3, record: { state: 'lost' } },
      ],
      'initial_follow_up',
      changeState,
    );
    expect(changeState).toHaveBeenCalledTimes(1);
    expect(changeState).toHaveBeenCalledWith(1, 'initial_follow_up');
    expect(result.succeeded).toEqual([1]);
    expect(result.ineligible).toEqual([2, 3]);
  });
});

describe('decision payload contracts', () => {
  it('documents decision endpoint values without state PATCH', () => {
    for (const decision of getAdmissionDecisionOptions()) {
      expect(decision).not.toBe('lost');
      expect(decision).not.toBe('confirmed');
      expect(decision).not.toBe('registered');
    }
  });
});
