// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { readExecutiveFinanceV2 } from '@/lib/admin/executive-finance-v2-contract';
import { ExecutiveFinanceV2Panel } from './executive-finance-v2-panel';

afterEach(cleanup);
function fixture() {
  const metric = (amount: number) => ({ available: true, amount });
  return readExecutiveFinanceV2({
    version: 'executive-finance-v2', source: 'odoo.executive_finance_v2',
    meta: { period: { scope: 'current_month', date_from: '2026-10-01', date_to: '2026-10-19' }, currency: { name: 'MAD' } },
    indicators: { period_net_due: metric(1200), period_actual_collections: metric(0),
      due_cohort_performance: { available: true, due_amount: 1200, recognized_collected_amount: 400, remaining_on_due_cohort: 800, collection_rate: 33.33 },
      remaining_balance: metric(800), overdue_outstanding: metric(300), overdue_billing_accounts_count: { available: true, count: 2 } },
    unavailable_metrics: { paid_expenses: { available: false, reason_code: 'expense_payment_cycle_not_implemented' } },
  })!;
}
function show(data = fixture(), onScopeChange = vi.fn(), locale: 'ar' | 'fr' = 'ar') {
  return render(<LocaleProvider><ExecutiveFinanceV2Panel data={data} locale={locale} layout="director" selectedScope="current_month" onScopeChange={onScopeChange} /></LocaleProvider>);
}

describe('approved director finance layout', () => {
  it('keeps genuine cash zero separate from due-cohort collections and current stock', () => {
    show();
    const cash = screen.getByText('التحصيلات الفعلية').parentElement!;
    expect(cash.querySelector('bdi')?.textContent).toMatch(/0/);
    expect(cash.textContent).not.toContain('غير متاح');
    const cohort = screen.getByText('المحصّل من مستحقات الفترة').parentElement!;
    expect(cohort.textContent).toMatch(/33[.,]33/);
    expect(screen.getByText('الرصيد المتبقي')).toBeTruthy();
    expect(screen.getAllByLabelText('الوضع المالي الحالي').length).toBe(1);
    expect(screen.queryByText('paid_expenses')).toBeNull();
  });
  it('renders unavailable cash as unavailable instead of manufacturing a zero', () => {
    const data = fixture();
    data.indicators!.period_actual_collections = { available: false, amount: null, reason_code: 'metric_unavailable' };
    show(data);
    const cash = screen.getByText('التحصيلات الفعلية').parentElement!;
    expect(cash.textContent).toContain('غير متاح');
    expect(cash.querySelector('bdi')).toBeNull();
  });
  it('forwards the selected period without performing any mutation', () => {
    const callback = vi.fn(); show(fixture(), callback);
    fireEvent.click(screen.getByRole('button', { name: 'الموسم الدراسي' }));
    expect(callback).toHaveBeenCalledExactlyOnceWith('academic_year');
    expect(screen.getByRole('button', { name: 'الشهر الجاري' }).getAttribute('aria-pressed')).toBe('true');
  });
  it('preserves the unavailable-period state and French labels', () => {
    const data = fixture(); data.meta.period.available = false; data.meta.period.reason_code = 'academic_year_not_started';
    show(data, vi.fn(), 'fr');
    expect(screen.getByRole('button', { name: 'Année scolaire' })).toBeTruthy();
    expect(screen.queryByText('Encaissements réels')).toBeNull();
    expect(screen.getByRole('status').textContent).toBe('Période indisponible');
  });
  it('keeps historical current-stock comparisons out of the director layout', () => {
    const data = fixture(); data.comparison_previous_period = { available: false, reason_code: 'historical_stock_snapshot_not_available', period: null, indicators: null };
    show(data);
    expect(screen.getByRole('status').textContent).toContain('لا توجد أرصدة تاريخية موثوقة');
    expect(screen.getByText('المتأخرات الحالية').parentElement!.textContent).not.toContain('الفترة المقارنة');
  });
});
