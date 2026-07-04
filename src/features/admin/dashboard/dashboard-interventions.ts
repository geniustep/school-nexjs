import type { AdminDashboard } from '@/types/dashboard';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type { Locale } from '@/lib/i18n/config';
import type { TranslateFn } from '@/features/i18n/locale-context';
import {
  buildRegistryDashboardAlert,
  dedupeDashboardAlertItems,
  enrichDashboardAlertItem,
  type DashboardAlertCandidate,
} from '@/lib/admin/dashboard-alert-registry';
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
  t: TranslateFn,
  locale: Locale | string = 'ar',
): AdminActionItem[] {
  const candidates: DashboardAlertCandidate[] = [];

  if (Array.isArray(d.important_alerts)) {
    d.important_alerts.forEach((a, i) => {
      const parsed = parseDashboardAlertItem(a, locale, i);
      if (parsed) {
        candidates.push(enrichDashboardAlertItem(parsed, t, locale));
      }
    });
  }

  return dedupeDashboardAlertItems(candidates);
}

export function buildDashboardActionItems(
  d: AdminDashboard,
  t: TranslateFn,
  locale: Locale | string = 'ar',
  options?: { includeImportantAlerts?: boolean },
): AdminActionItem[] {
  const items: AdminActionItem[] = [];

  if (options?.includeImportantAlerts !== false) {
    items.push(...buildImportantAlertItems(d, t, locale));
  }

  const missing = d.exams_missing_results ?? 0;
  if (missing > 0) {
    const item = buildRegistryDashboardAlert('exams-missing-results', t, locale, {
      count: missing,
      icon: '📋',
      tone: 'amber',
    });
    if (item) items.push(item);
  }

  const drafts = d.draft_exam_results_count ?? 0;
  if (drafts > 0) {
    const item = buildRegistryDashboardAlert('draft-results', t, locale, {
      count: drafts,
      icon: '✏️',
      tone: 'amber',
    });
    if (item) items.push(item);
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
  t: TranslateFn,
  locale: Locale | string = 'ar',
): AdminActionItem[] {
  const counts = readStudentDataQualityCounts(d);
  const candidates: DashboardAlertCandidate[] = [];

  if (counts.withoutClass > 0) {
    const item = buildRegistryDashboardAlert('dq-without-class', t, locale, {
      count: counts.withoutClass,
      icon: '🏫',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if (counts.withoutParent > 0) {
    const item = buildRegistryDashboardAlert('dq-without-parent', t, locale, {
      count: counts.withoutParent,
      icon: '👪',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if (counts.withoutAcademicYear > 0) {
    const item = buildRegistryDashboardAlert('dq-without-year', t, locale, {
      count: counts.withoutAcademicYear,
      icon: '📅',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if (counts.incompleteProfile > 0) {
    const item = buildRegistryDashboardAlert('dq-incomplete-profile', t, locale, {
      count: counts.incompleteProfile,
      icon: '📝',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  return dedupeDashboardAlertItems(candidates);
}

export { ATT_KEYS };
