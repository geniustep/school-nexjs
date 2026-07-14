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
