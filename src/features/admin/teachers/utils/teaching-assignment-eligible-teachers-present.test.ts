import { describe, expect, it } from 'vitest';
import type { TeachingAssignmentCandidate } from '@/types/teacher-domain';
import {
  canSelectCandidate,
  candidateNeedsOverride,
  formatTimetableConflict,
  formatWeeklyLoadValue,
  isValidOverrideReason,
  partitionCandidates,
  translateCandidateReason,
} from './teaching-assignment-eligible-teachers-present';

const t = (key: string) => key;

function candidate(
  partial: Partial<TeachingAssignmentCandidate> &
    Pick<TeachingAssignmentCandidate, 'teacher_id' | 'eligibility_state'>,
): TeachingAssignmentCandidate {
  return {
    eligible: partial.eligibility_state === 'eligible' || partial.eligibility_state === 'eligible_with_warning',
    can_assign: partial.eligibility_state !== 'not_eligible',
    requires_override: partial.eligibility_state === 'override_required',
    blocking_reasons: [],
    warning_reasons: [],
    informational_reasons: [],
    ...partial,
  };
}

describe('teaching-assignment-eligible-teachers-present', () => {
  it('allows eligible and warning candidates, blocks not_eligible', () => {
    const allowed = {
      can_override_assignment_eligibility: true,
    };
    expect(
      canSelectCandidate(candidate({ teacher_id: 1, eligibility_state: 'eligible' }), allowed),
    ).toBe(true);
    expect(
      canSelectCandidate(
        candidate({ teacher_id: 2, eligibility_state: 'eligible_with_warning' }),
        allowed,
      ),
    ).toBe(true);
    expect(
      canSelectCandidate(candidate({ teacher_id: 3, eligibility_state: 'not_eligible' }), allowed),
    ).toBe(false);
  });

  it('requires override capability and can_override for override_required', () => {
    const c = candidate({
      teacher_id: 4,
      eligibility_state: 'override_required',
      can_assign: false,
      requires_override: true,
      allowed_actions: { can_override: true },
    });
    expect(canSelectCandidate(c, { can_override_assignment_eligibility: false })).toBe(false);
    expect(canSelectCandidate(c, { can_override_assignment_eligibility: true })).toBe(true);
    expect(candidateNeedsOverride(c)).toBe(true);
  });

  it('keeps current assignment teacher selectable even if listed as duplicate', () => {
    const c = candidate({
      teacher_id: 9,
      eligibility_state: 'not_eligible',
      can_assign: false,
    });
    expect(canSelectCandidate(c, {}, { currentTeacherId: 9 })).toBe(true);
    expect(candidateNeedsOverride(c, { currentTeacherId: 9 })).toBe(false);
  });

  it('does not present null timetable conflict as no conflict', () => {
    expect(formatTimetableConflict(null, t)).toBe(
      'admin.teacherDomain.eligibleTeachers.timetableNotChecked',
    );
    expect(formatTimetableConflict(false, t)).toBeNull();
    expect(formatTimetableConflict(true, t)).toBe(
      'admin.teacherDomain.eligibleTeachers.timetableConflict',
    );
  });

  it('does not render unspecified weekly limits as zero', () => {
    expect(formatWeeklyLoadValue(null, t)).toBe(
      'admin.teacherDomain.eligibleTeachers.limitUnspecified',
    );
    expect(formatWeeklyLoadValue(0, t)).toBe('0');
  });

  it('rejects blank override reasons and partitions ineligible separately', () => {
    expect(isValidOverrideReason('   ')).toBe(false);
    expect(isValidOverrideReason('مبرر إداري')).toBe(true);
    const { selectable, ineligible } = partitionCandidates([
      candidate({ teacher_id: 1, eligibility_state: 'eligible' }),
      candidate({ teacher_id: 2, eligibility_state: 'not_eligible' }),
      candidate({ teacher_id: 3, eligibility_state: 'override_required' }),
    ]);
    expect(selectable.map((c) => c.teacher_id)).toEqual([1, 3]);
    expect(ineligible.map((c) => c.teacher_id)).toEqual([2]);
  });

  it('translates known reason codes without exposing raw codes when mapped', () => {
    expect(
      translateCandidateReason(
        { code: 'teacher_subject_outside_declared_eligibility', message: 'raw' },
        t,
      ),
    ).toBe('admin.teacherDomain.eligibleTeachers.reasons.subjectOutside');
  });
});
