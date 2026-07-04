import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type { Locale } from '@/lib/i18n/config';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { financeDeepLinkHref } from '@/features/admin/finance/finance-deep-links';
import type { AdminExecutiveDashboard } from '@/types/executive-dashboard';
import {
  formatDashboardAlertPlural,
  type DashboardAlertPluralKind,
} from '@/lib/admin/dashboard-alert-plural';

export type DashboardAlertFamily =
  | 'finance_collection_followup'
  | 'finance_installment_overdue'
  | 'finance_payment_promise'
  | 'admissions_overdue'
  | 'admissions_new'
  | 'admissions_in_review'
  | 'attendance_missing_classes'
  | 'data_quality_guardian'
  | 'data_quality_required_data'
  | 'data_quality_massar'
  | 'data_quality_without_class'
  | 'data_quality_without_parent'
  | 'data_quality_without_year'
  | 'data_quality_incomplete_profile'
  | 'staff_missing_assignments'
  | 'exams_missing_results'
  | 'exam_draft_results';

export type DashboardAlertCode =
  | 'overdue_followup_needed'
  | 'families_overdue'
  | 'finance-overdue'
  | 'finance-families-overdue'
  | 'finance-promises-due'
  | 'admissions_overdue_actions'
  | 'admissions-overdue'
  | 'admissions-new'
  | 'admissions-review'
  | 'classes_missing_attendance_today'
  | 'attendance-classes-missing'
  | 'students_missing_guardian'
  | 'students_missing_required_data'
  | 'students_missing_massar'
  | 'dq-missing-guardian'
  | 'dq-missing-required'
  | 'dq-missing-massar'
  | 'dq-without-class'
  | 'dq-without-parent'
  | 'dq-without-year'
  | 'dq-incomplete-profile'
  | 'teacher_without_assignments'
  | 'exams-missing-results'
  | 'draft-results';

type AlertRegistryEntry = {
  family: DashboardAlertFamily;
  specificity: number;
  pluralKind?: DashboardAlertPluralKind;
  labelKey?: string;
  href: string;
  actionKey: string;
  countFromExecutive?: (executive: AdminExecutiveDashboard) => number | null | undefined;
};

