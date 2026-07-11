import type { GradebookSummary } from '@/types/gradebook';
import {
  GRADEBOOK_ADMIN_ONLY_ACTIONS,
  TEACHER_GRADEBOOK_LIFECYCLE_ACTIONS,
  canEditGradebookEntries,
  hasGradebookAllowedAction,
  normalizeGradebookAllowedActions,
  visibleGradebookLifecycleActions,
} from '@/features/admin/gradebooks/utils/gradebook-allowed-actions';
import type { GradebookAllowedActions, GradebookDetail } from '@/types/gradebook';

export type TeacherGradebookListRow = {
  id: number;
  subject: string | null;
  className: string | null;
  term: string | null;
  state: string;
  completionPercent: number | null;
  studentsCount: number | null;
  href: string;
};

/** Present teacher list rows exactly as returned by Teacher API (no client-side filtering). */
export function adaptTeacherGradebookList(
  rows: GradebookSummary[] | null | undefined,
): TeacherGradebookListRow[] {
  if (!rows?.length) return [];
  return rows.map((row) => ({
    id: row.id,
    subject: row.subject?.name ?? null,
    className: row.class?.name ?? null,
    term: row.term?.name ?? null,
    state: row.state,
    completionPercent:
      row.completion_percent == null || Number.isNaN(row.completion_percent)
        ? null
        : row.completion_percent,
    studentsCount: row.students_count ?? null,
    href: `/teacher/assessment/gradebooks/${row.id}`,
  }));
}

export function mapTeacherGradebookDetail(detail: GradebookDetail): {
  id: number;
  mode: string;
  canEditEntries: boolean;
  canSubmit: boolean;
  visibleLifecycleActions: string[];
  forbiddenAdminActions: string[];
} {
  const allowed = normalizeGradebookAllowedActions(detail.allowed_actions);
  return {
    id: detail.id,
    mode: detail.structure.mode,
    canEditEntries: canEditGradebookEntries('teacher', allowed),
    canSubmit: hasGradebookAllowedAction(allowed, 'submit'),
    visibleLifecycleActions: visibleGradebookLifecycleActions('teacher', allowed),
    forbiddenAdminActions: GRADEBOOK_ADMIN_ONLY_ACTIONS.filter(
      (action) => !(TEACHER_GRADEBOOK_LIFECYCLE_ACTIONS as readonly string[]).includes(action),
    ),
  };
}

export function teacherCannotSeeAdminActions(
  allowed: GradebookAllowedActions | string[] | undefined | null,
): boolean {
  const visible = visibleGradebookLifecycleActions('teacher', allowed);
  return (
    visible.every((action) => action === 'submit') &&
    !GRADEBOOK_ADMIN_ONLY_ACTIONS.some((action) => visible.includes(action))
  );
}
