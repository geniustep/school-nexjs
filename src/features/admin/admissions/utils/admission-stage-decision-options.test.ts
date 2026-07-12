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
  it('returns only the five manual follow-up stages', () => {
    expect([...getAdmissionManualStageOptions()]).toEqual([
      'new',
      'contacted',
      'qualified',
      'visit_pending',
      'under_review',
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
    ]) {
      expect(options).not.toContain(forbidden as never);
      expect(isAdmissionManualStage(forbidden)).toBe(false);
    }
  });

  it('uses unified under_review label key', () => {
    expect(admissionManualStageLabelKey('under_review')).toBe(
      'admin.admissions.states.under_review',
    );
  });
});

describe('evaluateManualStageChange', () => {
  it('allows transition between manual stages', () => {
    expect(evaluateManualStageChange({ state: 'new' }, 'contacted')).toEqual({
      apply: true,
      targetState: 'contacted',
    });
  });

  it('blocks transitions from accepted/confirmed/lost', () => {
    expect(evaluateManualStageChange({ state: 'accepted' }, 'new').apply).toBe(false);
    expect(evaluateManualStageChange({ state: 'confirmed' }, 'under_review').apply).toBe(false);
    expect(evaluateManualStageChange({ state: 'lost' }, 'contacted').apply).toBe(false);
  });

  it('blocks registered and derived targets', () => {
    expect(
      evaluateManualStageChange({ state: 'new', student_id: 9 }, 'contacted').reason,
    ).toBe('registered');
    expect(evaluateManualStageChange({ state: 'new' }, 'confirmed').reason).toBe('invalid_target');
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
        { id: 1, record: { state: 'new' } },
        { id: 2, record: { state: 'confirmed' } },
        { id: 3, record: { state: 'lost' } },
      ],
      'contacted',
      changeState,
    );
    expect(changeState).toHaveBeenCalledTimes(1);
    expect(changeState).toHaveBeenCalledWith(1, 'contacted');
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
