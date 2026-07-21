import type { SetupIssueSection, SetupQuickAction, SetupReadinessIssue } from '@/types/academic-setup';

/** Map backend issue sections to Next.js routes (no sidebar entries). */
export const SETUP_SECTION_ROUTES: Record<string, string> = {
  assignments: '/admin/settings/academic-setup/assignments',
  classes: '/admin/settings/academic-setup/classes',
  levels: '/admin/settings/academic-setup/classes',
  teachers: '/admin/settings/academic-setup/teachers',
  tracks: '/admin/settings/academic-setup/subjects?tab=tracks',
  staff: '/admin/settings/academic-setup/staff',
  subjects: '/admin/settings/academic-setup/subjects',
  terms: '/admin/settings/academic-setup/terms',
};

export function setupSectionHref(
  section: SetupIssueSection | string,
  query?: Record<string, string | number | boolean | undefined | null>,
): string {
  const raw = SETUP_SECTION_ROUTES[section] ?? '/admin/settings/academic-setup';
  const qIndex = raw.indexOf('?');
  const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : '');
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue;
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function issueTargetHref(issue: Pick<SetupReadinessIssue, 'target'>): string {
  return setupSectionHref(issue.target.section, issue.target.query);
}

export function quickActionHref(action: SetupQuickAction): string {
  return setupSectionHref(action.section, { code: action.code });
}

export function filterAssignmentMissingIssues(issues: SetupReadinessIssue[]): SetupReadinessIssue[] {
  return issues.filter((i) => i.code === 'assignment_missing' || i.code === 'subject_without_teacher');
}

export function filterIssuesByQuery(
  issues: SetupReadinessIssue[],
  params: URLSearchParams,
): SetupReadinessIssue[] {
  const classId = params.get('class_id');
  const subjectId = params.get('subject_id');
  const status = params.get('status');
  if (!classId && !subjectId && !status) return issues;
  return issues.filter((issue) => {
    const q = issue.target.query ?? {};
    if (classId && String(q.class_id ?? '') !== classId) return false;
    if (subjectId && String(q.subject_id ?? '') !== subjectId) return false;
    if (status && String(q.status ?? '') !== status) return false;
    return true;
  });
}
