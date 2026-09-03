// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { InstallmentsAnalyticsWorkspace } from './installments-analytics-workspace';
import type {
  FinanceInstallmentServiceFacet,
  FinanceInstallmentTimelinePoint,
} from '@/types/finance';

const facets: FinanceInstallmentServiceFacet[] = [
  {
    service_id: 1,
    service_name: 'التمدرس',
    count: 20,
    beneficiary_count: 10,
    student_count: 12,
    total_amount: 2000,
    total_paid: 1200,
    total_remaining: 800,
    total_expected: 500,
    total_overdue: 300,
    average_due_per_beneficiary: 200,
    average_overdue_per_beneficiary: 30,
    average_amount_per_student: 166.67,
    collection_rate: 60,
  },
  {
    service_id: 2,
    service_name: 'النقل المدرسي',
    count: 8,
    beneficiary_count: 4,
    student_count: 5,
    total_amount: 800,
    total_paid: 320,
    total_remaining: 480,
    total_expected: 280,
    total_overdue: 200,
    average_due_per_beneficiary: 200,
    average_overdue_per_beneficiary: 50,
    average_amount_per_student: 160,
    collection_rate: 40,
  },
];

const timeline: FinanceInstallmentTimelinePoint[] = [
  {
    period: '2026-09',
    installment_count: 12,
    total_amount: 1200,
    total_paid: 500,
    total_remaining: 700,
    total_expected: 500,
    total_overdue: 200,
    collection_rate: 41.67,
  },
];

afterEach(cleanup);

function renderWorkspace(overrides?: Partial<React.ComponentProps<typeof InstallmentsAnalyticsWorkspace>>) {
  const props: React.ComponentProps<typeof InstallmentsAnalyticsWorkspace> = {
    summary: {
      total_count: 28,
      beneficiary_count: 14,
      student_count: 17,
      total_amount: 2800,
      total_paid: 1520,
      total_remaining: 1280,
      total_expected: 780,
      total_overdue: 500,
      collection_rate: 54.3,
      average_due_per_beneficiary: 200,
      average_amount_per_student: 164.71,
    },
    serviceFacets: facets,
    timeline: [],
    attention: { due_next_7_days: { count: 3, amount: 450 } },
    selectedServiceIds: [],
    resultCount: 28,
    onToggleService: vi.fn(),
    onClearServices: vi.fn(),
    onFocusService: vi.fn(),
    onQuickFilter: vi.fn(),
    onOpenServiceOverdue: vi.fn(),
    ...overrides,
  };

  return {
    props,
    ...render(
      <LocaleProvider>
        <InstallmentsAnalyticsWorkspace {...props} />
      </LocaleProvider>,
    ),
  };
}

describe('InstallmentsAnalyticsWorkspace', () => {
  it('selects a service from the performance map', async () => {
    const onToggleService = vi.fn();
    renderWorkspace({ onToggleService });

    await userEvent.click(screen.getByRole('button', { name: 'إضافة أو إزالة خدمة النقل المدرسي من المقارنة' }));

    expect(onToggleService).toHaveBeenCalledWith(2);
  });

  it('shows the authoritative per-student average in every service row and the total row', () => {
    const { container } = renderWorkspace();

    const serviceRows = container.querySelectorAll('.installments-service-performance__row');
    expect(serviceRows).toHaveLength(2);
    expect(serviceRows[0]?.querySelector('.installments-service-performance__students')?.textContent).toContain('12');
    expect(serviceRows[0]?.querySelector('.installments-service-performance__average')?.textContent).toContain('166');
    expect(serviceRows[1]?.querySelector('.installments-service-performance__students')?.textContent).toContain('5');
    expect(serviceRows[1]?.querySelector('.installments-service-performance__average')?.textContent).toContain('160');

    const totalRow = screen.getByLabelText('مجموع النطاق الحالي');
    expect(totalRow.textContent).toContain('17');
    expect(totalRow.querySelector('.installments-service-performance__average')?.textContent).toContain('164');
    expect(totalRow.textContent).toContain('المتوسط العام محسوب من إجمالي المبالغ وعدد التلاميذ الفريدين.');
  });

  it('opens the highest-overdue service through one combined action', async () => {
    const onOpenServiceOverdue = vi.fn();
    const onQuickFilter = vi.fn();
    renderWorkspace({ onOpenServiceOverdue, onQuickFilter });

    await userEvent.click(screen.getByRole('button', { name: 'عرض المتأخرات' }));

    expect(onOpenServiceOverdue).toHaveBeenCalledWith(1);
    expect(onQuickFilter).not.toHaveBeenCalled();
  });

  it('shows selected-service beneficiary averages and collection rate', () => {
    renderWorkspace({ selectedServiceIds: [2], timeline });

    expect(screen.getByText('الخدمة المحددة')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'النقل المدرسي' })).toBeTruthy();
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
    const servicesSection = screen.getByRole('heading', {
      name: 'أداء المستحقات حسب الخدمة',
    }).closest('section');
    expect(servicesSection?.querySelector('.installments-timeline')).toBeTruthy();
    expect(servicesSection?.textContent).toContain('التحصيل حسب شهر الاستحقاق');
    expect(servicesSection?.textContent).toContain('النقل المدرسي');
  });

  it('shows a combined authoritative scope when multiple services are selected', () => {
    renderWorkspace({ selectedServiceIds: [1, 2], timeline });

    expect(screen.getByRole('button', {
      name: 'إضافة أو إزالة خدمة التمدرس من المقارنة',
    }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', {
      name: 'إضافة أو إزالة خدمة النقل المدرسي من المقارنة',
    }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: '2 خدمات محددة' })).toBeTruthy();
    expect(screen.getAllByText('التمدرس').length).toBeGreaterThan(0);
    expect(screen.getAllByText('النقل المدرسي').length).toBeGreaterThan(0);
    expect(screen.getByText('تعرض المؤشرات والفترة وقائمة الأقساط النطاق الموحد للخدمات المحددة.')).toBeTruthy();
    expect(screen.getAllByText('2 خدمات محددة').length).toBeGreaterThan(1);
  });
});
