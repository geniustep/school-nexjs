import { describe, expect, it } from 'vitest';
import {
  buildDashboardActionItems,
  buildImportantAlertItems,
} from '@/features/admin/dashboard/dashboard-interventions';
import { parseDashboardAlertItem } from '@/features/admin/dashboard/dashboard-alert-text';
import type { AdminDashboard } from '@/types/dashboard';

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
    const items = buildImportantAlertItems(dashboard({ important_alerts: ['توجد متأخرات'] }), 'ar');
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
      (key) => key,
      'ar',
    );
    expect(items.some((item) => item.label.includes('[object Object]'))).toBe(false);
    expect(items[0]?.label).toBe('متابعة المتأخرات مطلوبة');
    expect(items[0]?.id).toBe('overdue_followup_needed');
  });
});
