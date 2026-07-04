import { describe, expect, it } from 'vitest';
import {
  isExecutiveDirectorUser,
  isExecutiveDirectorVariantId,
  shouldShowDashboardContextPanel,
} from '@/lib/admin/executive-dashboard';
import {
  buildExecutiveDataQualityItems,
  mergeExecutiveInterventions,
  normalizeExecutiveDashboard,
} from '@/lib/admin/executive-dashboard-contract';
import { resolveDashboardContextPresentation, resolveDashboardWidgets } from '@/lib/admin/dashboard-registry';
import type { CurrentUser } from '@/types/user';

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
    expect(parsed.important_alerts).toHaveLength(1);
    expect(parsed.data_quality?.students_missing_guardian_count).toBe(3);
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

    const items = buildExecutiveDataQualityItems(executive, (key, params) =>
      params?.count != null ? `${key}:${params.count}` : key,
    );
    expect(items.map((item) => item.id)).toEqual(['dq-missing-guardian', 'dq-missing-massar']);
  });
});
