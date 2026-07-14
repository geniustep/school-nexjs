export const APPLICATION_STATUS_VALUES = [
  'new',
  'follow_up',
  'in_assessment',
  'decision_pending',
  'accepted',
  'ready_for_registration',
  'registered',
  'waitlisted',
  'rejected',
  'closed',
] as const;

export function applicationStatusLabelKey(status: string) {
  return `admin.admissions.applicationStatus.${status}`;
}

export function applicationStatusTone(status: string): 'green' | 'red' | 'amber' | 'blue' | 'slate' {
  if (status === 'accepted') return 'green';
  if (status === 'ready_for_registration') return 'blue';
  if (status === 'registered') return 'slate';
  if (status === 'rejected' || status === 'closed') return 'red';
  if (status === 'waitlisted' || status === 'decision_pending') return 'amber';
  if (status === 'in_assessment' || status === 'follow_up') return 'blue';
  return 'slate';
}

export function resolveApplicationStatus(
  record: { application_status?: unknown } | null | undefined,
): string | null {
  if (!record) return null;
  return typeof record.application_status === 'string' && record.application_status.trim()
    ? record.application_status
    : null;
}

export function isRegisteredApplicationStatus(status: string | null | undefined) {
  return status === 'registered';
}

export function statusesForWorkspace(workspace: string | null | undefined): string[] {
  switch (workspace) {
    case 'follow_up':
    case 'work':
      return ['new', 'follow_up', 'in_assessment'];
    case 'awaiting_decision':
      return ['decision_pending', 'waitlisted'];
    case 'post_acceptance':
      return ['accepted', 'ready_for_registration'];
    case 'closed':
      return ['rejected', 'closed', 'registered'];
    default:
      return [];
  }
}

/** Server param for one or more official statuses (comma-separated, no legacy fields). */
export function formatApplicationStatusParam(
  statuses: readonly string[] | null | undefined,
): string | undefined {
  const unique = [...new Set((statuses ?? []).map((s) => s.trim()).filter(Boolean))];
  if (unique.length === 0) return undefined;
  return unique.join(',');
}

/** Operational shortcut: drop `registered` only — never `ready_for_registration`. */
export function applyHideConvertedStatuses(
  statuses: readonly string[],
  hideConverted: boolean,
): string[] {
  if (!hideConverted) return [...statuses];
  return statuses.filter((status) => status !== 'registered');
}

export function isFollowUpApplicationStatus(
  value: string | null | undefined,
): value is 'new' | 'follow_up' | 'in_assessment' {
  return value === 'new' || value === 'follow_up' || value === 'in_assessment';
}

export function isAwaitingApplicationStatus(
  value: string | null | undefined,
): value is 'decision_pending' | 'waitlisted' {
  return value === 'decision_pending' || value === 'waitlisted';
}

/**
 * Map legacy processing_stage / followStage URL values → official application_status.
 */
export function mapLegacyFollowStageToApplicationStatus(
  value: string | null | undefined,
): 'new' | 'follow_up' | 'in_assessment' | '' {
  if (!value) return '';
  if (isFollowUpApplicationStatus(value)) return value;
  if (value === 'initial_follow_up' || value === 'contacted' || value === 'visit_pending') {
    return 'follow_up';
  }
  if (
    value === 'assessment_ready' ||
    value === 'assessment_in_progress' ||
    value === 'qualified'
  ) {
    return 'in_assessment';
  }
  return '';
}

/**
 * Map legacy awaiting subfilters → official application_status.
 */
export function mapLegacyAwaitingSubToApplicationStatus(
  value: string | null | undefined,
): 'decision_pending' | 'waitlisted' | '' {
  if (!value) return '';
  if (isAwaitingApplicationStatus(value)) return value;
  if (
    value === 'decision_ready' ||
    value === 'under_review' ||
    value === 'needs_reassessment'
  ) {
    return 'decision_pending';
  }
  // assessment_in_progress belongs in follow_up workspace — drop as awaiting sub.
  return '';
}
