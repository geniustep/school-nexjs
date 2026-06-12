import type { SetupReadinessIssue } from '@/types/academic-setup';
import { issueTargetHref } from './section-routes';

export interface SetupIssueGroup {
  code: string;
  count: number;
  sampleNames: string[];
  severity: SetupReadinessIssue['severity'];
  blocking: boolean;
  href: string;
}

function issueEntityName(issue: SetupReadinessIssue): string {
  const ctx = issue.context ?? {};
  const keys = ['name', 'level_name', 'class_name', 'teacher_name', 'subject_name', 'staff_name', 'level', 'class'];
  for (const key of keys) {
    const value = ctx[key];
    if (value != null && String(value).trim()) return String(value);
  }
  return '';
}

const SEVERITY_RANK: Record<SetupReadinessIssue['severity'], number> = {
  error: 0,
  warning: 1,
  info: 2,
};

export function groupSetupIssues(
  issues: SetupReadinessIssue[],
  maxGroups = 3,
): SetupIssueGroup[] {
  const map = new Map<string, SetupIssueGroup & { issues: SetupReadinessIssue[] }>();

  for (const issue of issues) {
    const existing = map.get(issue.code);
    const name = issueEntityName(issue);
    if (existing) {
      existing.count += 1;
      if (name && existing.sampleNames.length < 4 && !existing.sampleNames.includes(name)) {
        existing.sampleNames.push(name);
      }
      if (issue.blocking) existing.blocking = true;
      if (SEVERITY_RANK[issue.severity] < SEVERITY_RANK[existing.severity]) {
        existing.severity = issue.severity;
      }
      existing.issues.push(issue);
    } else {
      map.set(issue.code, {
        code: issue.code,
        count: 1,
        sampleNames: name ? [name] : [],
        severity: issue.severity,
        blocking: issue.blocking,
        href: issueTargetHref(issue),
        issues: [issue],
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => {
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
      const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
      if (sev !== 0) return sev;
      return b.count - a.count;
    })
    .slice(0, maxGroups)
    .map(({ issues: _issues, ...group }) => group);
}
