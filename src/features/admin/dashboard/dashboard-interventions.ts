import type { AdminDashboard } from '@/types/dashboard';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type { Locale } from '@/lib/i18n/config';
import { parseDashboardAlertItem } from '@/features/admin/dashboard/dashboard-alert-text';

const ATT_KEYS = ['present', 'absent', 'late', 'left_early'] as const;

export function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function attendancePercent(att: AdminDashboard['attendance_today']): number | null {
  if (!att) return null;
  const total = att.total_recorded ?? att.total ?? 0;
  if (total <= 0) return null;
  return Math.round((att.present / total) * 100);
}

export function buildImportantAlertItems(
  d: AdminDashboard,
  locale: Locale | string = 'ar',
): AdminActionItem[] {
  const items: AdminActionItem[] = [];

  if (Array.isArray(d.important_alerts)) {
    d.important_alerts.forEach((a, i) => {
      const parsed = parseDashboardAlertItem(a, locale, i);
      if (parsed) {
        items.push(parsed);
      }
    });
  }

  return items;
}

export function buildDashboardActionItems(
  d: AdminDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
  locale: Locale | string = 'ar',
  options?: { includeImportantAlerts?: boolean },
): AdminActionItem[] {
  const items: AdminActionItem[] = [];

  if (options?.includeImportantAlerts !== false) {
    items.push(...buildImportantAlertItems(d, locale));
  }

  const missing = d.exams_missing_results ?? 0;
  if (missing > 0) {
    items.push({
      id: 'exams-missing-results',
      label: t('admin.cmd.examsMissingResults', { count: missing }),
      href: '/admin/exams',
      icon: '📋',
      tone: 'amber',
    });
  }

  const drafts = d.draft_exam_results_count ?? 0;
  if (drafts > 0) {
    items.push({
      id: 'draft-results',
      label: t('admin.cmd.draftResultsPending', { count: drafts }),
      href: '/admin/exam-results',
      icon: '✏️',
      tone: 'amber',
    });
  }

  if (d.next_exam && missing > 0) {
    items.push({
      id: 'next-exam',
      label: t('admin.cmd.reviewNextExam', { name: d.next_exam.name }),
      hint: d.next_exam.class?.name,
      href: `/admin/exams/${d.next_exam.id}`,
      icon: '📅',
    });
  }

  return items;
}

function readStudentDataQualityCounts(d: AdminDashboard): {
  withoutClass: number;
  withoutParent: number;
  withoutAcademicYear: number;
  incompleteProfile: number;
} {
  const raw = d as AdminDashboard & {
    data_quality?: {
      students_without_class?: number;
      students_without_parent?: number;
      students_without_academic_year?: number;
      students_incomplete_profile?: number;
    };
    students_without_class?: number;
    students_without_parent?: number;
    students_without_academic_year?: number;
    students_incomplete_profile?: number;
  };
  const bucket = raw.data_quality ?? raw;
  return {
    withoutClass: bucket.students_without_class ?? 0,
    withoutParent: bucket.students_without_parent ?? 0,
    withoutAcademicYear: bucket.students_without_academic_year ?? 0,
    incompleteProfile: bucket.students_incomplete_profile ?? 0,
  };
}

export function buildDataQualityItems(
  d: AdminDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const counts = readStudentDataQualityCounts(d);
  const items: AdminActionItem[] = [];
  const studentsHref = '/admin/students';

  if (counts.withoutClass > 0) {
    items.push({
      id: 'dq-without-class',
      label: t('admin.cmd.studentsWithoutClassCount', { count: counts.withoutClass }),
      href: studentsHref,
      icon: '🏫',
      tone: 'amber',
    });
  }
  if (counts.withoutParent > 0) {
    items.push({
      id: 'dq-without-parent',
      label: t('admin.cmd.studentsWithoutParentCount', { count: counts.withoutParent }),
      href: studentsHref,
      icon: '👪',
      tone: 'amber',
    });
  }
  if (counts.withoutAcademicYear > 0) {
    items.push({
      id: 'dq-without-year',
      label: t('admin.cmd.studentsWithoutAcademicYearCount', { count: counts.withoutAcademicYear }),
      href: studentsHref,
      icon: '📅',
      tone: 'amber',
    });
  }
  if (counts.incompleteProfile > 0) {
    items.push({
      id: 'dq-incomplete-profile',
      label: t('admin.cmd.studentsIncompleteProfileCount', { count: counts.incompleteProfile }),
      href: studentsHref,
      icon: '📝',
      tone: 'amber',
    });
  }

  return items;
}

export { ATT_KEYS };
