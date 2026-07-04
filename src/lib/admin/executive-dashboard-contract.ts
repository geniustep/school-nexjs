// Parse and map Odoo executive dashboard contract for the Next.js UI.

import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type {
  AdminExecutiveDashboard,
  ExecutiveAlertSeverity,
  ExecutiveImportantAlert,
  ExecutiveStaffAlert,
} from '@/types/executive-dashboard';

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function readNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = readNumber(value, NaN);
  return Number.isFinite(n) ? n : null;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  if (value == null) return null;
  const s = readString(value).trim();
  return s || null;
}

function readSeverity(value: unknown): ExecutiveAlertSeverity {
  if (value === 'critical' || value === 'warning' || value === 'info') return value;
  return 'info';
}

function readAcademicYear(raw: unknown): AdminExecutiveDashboard['active_academic_year'] {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = readNumber(o.id, NaN);
  const name = readString(o.name).trim();
  if (!Number.isFinite(id) || !name) return null;
  return { id, name };
}

function readFinanceSummary(raw: unknown): AdminExecutiveDashboard['finance_summary'] {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    currency: readString(o.currency, 'MAD'),
    collected_today: readNumber(o.collected_today),
    collected_month: readNumber(o.collected_month),
    remaining: readNumber(o.remaining),
    overdue: readNumber(o.overdue),
    families_overdue_count: readNumber(o.families_overdue_count),
    promises_due_soon_count: readNumber(o.promises_due_soon_count),
    source: readString(o.source),
  };
}

function readAdmissionsSummary(raw: unknown): AdminExecutiveDashboard['admissions_summary'] {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    open: readNumber(o.open),
    new: readNumber(o.new),
    in_progress: readNumber(o.in_progress),
    qualified: readNumber(o.qualified),
    accepted: readNumber(o.accepted),
    overdue_actions: readNumber(o.overdue_actions),
    conversion_candidates: readNumber(o.conversion_candidates),
  };
}

function readAttendanceGaps(raw: unknown): AdminExecutiveDashboard['attendance_gaps'] {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    classes_without_attendance_count: readNullableNumber(o.classes_without_attendance_count),
    absent_today_count: readNumber(o.absent_today_count),
    late_today_count: readNumber(o.late_today_count),
    attendance_rate_today: readNumber(o.attendance_rate_today),
  };
}

function readStaffAlert(raw: unknown): ExecutiveStaffAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const message = readString(o.message).trim();
  if (!message) return null;
  const code = readString(o.code).trim() || `staff-${message.slice(0, 24)}`;
  return {
    code,
    message,
    href: readNullableString(o.href),
    severity: readSeverity(o.severity),
  };
}

function readImportantAlert(raw: unknown): ExecutiveImportantAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const message = readString(o.message).trim();
  if (!message) return null;
  const code = readString(o.code).trim() || `alert-${message.slice(0, 24)}`;
  return {
    type: readString(o.type),
    code,
    message,
    href: readNullableString(o.href),
    severity: readSeverity(o.severity),
  };
}

function readDataQuality(raw: unknown): AdminExecutiveDashboard['data_quality'] {
  if (raw == null) return null;
  if (typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const result = {
    students_missing_guardian_count: readNumber(o.students_missing_guardian_count, NaN),
    students_missing_required_data_count: readNumber(o.students_missing_required_data_count, NaN),
    students_missing_massar_count: readNumber(o.students_missing_massar_count, NaN),
  };
  const hasAny = Object.values(result).some((n) => Number.isFinite(n));
  if (!hasAny) return {};
  return {
    students_missing_guardian_count: Number.isFinite(result.students_missing_guardian_count)
      ? result.students_missing_guardian_count
      : undefined,
    students_missing_required_data_count: Number.isFinite(result.students_missing_required_data_count)
      ? result.students_missing_required_data_count
      : undefined,
    students_missing_massar_count: Number.isFinite(result.students_missing_massar_count)
      ? result.students_missing_massar_count
      : undefined,
  };
}

function readQuickLink(raw: unknown): AdminExecutiveDashboard['quick_links'][number] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = readString(o.label).trim();
  const href = readString(o.href).trim();
  if (!label || !href) return null;
  const code = readString(o.code).trim() || href;
  return { code, label, href };
}

/** Flexible parser — keeps the page resilient to partial Odoo payloads. */
export function normalizeExecutiveDashboard(raw: unknown): AdminExecutiveDashboard {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const staffAlerts = Array.isArray(o.staff_alerts)
    ? o.staff_alerts.map(readStaffAlert).filter((a): a is ExecutiveStaffAlert => a != null)
    : [];

  const importantAlerts = Array.isArray(o.important_alerts)
    ? o.important_alerts.map(readImportantAlert).filter((a): a is ExecutiveImportantAlert => a != null)
    : [];

  const quickLinks = Array.isArray(o.quick_links)
    ? o.quick_links.map(readQuickLink).filter((l): l is NonNullable<typeof l> => l != null)
    : [];

  return {
    active_academic_year: readAcademicYear(o.active_academic_year),
    finance_summary: readFinanceSummary(o.finance_summary),
    admissions_summary: readAdmissionsSummary(o.admissions_summary),
    attendance_gaps: readAttendanceGaps(o.attendance_gaps),
    staff_alerts: staffAlerts,
    important_alerts: importantAlerts,
    data_quality: readDataQuality(o.data_quality),
    quick_links: quickLinks,
  };
}

function severityTone(severity: ExecutiveAlertSeverity): AdminActionItem['tone'] {
  return severity === 'info' ? 'default' : 'amber';
}

