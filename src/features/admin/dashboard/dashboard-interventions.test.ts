import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import {
  buildDashboardActionItems,
  buildDataQualityItems,
  buildImportantAlertItems,
} from '@/features/admin/dashboard/dashboard-interventions';
import { parseDashboardAlertItem } from '@/features/admin/dashboard/dashboard-alert-text';
import type { AdminDashboard } from '@/types/dashboard';

const t = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

function dashboard(overrides: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    total_students: 0,
    total_teachers: 0,
    total_parents: 0,
    total_classes: 0,
    attendance_today: { present: 0, absent: 0, late: 0, left_early: 0, total: 0 },
    latest_messages: [],
    important_alerts: [],
    ...overrides,
  };
}

describe('dashboard alert text normalization', () => {
  it('Case A — command dashboard with string message shows correct text', () => {
    const items = buildImportantAlertItems(dashboard({ important_alerts: ['توجد متأخرات'] }), t, 'ar');
    expect(items).toHaveLength(1);
    expect(items[0]?.label).toBe('توجد متأخرات');
    expect(items[0]?.label).not.toContain('[object Object]');
  });

  it('Case B — command dashboard with localized object shows Arabic in ar locale', () => {
    const items = buildImportantAlertItems(
      dashboard({
        important_alerts: [
          {
            type: 'finance',
            code: 'families_overdue',
            message: {
              ar: 'توجد متأخرات',
              fr: 'Des impayés existent',
              en: 'Overdue balances exist',
            },
            href: '/admin/finance',
            severity: 'warning',
          },
        ],
      }),
      t,
      'ar',
    );
    expect(items[0]?.label).toBe('توجد متأخرات');
    expect(items[0]?.label).not.toContain('[object Object]');
  });

  it('Case C — localized object selects French in fr locale', () => {
    const item = parseDashboardAlertItem(
      {
        code: 'families_overdue',
        message: {
          ar: 'توجد متأخرات',
          fr: 'Des impayés existent',
          en: 'Overdue balances exist',
        },
      },
      'fr',
      0,
    );
    expect(item?.label).toBe('Des impayés existent');
  });

  it('Case D — malformed object does not crash or render [object Object]', () => {
    const item = parseDashboardAlertItem({ code: 'broken_alert', message: { count: 3 } }, 'ar', 0);
    expect(item?.label).toBe('broken alert');
    expect(item?.label).not.toContain('[object Object]');
  });

  it('does not stringify alert objects in buildDashboardActionItems', () => {
    const items = buildDashboardActionItems(
      dashboard({
        important_alerts: [
          {
            type: 'finance',
            code: 'overdue_followup_needed',
            message: 'متابعة المتأخرات مطلوبة',
            href: '/admin/finance',
            severity: 'warning',
          },
        ],
      }),
      t,
      'ar',
    );
    expect(items.some((item) => item.label.includes('[object Object]'))).toBe(false);
    expect(items[0]?.id).toBe('overdue_followup_needed');
    expect(items[0]?.href).toBe('/admin/finance/billing-accounts?has_overdue=true');
    expect(items[0]?.hint).toBe('عرض الحسابات');
  });
});

describe('command dashboard alert actions', () => {
  it('applies registry deep links and action hints for data quality items', () => {
    const items = buildDataQualityItems(
      {
        ...dashboard(),
        data_quality: {
          students_without_class: 4,
          students_incomplete_profile: 2,
        },
      } as AdminDashboard,
      t,
      'ar',
    );

    expect(items).toHaveLength(2);
    expect(items[0]?.label).toBe('4 تلاميذ بدون قسم');
    expect(items[0]?.href).toBe('/admin/students');
    expect(items[0]?.hint).toBe('عرض التلاميذ');
    expect(items[0]?.label).not.toMatch(/\(ات\)|\(أقسام\)|\(تلاميذ\)/);
  });

  it('uses pluralized exam alerts with deep links', () => {
    const items = buildDashboardActionItems(
      dashboard({ exams_missing_results: 3, draft_exam_results_count: 2 }),
      t,
      'ar',
    );

    expect(items.some((item) => item.id === 'exams-missing-results' && item.label.includes('3'))).toBe(
      true,
    );
    expect(items.find((item) => item.id === 'exams-missing-results')?.href).toBe('/admin/exams');
    expect(items.find((item) => item.id === 'draft-results')?.href).toBe('/admin/exam-results');
  });
});
