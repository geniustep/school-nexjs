// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { InstallmentsAnalyticsWorkspace } from './installments-analytics-workspace';
import type { FinanceInstallmentServiceFacet } from '@/types/finance';

const facets: FinanceInstallmentServiceFacet[] = [
  {
    service_id: 1,
    service_name: 'التمدرس',
    count: 20,
    beneficiary_count: 10,
    total_amount: 2000,
    total_paid: 1200,
    total_remaining: 800,
    total_expected: 500,
    total_overdue: 300,
    average_due_per_beneficiary: 200,
    average_overdue_per_beneficiary: 30,
    collection_rate: 60,
  },
  {
    service_id: 2,
    service_name: 'النقل المدرسي',
    count: 8,
    beneficiary_count: 4,
    total_amount: 800,
    total_paid: 320,
    total_remaining: 480,
    total_expected: 280,
    total_overdue: 200,
    average_due_per_beneficiary: 200,
    average_overdue_per_beneficiary: 50,
    collection_rate: 40,
  },
];

afterEach(cleanup);

function renderWorkspace(overrides?: Partial<React.ComponentProps<typeof InstallmentsAnalyticsWorkspace>>) {
  const props: React.ComponentProps<typeof InstallmentsAnalyticsWorkspace> = {
    summary: {
      total_count: 28,
      beneficiary_count: 14,
      total_amount: 2800,
      total_paid: 1520,
      total_remaining: 1280,
      total_expected: 780,
      total_overdue: 500,
      collection_rate: 54.3,
      average_due_per_beneficiary: 200,
    },
    serviceFacets: facets,
    timeline: [],
    attention: { due_next_7_days: { count: 3, amount: 450 } },
    selectedServiceId: '',
    resultCount: 28,
    onSelectService: vi.fn(),
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
    const onSelectService = vi.fn();
    renderWorkspace({ onSelectService });

    await userEvent.click(screen.getByRole('button', { name: 'عرض تفاصيل خدمة النقل المدرسي' }));

    expect(onSelectService).toHaveBeenCalledWith(2);
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
    renderWorkspace({ selectedServiceId: '2' });

    expect(screen.getByText('الخدمة المحددة')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'النقل المدرسي' })).toBeTruthy();
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
  });
});
