import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import {
  isExecutiveDashboardFailed,
  isExecutiveDashboardPending,
  isExecutiveDirectorUser,
  isExecutiveDirectorVariantId,
  shouldIncludeLegacyImportantAlerts,
  shouldShowDashboardContextPanel,
} from '@/lib/admin/executive-dashboard';
import {
  buildExecutiveAttendanceInterventions,
  buildExecutiveDataQualityItems,
  isExecutiveAttendanceExpected,
  mergeExecutiveInterventions,
  normalizeExecutiveDashboard,
} from '@/lib/admin/executive-dashboard-contract';
import { resolveDashboardContextPresentation, resolveDashboardWidgets } from '@/lib/admin/dashboard-registry';
import type { CurrentUser } from '@/types/user';

const t = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

function admin(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    name: 'Admin',
    email: 'a@test.ma',
    role: 'admin',
    permissions: [],
    school: { id: 10, name: 'School A' },
    ...overrides,
  };
}

describe('executive dashboard helpers', () => {
  it('school_manager with view_dashboard uses executive layout', () => {
    const user = admin({
      admin_kind: 'school_manager',
      permissions: ['view_dashboard', 'view_students', 'finance.view', 'admission.view'],
    });

    expect(isExecutiveDirectorUser(user)).toBe(true);
    expect(shouldShowDashboardContextPanel(user)).toBe(false);

    const widgets = resolveDashboardWidgets(user);
    expect(widgets.executiveLayout).toBe(true);
    expect(widgets.financeSummary).toBe(true);
    expect(widgets.admissionsSummary).toBe(true);
    expect(widgets.academicActivity).toBe(false);
  });

  it('project_manager gets executive headline in context presentation', () => {
    const user = admin({
      admin_kind: 'project_manager',
      permissions: ['view_dashboard'],
    });

    const context = resolveDashboardContextPresentation(user);
    expect(context?.headlineKey).toBe('admin.executive.contextHeadline');
  });

  it('admin_staff keeps command dashboard shell without executive layout', () => {
    const user = admin({
      admin_kind: 'admin_staff',
      permissions: ['view_dashboard', 'view_students'],
    });

    expect(isExecutiveDirectorUser(user)).toBe(false);
    expect(shouldShowDashboardContextPanel(user)).toBe(true);
    expect(resolveDashboardWidgets(user).executiveLayout).toBe(false);
  });

  it('pedagogical director is not executive director', () => {
    const user = admin({
      admin_kind: 'pedagogical_director',
      permissions: ['view_teachers', 'view_classes'],
      scope: {
        type: 'school',
        allowed_level_ids: [],
        allowed_class_ids: [],
        allowed_channel_ids: [],
      },
    });

    expect(isExecutiveDirectorUser(user)).toBe(false);
    expect(isExecutiveDirectorVariantId('pedagogical_director')).toBe(false);
  });
});