export const DASHBOARD_ALERT_REGISTRY: Record<DashboardAlertCode, AlertRegistryEntry> = {
  overdue_followup_needed: {
    family: 'finance_collection_followup',
    specificity: 20,
    labelKey: 'admin.executive.financeOverdueAlert',
    href: '/admin/finance/billing-accounts?has_overdue=true',
    actionKey: 'admin.dashboardAlerts.actions.viewBillingAccounts',
  },
  families_overdue: {
    family: 'finance_collection_followup',
    specificity: 60,
    pluralKind: 'billingAccountFollowup',
    href: '/admin/finance/billing-accounts?has_overdue=true',
    actionKey: 'admin.dashboardAlerts.actions.viewBillingAccounts',
    countFromExecutive: (e) => e.finance_summary?.families_overdue_count,
  },
  'finance-families-overdue': {
    family: 'finance_collection_followup',
    specificity: 60,
    pluralKind: 'billingAccountFollowup',
    href: '/admin/finance/billing-accounts?has_overdue=true',
    actionKey: 'admin.dashboardAlerts.actions.viewBillingAccounts',
    countFromExecutive: (e) => e.finance_summary?.families_overdue_count,
  },
  'finance-overdue': {
    family: 'finance_installment_overdue',
    specificity: 40,
    labelKey: 'admin.executive.financeOverdueAlert',
    href: financeDeepLinkHref('overdueInstallments'),
    actionKey: 'admin.dashboardAlerts.actions.viewOverdueInstallments',
  },
  'finance-promises-due': {
    family: 'finance_payment_promise',
    specificity: 50,
    pluralKind: 'paymentPromiseDue',
    href: '/admin/finance/collections',
    actionKey: 'admin.dashboardAlerts.actions.viewCollections',
    countFromExecutive: (e) => e.finance_summary?.promises_due_soon_count,
  },
  admissions_overdue_actions: {
    family: 'admissions_overdue',
    specificity: 60,
    pluralKind: 'admissionOverdue',
    href: '/admin/admissions',
    actionKey: 'admin.dashboardAlerts.actions.reviewAdmissions',
    countFromExecutive: (e) => e.admissions_summary?.overdue_actions,
  },
  'admissions-overdue': {
    family: 'admissions_overdue',
    specificity: 60,
    pluralKind: 'admissionOverdue',
    href: '/admin/admissions',
    actionKey: 'admin.dashboardAlerts.actions.reviewAdmissions',
    countFromExecutive: (e) => e.admissions_summary?.overdue_actions,
  },
  'admissions-new': {
    family: 'admissions_new',
    specificity: 50,
    pluralKind: 'admissionNew',
    href: '/admin/admissions',
    actionKey: 'admin.dashboardAlerts.actions.reviewAdmissions',
    countFromExecutive: (e) => e.admissions_summary?.new,
  },
  'admissions-review': {
    family: 'admissions_in_review',
    specificity: 50,
    pluralKind: 'admissionInReview',
    href: '/admin/admissions',
    actionKey: 'admin.dashboardAlerts.actions.reviewAdmissions',
    countFromExecutive: (e) => e.admissions_summary?.in_progress,
  },
  classes_missing_attendance_today: {
    family: 'attendance_missing_classes',
    specificity: 40,
    pluralKind: 'classMissingAttendance',
    labelKey: 'admin.dashboardAlerts.generic.attendanceClassesMissing',
    href: '/admin/attendance?date=today',
    actionKey: 'admin.dashboardAlerts.actions.openAttendance',
    countFromExecutive: (e) => e.attendance_gaps?.classes_without_attendance_count,
  },
  'attendance-classes-missing': {
    family: 'attendance_missing_classes',
    specificity: 60,
    pluralKind: 'classMissingAttendance',
    href: '/admin/attendance?date=today',
    actionKey: 'admin.dashboardAlerts.actions.openAttendance',
    countFromExecutive: (e) => e.attendance_gaps?.classes_without_attendance_count,
  },
  students_missing_guardian: {
    family: 'data_quality_guardian',
    specificity: 60,
    pluralKind: 'studentMissingGuardian',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_guardian_count,
  },
  'dq-missing-guardian': {
    family: 'data_quality_guardian',
    specificity: 60,
    pluralKind: 'studentMissingGuardian',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_guardian_count,
  },
  students_missing_required_data: {
    family: 'data_quality_required_data',
    specificity: 60,
    pluralKind: 'studentMissingRequiredData',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_required_data_count,
  },
  'dq-missing-required': {
    family: 'data_quality_required_data',
    specificity: 60,
    pluralKind: 'studentMissingRequiredData',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_required_data_count,
  },
  students_missing_massar: {
    family: 'data_quality_massar',
    specificity: 60,
    pluralKind: 'studentMissingMassar',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_massar_count,
  },
  'dq-missing-massar': {
    family: 'data_quality_massar',
    specificity: 60,
    pluralKind: 'studentMissingMassar',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
    countFromExecutive: (e) => e.data_quality?.students_missing_massar_count,
  },
  'dq-without-class': {
    family: 'data_quality_without_class',
    specificity: 50,
    pluralKind: 'studentWithoutClass',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
  },
  'dq-without-parent': {
    family: 'data_quality_without_parent',
    specificity: 50,
    pluralKind: 'studentWithoutParent',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
  },
  'dq-without-year': {
    family: 'data_quality_without_year',
    specificity: 50,
    pluralKind: 'studentWithoutYear',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
  },
  'dq-incomplete-profile': {
    family: 'data_quality_incomplete_profile',
    specificity: 50,
    pluralKind: 'studentIncompleteProfile',
    href: '/admin/students',
    actionKey: 'admin.dashboardAlerts.actions.viewStudents',
  },
  teacher_without_assignments: {
    family: 'staff_missing_assignments',
    specificity: 40,
    href: '/admin/teachers',
    actionKey: 'admin.dashboardAlerts.actions.viewTeachers',
  },
  'exams-missing-results': {
    family: 'exams_missing_results',
    specificity: 50,
    pluralKind: 'examMissingResults',
    href: '/admin/exams',
    actionKey: 'admin.dashboardAlerts.actions.reviewExams',
  },
  'draft-results': {
    family: 'exam_draft_results',
    specificity: 50,
    pluralKind: 'draftResultPending',
    href: '/admin/exam-results',
    actionKey: 'admin.dashboardAlerts.actions.reviewResults',
  },
};

