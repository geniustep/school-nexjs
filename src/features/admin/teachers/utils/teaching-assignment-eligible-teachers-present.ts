import type {
  TeachingAssignmentCandidate,
  TeachingAssignmentCandidateReason,
  TeachingAssignmentCandidateState,
  TeachingAssignmentCandidatesAllowedActions,
} from '@/types/teacher-domain';

const STATE_LABEL_KEYS: Record<TeachingAssignmentCandidateState, string> = {
  eligible: 'admin.teacherDomain.eligibleTeachers.states.eligible',
  eligible_with_warning: 'admin.teacherDomain.eligibleTeachers.states.eligibleWithWarning',
  override_required: 'admin.teacherDomain.eligibleTeachers.states.overrideRequired',
  not_eligible: 'admin.teacherDomain.eligibleTeachers.states.notEligible',
};

const REASON_LABEL_KEYS: Record<string, string> = {
  teacher_subject_eligibility_unspecified:
    'admin.teacherDomain.eligibleTeachers.reasons.subjectUnspecified',
  teacher_subject_outside_declared_eligibility:
    'admin.teacherDomain.eligibleTeachers.reasons.subjectOutside',
  teacher_cycle_eligibility_unspecified:
    'admin.teacherDomain.eligibleTeachers.reasons.cycleUnspecified',
  teacher_cycle_outside_declared_eligibility:
    'admin.teacherDomain.eligibleTeachers.reasons.cycleOutside',
  teacher_level_eligibility_unspecified:
    'admin.teacherDomain.eligibleTeachers.reasons.levelUnspecified',
  teacher_level_outside_declared_eligibility:
    'admin.teacherDomain.eligibleTeachers.reasons.levelOutside',
  teacher_language_eligibility_unspecified:
    'admin.teacherDomain.eligibleTeachers.reasons.languageUnspecified',
  teacher_language_outside_declared_eligibility:
    'admin.teacherDomain.eligibleTeachers.reasons.languageOutside',
  weekly_load_limit_unspecified:
    'admin.teacherDomain.eligibleTeachers.reasons.weeklyLimitUnspecified',
  weekly_load_limit_exceeded:
    'admin.teacherDomain.eligibleTeachers.reasons.weeklyLimitExceeded',
  weekly_load_target_exceeded:
    'admin.teacherDomain.eligibleTeachers.reasons.weeklyTargetExceeded',
  daily_load_check_not_available:
    'admin.teacherDomain.eligibleTeachers.reasons.dailyLoadNotAvailable',
  mandatory_unavailable: 'admin.teacherDomain.eligibleTeachers.reasons.mandatoryUnavailable',
  teacher_unavailable: 'admin.teacherDomain.eligibleTeachers.reasons.teacherUnavailable',
  duplicate_assignment: 'admin.teacherDomain.eligibleTeachers.reasons.duplicateAssignment',
  overlapping_main_assignment:
    'admin.teacherDomain.eligibleTeachers.reasons.overlappingMain',
  teacher_timetable_conflict:
    'admin.teacherDomain.eligibleTeachers.reasons.timetableConflict',
  inactive_teacher: 'admin.teacherDomain.eligibleTeachers.reasons.inactiveTeacher',
  archived_teacher: 'admin.teacherDomain.eligibleTeachers.reasons.archivedTeacher',
  cross_school: 'admin.teacherDomain.eligibleTeachers.reasons.crossSchool',
  availability_not_evaluated:
    'admin.teacherDomain.eligibleTeachers.reasons.availabilityNotEvaluated',
};

export function candidateStateLabelKey(state: TeachingAssignmentCandidateState): string {
  return STATE_LABEL_KEYS[state];
}

export function candidateReasonLabelKey(code: string | null | undefined): string | null {
  if (!code) return null;
  return REASON_LABEL_KEYS[code] ?? null;
}

export function translateCandidateReason(
  reason: TeachingAssignmentCandidateReason,
  t: (key: string) => string,
): string {
  const key = candidateReasonLabelKey(reason.code);
  if (key) return t(key);
  return reason.message?.trim() || reason.code;
}

export function canSelectCandidate(
  candidate: TeachingAssignmentCandidate,
  allowed: TeachingAssignmentCandidatesAllowedActions | undefined,
  opts?: { currentTeacherId?: number | null },
): boolean {
  if (opts?.currentTeacherId != null && candidate.teacher_id === opts.currentTeacherId) {
    return true;
  }
  if (candidate.eligibility_state === 'not_eligible') return false;
  if (candidate.eligibility_state === 'override_required') {
    return (
      allowed?.can_override_assignment_eligibility === true &&
      candidate.allowed_actions?.can_override === true
    );
  }
  return candidate.can_assign === true || candidate.eligible === true;
}

export function candidateNeedsOverride(
  candidate: TeachingAssignmentCandidate | null | undefined,
  opts?: { currentTeacherId?: number | null },
): boolean {
  if (!candidate) return false;
  if (opts?.currentTeacherId != null && candidate.teacher_id === opts.currentTeacherId) {
    return false;
  }
  return candidate.eligibility_state === 'override_required';
}

export function formatWeeklyLoadValue(
  value: number | null | undefined,
  t: (key: string) => string,
): string {
  if (value == null) return t('admin.teacherDomain.eligibleTeachers.limitUnspecified');
  return String(value);
}

export function formatAvailabilityState(
  state: string | null | undefined,
  t: (key: string) => string,
): string {
  if (!state || state === 'not_evaluated') {
    return t('admin.teacherDomain.eligibleTeachers.availabilityNotChecked');
  }
  const key = `admin.teacherDomain.eligibleTeachers.availability.${state}`;
  const translated = t(key);
  return translated !== key ? translated : state;
}

export function formatTimetableConflict(
  value: boolean | null | undefined,
  t: (key: string) => string,
): string | null {
  if (value === null || value === undefined) {
    return t('admin.teacherDomain.eligibleTeachers.timetableNotChecked');
  }
  if (value === true) return t('admin.teacherDomain.eligibleTeachers.timetableConflict');
  return null;
}

export function isValidOverrideReason(reason: string): boolean {
  return reason.trim().length > 0;
}

export function partitionCandidates(candidates: TeachingAssignmentCandidate[]): {
  selectable: TeachingAssignmentCandidate[];
  ineligible: TeachingAssignmentCandidate[];
} {
  const selectable: TeachingAssignmentCandidate[] = [];
  const ineligible: TeachingAssignmentCandidate[] = [];
  for (const candidate of candidates) {
    if (candidate.eligibility_state === 'not_eligible') ineligible.push(candidate);
    else selectable.push(candidate);
  }
  return { selectable, ineligible };
}