describe('executive dashboard contract', () => {
  it('normalizes partial Odoo payload without throwing', () => {
    const parsed = normalizeExecutiveDashboard({
      active_academic_year: { id: 3, name: '2025-2026' },
      finance_summary: null,
      admissions_summary: { open: 4, new: 1, in_progress: 2, qualified: 0, accepted: 1, overdue_actions: 0, conversion_candidates: 0 },
      attendance_gaps: {
        classes_without_attendance_count: 2,
        absent_today_count: 5,
        late_today_count: 1,
        attendance_rate_today: 91.5,
      },
      important_alerts: [{ type: 'finance', code: 'finance-overdue', message: 'Overdue follow-up', href: '/admin/finance', severity: 'warning' }],
      staff_alerts: [],
      data_quality: { students_missing_guardian_count: 3 },
      quick_links: [{ code: 'finance', label: 'Finance', href: '/admin/finance' }],
    });

    expect(parsed.active_academic_year?.name).toBe('2025-2026');
    expect(parsed.finance_summary).toBeNull();
    expect(parsed.admissions_summary?.open).toBe(4);
    expect(parsed.attendance_gaps?.attendance_rate_today).toBe(91.5);
    expect(parsed.school_day_context).toBeNull();
    expect(parsed.important_alerts).toHaveLength(1);
    expect(parsed.data_quality?.students_missing_guardian_count).toBe(3);
  });

  it('normalizes the canonical Odoo school-day context without recomputing it', () => {
    const parsed = normalizeExecutiveDashboard({
      school_day_context: {
        date: '2026-08-15',
        academic_year_id: 7,
        status: 'partial_school_day',
        is_school_day: true,
        attendance_expected: true,
        day_mode: 'morning_only',
        reason_code: 'partial_day',
        closure_kind: 'partial',
        warnings: ['provisional_event'],
        timezone: 'Africa/Casablanca',
      },
    });

    expect(parsed.school_day_context).toEqual({
      date: '2026-08-15',
      academic_year_id: 7,
      status: 'partial_school_day',
      is_school_day: true,
      attendance_expected: true,
      day_mode: 'morning_only',
      reason_code: 'partial_day',
      closure_kind: 'partial',
      warnings: ['provisional_event'],
      timezone: 'Africa/Casablanca',
    });
    expect(isExecutiveAttendanceExpected(parsed)).toBe(true);
  });

  it('fails safe for false, null, unknown, or missing attendance expectation', () => {
    const nonSchoolDay = normalizeExecutiveDashboard({
      school_day_context: {
        status: 'non_school_day',
        attendance_expected: false,
      },
    });
    const unknownDay = normalizeExecutiveDashboard({
      school_day_context: {
        status: 'unknown',
        attendance_expected: null,
      },
    });
    const missingContext = normalizeExecutiveDashboard({});

    expect(isExecutiveAttendanceExpected(nonSchoolDay)).toBe(false);
    expect(isExecutiveAttendanceExpected(unknownDay)).toBe(false);
    expect(isExecutiveAttendanceExpected(missingContext)).toBe(false);
  });

  it('builds attendance intervention only when Odoo explicitly expects attendance', () => {
    const base = {
      attendance_gaps: {
        classes_without_attendance_count: 24,
        absent_today_count: 0,
        late_today_count: 0,
        attendance_rate_today: 0,
      },
    };
    const notExpected = normalizeExecutiveDashboard({
      ...base,
      school_day_context: { status: 'non_school_day', attendance_expected: false },
    });
    const unknown = normalizeExecutiveDashboard({
      ...base,
      school_day_context: { status: 'unknown', attendance_expected: null },
    });
    const expected = normalizeExecutiveDashboard({
      ...base,
      school_day_context: { status: 'school_day', attendance_expected: true },
    });

    expect(buildExecutiveAttendanceInterventions(notExpected, (key) => key)).toEqual([]);
    expect(buildExecutiveAttendanceInterventions(unknown, (key) => key)).toEqual([]);
    expect(buildExecutiveAttendanceInterventions(expected, (key) => key).map((item) => item.id)).toEqual([
      'attendance-classes-missing',
    ]);
  });

  it('suppresses an inconsistent raw missing-attendance alert outside a school day', () => {
    const executive = normalizeExecutiveDashboard({
      school_day_context: { status: 'non_school_day', attendance_expected: false },
      attendance_gaps: {
        classes_without_attendance_count: 24,
        absent_today_count: 0,
        late_today_count: 0,
        attendance_rate_today: 0,
      },
      important_alerts: [
        {
          type: 'attendance',
          code: 'classes_missing_attendance_today',
          message: '24 classes missing attendance',
          href: '/admin/attendance?date=today',
          severity: 'warning',
        },
      ],
    });

    expect(mergeExecutiveInterventions(executive, (key) => key)).toEqual([]);
  });

  it('deduplicates executive interventions by alert code', () => {
    const executive = normalizeExecutiveDashboard({
      finance_summary: {
        currency: 'MAD',
        collected_today: 0,
        collected_month: 1000,
        remaining: 500,
        overdue: 200,
        families_overdue_count: 2,
        promises_due_soon_count: 0,
        source: 'billing',
      },
      important_alerts: [
        { type: 'finance', code: 'finance-overdue', message: 'Overdue', href: null, severity: 'warning' },
      ],
      staff_alerts: [
        { code: 'finance-overdue', message: 'Duplicate', href: null, severity: 'info' },
      ],
    });

    const items = mergeExecutiveInterventions(executive, (key) => key);
    const overdueItems = items.filter((item) => item.id === 'finance-overdue');
    expect(overdueItems).toHaveLength(1);
  });

  it('builds executive data quality items from contract fields', () => {
    const executive = normalizeExecutiveDashboard({
      data_quality: {
        students_missing_guardian_count: 2,
        students_missing_massar_count: 1,
      },
    });

    const items = buildExecutiveDataQualityItems(executive, t);
    expect(items.map((item) => item.id)).toEqual(['dq-missing-guardian', 'dq-missing-massar']);
  });

  it('normalizes localized executive alert messages by locale', () => {
    const executive = normalizeExecutiveDashboard(
      {
        important_alerts: [
          {
            type: 'finance',
            code: 'families_overdue',
            message: {
              ar: 'توجد متأخرات',
              fr: 'Des impayés existent',
              en: 'Overdue balances exist',
            },
            severity: 'warning',
          },
        ],
      },
      'fr',
    );

    expect(executive.important_alerts[0]?.message).toBe('Des impayés existent');
  });
});

describe('executive dashboard loading helpers', () => {
  it('Case E — executive pending suppresses legacy important alerts', () => {
    expect(
      shouldIncludeLegacyImportantAlerts({
        executiveLayout: true,
        executivePending: true,
        executiveAvailable: false,
      }),
    ).toBe(false);
    expect(isExecutiveDashboardPending({ loading: true, data: null, error: null })).toBe(true);
  });

  it('Case F — executive success uses executive contract and not legacy alerts', () => {
    expect(
      shouldIncludeLegacyImportantAlerts({
        executiveLayout: true,
        executivePending: false,
        executiveAvailable: true,
      }),
    ).toBe(false);
  });

  it('Case G — executive failure keeps legacy fallback path', () => {
    expect(
      shouldIncludeLegacyImportantAlerts({
        executiveLayout: true,
        executivePending: false,
        executiveAvailable: false,
      }),
    ).toBe(true);
    expect(isExecutiveDashboardFailed({ loading: false, data: null, error: new Error('x') })).toBe(
      true,
    );
  });
});