export type DashboardAlertCandidate = AdminActionItem & {
  family?: DashboardAlertFamily;
  specificity: number;
};

function isRegistryCode(code: string): code is DashboardAlertCode {
  return code in DASHBOARD_ALERT_REGISTRY;
}

function stripCandidate(item: DashboardAlertCandidate): AdminActionItem {
  const { family: _family, specificity: _specificity, ...actionItem } = item;
  return actionItem;
}

export function resolveDashboardAlertHref(code: string, backendHref?: string | null): string | undefined {
  if (isRegistryCode(code)) return DASHBOARD_ALERT_REGISTRY[code].href;
  return backendHref?.trim() || undefined;
}

export function buildRegistryDashboardAlert(
  code: string,
  t: TranslateFn,
  locale: Locale | string,
  options?: {
    count?: number | null;
    executive?: AdminExecutiveDashboard | null;
    fallbackLabel?: string;
    icon?: string;
    tone?: AdminActionItem['tone'];
  },
): DashboardAlertCandidate | null {
  if (!isRegistryCode(code)) return null;
  const entry = DASHBOARD_ALERT_REGISTRY[code];
  const count =
    options?.count ??
    (options?.executive && entry.countFromExecutive
      ? entry.countFromExecutive(options.executive)
      : undefined);

  let label = options?.fallbackLabel?.trim() || '';
  if (entry.pluralKind && count != null && count > 0) {
    label = formatDashboardAlertPlural(t, locale, entry.pluralKind, count);
  } else if (entry.labelKey) {
    label = t(entry.labelKey);
  } else if (entry.pluralKind && count === 0) {
    label = formatDashboardAlertPlural(t, locale, entry.pluralKind, 0);
  }

  if (!label) return null;

  return {
    id: code,
    label,
    href: entry.href,
    hint: t(entry.actionKey),
    icon: options?.icon ?? '⚠️',
    tone: options?.tone ?? 'amber',
    family: entry.family,
    specificity: entry.specificity + (count != null && count > 0 ? 10 : 0),
  };
}

export function enrichDashboardAlertItem(
  item: AdminActionItem,
  t: TranslateFn,
  locale: Locale | string,
  executive?: AdminExecutiveDashboard | null,
): DashboardAlertCandidate {
  if (!isRegistryCode(item.id)) {
    return { ...item, specificity: 10 };
  }

  const enriched = buildRegistryDashboardAlert(item.id, t, locale, {
    executive,
    fallbackLabel: item.label,
    icon: item.icon,
    tone: item.tone,
  });

  if (!enriched) {
    return { ...item, specificity: 10 };
  }

  return enriched;
}

export function dedupeDashboardAlertItems(items: DashboardAlertCandidate[]): AdminActionItem[] {
  const winners = new Map<DashboardAlertFamily, DashboardAlertCandidate>();

  for (const item of items) {
    if (!item.family) continue;
    const current = winners.get(item.family);
    if (!current || item.specificity > current.specificity) {
      winners.set(item.family, item);
    }
  }

  const emitted = new Set<string>();
  const result: AdminActionItem[] = [];

  for (const item of items) {
    if (!item.family) {
      if (!emitted.has(item.id)) {
        emitted.add(item.id);
        result.push(stripCandidate(item));
      }
      continue;
    }
    const winner = winners.get(item.family);
    if (winner?.id === item.id && !emitted.has(item.id)) {
      emitted.add(item.id);
      result.push(stripCandidate(item));
    }
  }

  return result;
}