function severityIcon(severity: ExecutiveAlertSeverity): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning') return '⚠️';
  return 'ℹ️';
}

function pushUniqueItem(items: AdminActionItem[], seen: Set<string>, item: AdminActionItem): void {
  const key = item.id;
  if (seen.has(key)) return;
  seen.add(key);
  items.push(item);
}

export function buildExecutiveAlertItems(
  executive: AdminExecutiveDashboard,
): AdminActionItem[] {
  const items: AdminActionItem[] = [];
  const seen = new Set<string>();

  for (const alert of executive.important_alerts) {
    pushUniqueItem(items, seen, {
      id: alert.code,
      label: alert.message,
      href: alert.href ?? undefined,
      icon: severityIcon(alert.severity),
      tone: severityTone(alert.severity),
    });
  }

  for (const alert of executive.staff_alerts) {
    pushUniqueItem(items, seen, {
      id: alert.code,
      label: alert.message,
      href: alert.href ?? undefined,
      icon: severityIcon(alert.severity),
      tone: severityTone(alert.severity),
    });
  }

  return items;
}

export function buildExecutiveFinanceInterventions(
  executive: AdminExecutiveDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const finance = executive.finance_summary;
  if (!finance) return [];

  const items: AdminActionItem[] = [];
  const seen = new Set<string>();

  if (finance.overdue > 0) {
    pushUniqueItem(items, seen, {
      id: 'finance-overdue',
      label: t('admin.executive.financeOverdueAlert'),
      href: '/admin/finance/installments?status=overdue',
      icon: '💰',
      tone: 'amber',
    });
  }

  if (finance.families_overdue_count > 0) {
    pushUniqueItem(items, seen, {
      id: 'finance-families-overdue',
      label: t('admin.executive.financeFollowupCount', { count: finance.families_overdue_count }),
      href: '/admin/finance/billing-accounts',
      icon: '📞',
      tone: 'amber',
    });
  }

  if (finance.promises_due_soon_count > 0) {
    pushUniqueItem(items, seen, {
      id: 'finance-promises-due',
      label: t('admin.executive.financePromisesDueSoon', {
        count: finance.promises_due_soon_count,
      }),
      href: '/admin/finance/collections',
      icon: '📆',
      tone: 'amber',
    });
  }

  return items;
}

export function buildExecutiveAdmissionsInterventions(
  executive: AdminExecutiveDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const admissions = executive.admissions_summary;
  if (!admissions) return [];

  const items: AdminActionItem[] = [];
  const seen = new Set<string>();

  if (admissions.overdue_actions > 0) {
    pushUniqueItem(items, seen, {
      id: 'admissions-overdue',
      label: t('admin.executive.admissionsOverdueActions', { count: admissions.overdue_actions }),
      href: '/admin/admissions',
      icon: '📝',
      tone: 'amber',
    });
  }

  if (admissions.new > 0) {
    pushUniqueItem(items, seen, {
      id: 'admissions-new',
      label: t('admin.executive.admissionsNewPending', { count: admissions.new }),
      href: '/admin/admissions?state=new',
      icon: '✨',
      tone: 'amber',
    });
  }

  if (admissions.in_progress > 0) {
    pushUniqueItem(items, seen, {
      id: 'admissions-review',
      label: t('admin.executive.admissionsUnderReview', { count: admissions.in_progress }),
      href: '/admin/admissions?state=under_review',
      icon: '🔍',
    });
  }

  return items;
}

export function buildExecutiveAttendanceInterventions(
  executive: AdminExecutiveDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const gaps = executive.attendance_gaps;
  if (!gaps) return [];

  const items: AdminActionItem[] = [];
  const count = gaps.classes_without_attendance_count;
  if (count != null && count > 0) {
    items.push({
      id: 'attendance-classes-missing',
      label: t('admin.executive.attendanceClassesMissing', { count }),
      href: '/admin/attendance?date=today',
      icon: '🗓️',
      tone: 'amber',
    });
  }

  return items;
}

export function buildExecutiveDataQualityItems(
  executive: AdminExecutiveDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const dq = executive.data_quality;
  if (!dq) return [];

  const items: AdminActionItem[] = [];
  const studentsHref = '/admin/students';

  if ((dq.students_missing_guardian_count ?? 0) > 0) {
    items.push({
      id: 'dq-missing-guardian',
      label: t('admin.executive.dqMissingGuardian', { count: dq.students_missing_guardian_count! }),
      href: studentsHref,
      icon: '👪',
      tone: 'amber',
    });
  }

  if ((dq.students_missing_required_data_count ?? 0) > 0) {
    items.push({
      id: 'dq-missing-required',
      label: t('admin.executive.dqMissingRequiredData', {
        count: dq.students_missing_required_data_count!,
      }),
      href: studentsHref,
      icon: '📝',
      tone: 'amber',
    });
  }

  if ((dq.students_missing_massar_count ?? 0) > 0) {
    items.push({
      id: 'dq-missing-massar',
      label: t('admin.executive.dqMissingMassar', { count: dq.students_missing_massar_count! }),
      href: studentsHref,
      icon: '🪪',
      tone: 'amber',
    });
  }

  return items;
}

export function mergeExecutiveInterventions(
  executive: AdminExecutiveDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const items: AdminActionItem[] = [];
  const seen = new Set<string>();

  for (const item of [
    ...buildExecutiveAlertItems(executive),
    ...buildExecutiveFinanceInterventions(executive, t),
    ...buildExecutiveAdmissionsInterventions(executive, t),
    ...buildExecutiveAttendanceInterventions(executive, t),
  ]) {
    pushUniqueItem(items, seen, item);
  }

  return items;
}
