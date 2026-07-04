import { describe, expect, it } from 'vitest';
import { translate } from '@/lib/i18n/messages';
import { formatDashboardAlertPlural } from '@/lib/admin/dashboard-alert-plural';
import {
  buildRegistryDashboardAlert,
  dedupeDashboardAlertItems,
  DASHBOARD_ALERT_REGISTRY,
} from '@/lib/admin/dashboard-alert-registry';
import { mergeExecutiveInterventions, normalizeExecutiveDashboard } from '@/lib/admin/executive-dashboard-contract';

const t = (key: string, params?: Record<string, string | number>) => translate('ar', key, params);

describe('dashboard alert pluralization', () => {
  it.each([
    [0, 'لا توجد حسابات تحتاج اتصال تحصيل'],
    [1, 'حساب واحد يحتاج اتصال تحصيل'],
    [2, 'حسابان يحتاجان اتصال تحصيل'],
    [5, '5 حسابات تحتاج اتصال تحصيل'],
    [11, '11 حسابًا تحتاج اتصال تحصيل'],
    [18, '18 حسابًا تحتاج اتصال تحصيل'],
  ])('billing account follow-up for count=%i', (count, expected) => {
    expect(formatDashboardAlertPlural(t, 'ar', 'billingAccountFollowup', count)).toBe(expected);
    expect(expected).not.toMatch(/\(ات\)|\(أقسام\)|\(تلاميذ\)/);
  });

  it.each([
    [1, 'طلب واحد يحتاج متابعة'],
    [4, '4 طلبات تحتاج متابعة'],
    [20, '20 طلبًا يحتاج متابعة'],
  ])('admission overdue for count=%i', (count, expected) => {
    expect(formatDashboardAlertPlural(t, 'ar', 'admissionOverdue', count)).toBe(expected);
  });

  it.each([
    [1, 'قسم واحد بدون حضور مسجّل اليوم'],
    [10, '10 أقسام بدون حضور مسجّل اليوم'],
  ])('class missing attendance for count=%i', (count, expected) => {
    expect(formatDashboardAlertPlural(t, 'ar', 'classMissingAttendance', count)).toBe(expected);
  });

  it.each([
    [1, 'تلميذ واحد بدون ولي مرتبط'],
    [68, '68 تلميذًا بدون ولي مرتبط'],
  ])('student missing guardian for count=%i', (count, expected) => {
    expect(formatDashboardAlertPlural(t, 'ar', 'studentMissingGuardian', count)).toBe(expected);
  });
});

describe('dashboard alert deduplication', () => {
  it('keeps specific finance follow-up over generic overdue follow-up', () => {
    const executive = normalizeExecutiveDashboard({
      finance_summary: {
        currency: 'MAD',
        collected_today: 0,
        collected_month: 0,
        remaining: 0,
        overdue: 100,
        families_overdue_count: 18,
        promises_due_soon_count: 0,
        source: 'billing',
      },
      important_alerts: [
        {
          type: 'finance',
          code: 'overdue_followup_needed',
          message: 'متأخرات مالية تحتاج متابعة',
          href: '/admin/finance',
          severity: 'warning',
        },
        {
          type: 'finance',
          code: 'families_overdue',
          message: '18 حساب(ات) تحتاج اتصال',
          href: '/admin/finance',
          severity: 'warning',
        },
      ],
    });

    const items = mergeExecutiveInterventions(executive, t);
    const financeFamilyItems = items.filter((item) =>
      ['overdue_followup_needed', 'families_overdue', 'finance-families-overdue', 'finance-overdue'].includes(
        item.id,
      ),
    );

    expect(financeFamilyItems.some((item) => item.id === 'overdue_followup_needed')).toBe(false);
    expect(financeFamilyItems.some((item) => item.id === 'families_overdue')).toBe(true);
    expect(financeFamilyItems.some((item) => item.label.includes('18 حساب'))).toBe(true);
    expect(financeFamilyItems.some((item) => item.label.includes('(ات)'))).toBe(false);
  });

  it('keeps specific attendance alert over generic attendance message', () => {
    const executive = normalizeExecutiveDashboard({
      attendance_gaps: {
        classes_without_attendance_count: 10,
        absent_today_count: 0,
        late_today_count: 0,
        attendance_rate_today: 0,
      },
      important_alerts: [
        {
          type: 'attendance',
          code: 'classes_missing_attendance_today',
          message: 'أقسام لم تسجل حضورها اليوم',
          href: '/admin/attendance',
          severity: 'warning',
        },
      ],
    });

    const items = mergeExecutiveInterventions(executive, t);
    expect(items.some((item) => item.id === 'attendance-classes-missing')).toBe(true);
    expect(items.some((item) => item.label === '10 أقسام بدون حضور مسجّل اليوم')).toBe(true);
    expect(items.some((item) => item.id === 'classes_missing_attendance_today')).toBe(false);
  });

  it('keeps distinct finance problems when functionally different', () => {
    const items = dedupeDashboardAlertItems([
      buildRegistryDashboardAlert('finance-overdue', t, 'ar', { icon: '💰' })!,
      buildRegistryDashboardAlert('finance-families-overdue', t, 'ar', { count: 3, icon: '📞' })!,
    ]);

    expect(items).toHaveLength(2);
  });
});

describe('dashboard alert deep links', () => {
  it.each([
    ['finance-families-overdue', '/admin/finance/billing-accounts?has_overdue=true'],
    ['finance-overdue', '/admin/finance/installments?quick=overdue_unpaid'],
    ['attendance-classes-missing', '/admin/attendance?date=today'],
    ['dq-missing-guardian', '/admin/students'],
    ['admissions-overdue', '/admin/admissions'],
  ])('%s links to proven route', (code, href) => {
    expect(DASHBOARD_ALERT_REGISTRY[code as keyof typeof DASHBOARD_ALERT_REGISTRY].href).toBe(href);
  });
});
