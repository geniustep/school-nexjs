// Parse and map Odoo executive dashboard contract for the Next.js UI.

import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import type {
  AdminExecutiveDashboard,
  ExecutiveAlertSeverity,
  ExecutiveClosureKind,
  ExecutiveImportantAlert,
  ExecutiveSchoolDayMode,
  ExecutiveSchoolDayStatus,
  ExecutiveStaffAlert,
} from '@/types/executive-dashboard';
import type { Locale } from '@/lib/i18n/config';
import { DEFAULT_LOCALE } from '@/lib/i18n/config';
import { normalizeLocalizedText } from '@/lib/i18n/normalize-localized-text';
import {
  buildRegistryDashboardAlert,
  dedupeDashboardAlertItems,
  enrichDashboardAlertItem,
  type DashboardAlertCandidate,
} from '@/lib/admin/dashboard-alert-registry';
import type { TranslateFn } from '@/features/i18n/locale-context';

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

function readNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function readString(value: unknown, fallback = '', locale: Locale | string = DEFAULT_LOCALE): string {
  return normalizeLocalizedText(value, locale, { fallback }) ?? fallback;
}

function readNullableString(value: unknown, locale: Locale | string = DEFAULT_LOCALE): string | null {
  if (value == null) return null;
  const s = readString(value, '', locale).trim();
  return s || null;
}

function readSeverity(value: unknown): ExecutiveAlertSeverity {
  if (value === 'critical' || value === 'warning' || value === 'info') return value;
  return 'info';
}

