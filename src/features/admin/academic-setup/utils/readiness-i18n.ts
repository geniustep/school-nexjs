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

function codeVariants(code: string): string[] {
  const raw = String(code ?? '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  return [...new Set([raw, lower, upper])];
}

function humanizeIssueCode(code: string): string {
  return String(code ?? '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Shared label for issue/quick-action codes — never leave raw snake_case when a translation exists. */
export function setupIssueCodeLabel(code: string, t: TranslateFn): string {
  for (const variant of codeVariants(code)) {
    const quickKey = `admin.academicSetup.quickActionCodes.${variant}`;
    const quick = t(quickKey);
    if (quick !== quickKey) return quick;
  }

  for (const variant of codeVariants(code)) {
    const titleKey = `admin.academicSetup.readinessIssues.${variant}.title`;
    const title = t(titleKey);
    if (title !== titleKey && !title.includes('{')) return title;
  }

  const fallback = humanizeIssueCode(code);
  return fallback || code;
}

export function readinessIssueTitle(issue: SetupReadinessIssue, t: TranslateFn): string {
  const params = readinessIssueParams(issue);
  for (const variant of codeVariants(issue.code)) {
    const key = `admin.academicSetup.readinessIssues.${variant}.title`;
    const bare = t(key);
    if (bare !== key) return t(key, params);
  }
  return issue.title || setupIssueCodeLabel(issue.code, t);
}

export function readinessIssueDescription(issue: SetupReadinessIssue, t: TranslateFn): string | undefined {
  if (!issue.description) return undefined;
  const params = readinessIssueParams(issue);
  for (const variant of codeVariants(issue.code)) {
    const key = `admin.academicSetup.readinessIssues.${variant}.description`;
    const bare = t(key);
    if (bare !== key) return t(key, params);
  }
  return issue.description;
}

export function quickActionLabel(action: SetupQuickAction, t: TranslateFn): string {
  const text = setupIssueCodeLabel(action.code, t);
  return `${text} (${action.count})`;
}
