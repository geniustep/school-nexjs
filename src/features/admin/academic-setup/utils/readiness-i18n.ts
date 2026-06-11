import type { SetupQuickAction, SetupReadinessIssue } from '@/types/academic-setup';

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

function readinessIssueParams(issue: SetupReadinessIssue): Record<string, string | number> {
  const ctx = issue.context ?? {};
  const pick = (...keys: string[]): string => {
    for (const key of keys) {
      const value = ctx[key];
      if (value != null && value !== '') return String(value);
    }
    return '';
  };

  return {
    name: pick('name', 'level_name', 'class_name', 'teacher_name', 'subject_name', 'staff_name'),
    level: pick('level_name', 'level'),
    class: pick('class_name', 'class'),
    subject: pick('subject_name', 'subject'),
    teacher: pick('teacher_name', 'teacher'),
    count: Number(ctx.count ?? ctx.classes_count ?? ctx.hours ?? 0),
  };
}

function translateOrFallback(
  t: TranslateFn,
  key: string,
  params: Record<string, string | number> | undefined,
  fallback: string | undefined,
): string {
  const bare = t(key);
  if (bare === key) return fallback ?? key;
  return params ? t(key, params) : bare;
}

export function readinessIssueTitle(issue: SetupReadinessIssue, t: TranslateFn): string {
  const params = readinessIssueParams(issue);
  return translateOrFallback(
    t,
    `admin.academicSetup.readinessIssues.${issue.code}.title`,
    params,
    issue.title,
  );
}

export function readinessIssueDescription(issue: SetupReadinessIssue, t: TranslateFn): string | undefined {
  if (!issue.description) return undefined;
  const params = readinessIssueParams(issue);
  return translateOrFallback(
    t,
    `admin.academicSetup.readinessIssues.${issue.code}.description`,
    params,
    issue.description,
  );
}

export function quickActionLabel(action: SetupQuickAction, t: TranslateFn): string {
  const key = `admin.academicSetup.quickActionCodes.${action.code}`;
  const label = t(key);
  const text = label !== key ? label : action.code;
  return `${text} (${action.count})`;
}