function readSchoolDayStatus(value: unknown): ExecutiveSchoolDayStatus {
  if (
    value === 'school_day' ||
    value === 'partial_school_day' ||
    value === 'non_school_day' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'unknown';
}

function readSchoolDayMode(value: unknown): ExecutiveSchoolDayMode | null {
  if (
    value === 'full' ||
    value === 'morning_only' ||
    value === 'afternoon_only' ||
    value === 'closed'
  ) {
    return value;
  }
  return null;
}

function readClosureKind(value: unknown): ExecutiveClosureKind | null {
  if (value === 'none' || value === 'full' || value === 'partial') return value;
  return null;
}

function readAcademicYear(
  raw: unknown,
  locale: Locale | string = DEFAULT_LOCALE,
): AdminExecutiveDashboard['active_academic_year'] {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = readNumber(o.id, NaN);
  const name = readString(o.name, '', locale).trim();
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

function readSchoolDayContext(raw: unknown): AdminExecutiveDashboard['school_day_context'] {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const warnings = Array.isArray(o.warnings)
    ? o.warnings
        .map((warning) => readString(warning).trim())
        .filter((warning): warning is string => warning.length > 0)
    : [];

  return {
    date: readString(o.date).trim(),
    academic_year_id: readNullableNumber(o.academic_year_id),
    status: readSchoolDayStatus(o.status),
    is_school_day: readNullableBoolean(o.is_school_day),
    attendance_expected: readNullableBoolean(o.attendance_expected),
    day_mode: readSchoolDayMode(o.day_mode),
    reason_code: readString(o.reason_code).trim(),
    closure_kind: readClosureKind(o.closure_kind),
    warnings,
    timezone: readString(o.timezone).trim(),
  };
}

function readStaffAlert(raw: unknown, locale: Locale | string = DEFAULT_LOCALE): ExecutiveStaffAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const message = readString(o.message, '', locale).trim();
  if (!message) return null;
  const code = readString(o.code, '', locale).trim() || `staff-${message.slice(0, 24)}`;
  return {
    code,
    message,
    href: readNullableString(o.href, locale),
    severity: readSeverity(o.severity),
  };
}

function readImportantAlert(
  raw: unknown,
  locale: Locale | string = DEFAULT_LOCALE,
): ExecutiveImportantAlert | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const message = readString(o.message, '', locale).trim();
  if (!message) return null;
  const code = readString(o.code, '', locale).trim() || `alert-${message.slice(0, 24)}`;
  return {
    type: readString(o.type, '', locale),
    code,
    message,
    href: readNullableString(o.href, locale),
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

function readQuickLink(
  raw: unknown,
  locale: Locale | string = DEFAULT_LOCALE,
): AdminExecutiveDashboard['quick_links'][number] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const label = readString(o.label, '', locale).trim();
  const href = readString(o.href, '', locale).trim();
  if (!label || !href) return null;
  const code = readString(o.code, '', locale).trim() || href;
  return { code, label, href };
}

/** Flexible parser — keeps the page resilient to partial Odoo payloads. */
export function normalizeExecutiveDashboard(
  raw: unknown,
  locale: Locale | string = DEFAULT_LOCALE,
): AdminExecutiveDashboard {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const staffAlerts = Array.isArray(o.staff_alerts)
    ? o.staff_alerts.map((item) => readStaffAlert(item, locale)).filter((a): a is ExecutiveStaffAlert => a != null)
    : [];

  const importantAlerts = Array.isArray(o.important_alerts)
    ? o.important_alerts
        .map((item) => readImportantAlert(item, locale))
        .filter((a): a is ExecutiveImportantAlert => a != null)
    : [];

  const quickLinks = Array.isArray(o.quick_links)
    ? o.quick_links.map((item) => readQuickLink(item, locale)).filter((l): l is NonNullable<typeof l> => l != null)
    : [];

  return {
    active_academic_year: readAcademicYear(o.active_academic_year, locale),
    finance_summary: readFinanceSummary(o.finance_summary),
    admissions_summary: readAdmissionsSummary(o.admissions_summary),
    attendance_gaps: readAttendanceGaps(o.attendance_gaps),
    school_day_context: readSchoolDayContext(o.school_day_context),
    staff_alerts: staffAlerts,
    important_alerts: importantAlerts,
    data_quality: readDataQuality(o.data_quality),
    quick_links: quickLinks,
  };
}

export function isExecutiveAttendanceExpected(
  executive: AdminExecutiveDashboard | null | undefined,
): boolean {
  return executive?.school_day_context?.attendance_expected === true;
}

function severityTone(severity: ExecutiveAlertSeverity): AdminActionItem['tone'] {
  return severity === 'info' ? 'default' : 'amber';
}

function severityIcon(severity: ExecutiveAlertSeverity): string {
  if (severity === 'critical') return '🚨';
  if (severity === 'warning') return '⚠️';
  return 'ℹ️';
}

function isMissingAttendanceAlert(code: string): boolean {
  return code === 'classes_missing_attendance_today' || code === 'attendance-classes-missing';
}

function collectExecutiveInterventionCandidates(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale,
): DashboardAlertCandidate[] {
  const candidates: DashboardAlertCandidate[] = [];
  const attendanceExpected = isExecutiveAttendanceExpected(executive);

  for (const alert of executive.important_alerts) {
    if (!attendanceExpected && isMissingAttendanceAlert(alert.code)) continue;
    candidates.push(
      enrichDashboardAlertItem(
        {
          id: alert.code,
          label: alert.message,
          href: alert.href ?? undefined,
          icon: severityIcon(alert.severity),
          tone: severityTone(alert.severity),
        },
        t,
        locale,
        executive,
      ),
    );
  }

  for (const alert of executive.staff_alerts) {
    candidates.push(
      enrichDashboardAlertItem(
        {
          id: alert.code,
          label: alert.message,
          href: alert.href ?? undefined,
          icon: severityIcon(alert.severity),
          tone: severityTone(alert.severity),
        },
        t,
        locale,
        executive,
      ),
    );
  }

  const finance = executive.finance_summary;
  if (finance?.overdue != null && finance.overdue > 0) {
    const item = buildRegistryDashboardAlert('finance-overdue', t, locale, {
      executive,
      icon: '💰',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if ((finance?.families_overdue_count ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('finance-families-overdue', t, locale, {
      executive,
      count: finance!.families_overdue_count,
      icon: '📞',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if ((finance?.promises_due_soon_count ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('finance-promises-due', t, locale, {
      executive,
      count: finance!.promises_due_soon_count,
      icon: '📆',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  const admissions = executive.admissions_summary;
  if ((admissions?.overdue_actions ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('admissions-overdue', t, locale, {
      executive,
      count: admissions!.overdue_actions,
      icon: '📝',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if ((admissions?.new ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('admissions-new', t, locale, {
      executive,
      count: admissions!.new,
      icon: '✨',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }
  if ((admissions?.in_progress ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('admissions-review', t, locale, {
      executive,
      count: admissions!.in_progress,
      icon: '🔍',
    });
    if (item) candidates.push(item);
  }

  const attendanceCount = executive.attendance_gaps?.classes_without_attendance_count;
  if (attendanceExpected && attendanceCount != null && attendanceCount > 0) {
    const item = buildRegistryDashboardAlert('attendance-classes-missing', t, locale, {
      executive,
      count: attendanceCount,
      icon: '🗓️',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  return candidates;
}

export function buildExecutiveAlertItems(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  const candidates = collectExecutiveInterventionCandidates(executive, t, locale).filter(
    (item) =>
      executive.important_alerts.some((alert) => alert.code === item.id) ||
      executive.staff_alerts.some((alert) => alert.code === item.id),
  );
  return dedupeDashboardAlertItems(candidates);
}

export function buildExecutiveFinanceInterventions(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  const finance = executive.finance_summary;
  if (!finance) return [];

  const candidates: DashboardAlertCandidate[] = [];

  if (finance.overdue > 0) {
    const item = buildRegistryDashboardAlert('finance-overdue', t, locale, {
      executive,
      icon: '💰',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if (finance.families_overdue_count > 0) {
    const item = buildRegistryDashboardAlert('finance-families-overdue', t, locale, {
      executive,
      count: finance.families_overdue_count,
      icon: '📞',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if (finance.promises_due_soon_count > 0) {
    const item = buildRegistryDashboardAlert('finance-promises-due', t, locale, {
      executive,
      count: finance.promises_due_soon_count,
      icon: '📆',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  return dedupeDashboardAlertItems(candidates);
}

export function buildExecutiveAdmissionsInterventions(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  const admissions = executive.admissions_summary;
  if (!admissions) return [];

  const candidates: DashboardAlertCandidate[] = [];

  if (admissions.overdue_actions > 0) {
    const item = buildRegistryDashboardAlert('admissions-overdue', t, locale, {
      executive,
      count: admissions.overdue_actions,
      icon: '📝',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if (admissions.new > 0) {
    const item = buildRegistryDashboardAlert('admissions-new', t, locale, {
      executive,
      count: admissions.new,
      icon: '✨',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if (admissions.in_progress > 0) {
    const item = buildRegistryDashboardAlert('admissions-review', t, locale, {
      executive,
      count: admissions.in_progress,
      icon: '🔍',
    });
    if (item) candidates.push(item);
  }

  return dedupeDashboardAlertItems(candidates);
}

export function buildExecutiveAttendanceInterventions(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  if (!isExecutiveAttendanceExpected(executive)) return [];

  const gaps = executive.attendance_gaps;
  if (!gaps) return [];

  const count = gaps.classes_without_attendance_count;
  if (count == null || count <= 0) return [];

  const item = buildRegistryDashboardAlert('attendance-classes-missing', t, locale, {
    executive,
    count,
    icon: '🗓️',
    tone: 'amber',
  });

  return item ? [item] : [];
}

export function buildExecutiveDataQualityItems(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  const dq = executive.data_quality;
  if (!dq) return [];

  const candidates: DashboardAlertCandidate[] = [];

  if ((dq.students_missing_guardian_count ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('dq-missing-guardian', t, locale, {
      executive,
      count: dq.students_missing_guardian_count,
      icon: '👪',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if ((dq.students_missing_required_data_count ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('dq-missing-required', t, locale, {
      executive,
      count: dq.students_missing_required_data_count,
      icon: '📝',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  if ((dq.students_missing_massar_count ?? 0) > 0) {
    const item = buildRegistryDashboardAlert('dq-missing-massar', t, locale, {
      executive,
      count: dq.students_missing_massar_count,
      icon: '🪪',
      tone: 'amber',
    });
    if (item) candidates.push(item);
  }

  return dedupeDashboardAlertItems(candidates);
}

export function mergeExecutiveInterventions(
  executive: AdminExecutiveDashboard,
  t: TranslateFn,
  locale: Locale = DEFAULT_LOCALE,
): AdminActionItem[] {
  return dedupeDashboardAlertItems(collectExecutiveInterventionCandidates(executive, t, locale));
}
