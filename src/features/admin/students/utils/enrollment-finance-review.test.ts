import { describe, expect, it } from 'vitest';
import {
  buildEnrollmentFinanceReviewModel,
  listEnrollmentReviewCustomizationItems,
  validateEnrollmentFinanceSave,
} from './enrollment-finance-review';
import { defaultStudentCreateFinanceFormState } from './student-enrollment-finance';
import type { FeePlanSuggestResult, StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';

const suggest: FeePlanSuggestResult = {
  ok: true,
  fee_plan_id: 2461,
  fee_plan_name: 'خطة رسوم الابتدائي 2026-2027',
  suggested_periods: [
    { period_key: '2026-09', label: 'شتنبر 2026', due_date: '2026-09-05', selected: true },
    { period_key: '2026-10', label: 'أكتوبر 2026', due_date: '2026-10-05', selected: true },
  ],
  excluded_periods: [],
  plan_lines: [
    { line_id: 2903, fee_type_name: 'التسجيل', frequency: 'one_time', is_one_time: true, total_amount: 2500 },
    { line_id: 2904, fee_type_name: 'التمدرس', frequency: 'monthly', total_amount: 2000 },
  ],
  financial_summary: {
    one_time_total: 2500,
    suggested_monthly_total: 2000,
    monthly_installment_amount: 200,
    expected_total: 4500,
  },
};

describe('buildEnrollmentFinanceReviewModel', () => {
  it('shows selected plan and preview totals when customized', () => {
    const financeState: StudentCreateFinanceFormState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship',
      lineDiscounts: {
        ...defaultStudentCreateFinanceFormState(suggest).lineDiscounts,
        '2904': {
          enabled: true,
          type: 'percent' as const,
          value: '10',
          reason: 'scholarship' as const,
        },
      },
    };
    const model = buildEnrollmentFinanceReviewModel(suggest, financeState, {
      original_total: 4500,
      discount_total: 200,
      final_total: 4300,
      monthly_due_total: 180,
    });
    expect(model.planName).toBe('خطة رسوم الابتدائي 2026-2027');
    expect(model.originalTotal).toBe(4500);
    expect(model.discountTotal).toBe(200);
    expect(model.finalTotal).toBe(4300);
    expect(model.monthlyInstallment).toBe(180);
    expect(model.summaryRows.some((row) => row.key === 'one_time_total')).toBe(true);
  });

  it('uses financial_summary when customization is off', () => {
    const financeState = defaultStudentCreateFinanceFormState(suggest);
    const model = buildEnrollmentFinanceReviewModel(suggest, financeState, null);
    expect(model.customized).toBe(false);
    expect(model.finalTotal).toBe(4500);
    expect(model.originalTotal).toBeNull();
    expect(model.discountTotal).toBeNull();
    expect(model.customizationItems).toEqual([]);
  });
});

describe('listEnrollmentReviewCustomizationItems', () => {
  it('lists line discounts, one-time exclusions, and period changes', () => {
    const financeState: StudentCreateFinanceFormState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship',
      lineDiscounts: {
        ...defaultStudentCreateFinanceFormState(suggest).lineDiscounts,
        '2904': {
          enabled: true,
          type: 'percent' as const,
          value: '10',
          reason: 'scholarship' as const,
        },
      },
      oneTimeLines: {
        '2903': { selected: false, amountOverride: '', dueDateOverride: '' },
      },
      periodOverrides: {
        '2026-09': { selected: true, amountOverride: '150', dueDateOverride: '' },
        '2026-10': { selected: false, amountOverride: '', dueDateOverride: '' },
      },
    };
    const items = listEnrollmentReviewCustomizationItems(suggest, financeState);
    expect(items.some((item) => item.kind === 'line_discount')).toBe(true);
    expect(items.some((item) => item.kind === 'one_time_excluded')).toBe(true);
    expect(items.some((item) => item.kind === 'period_modified')).toBe(true);
    expect(items.some((item) => item.kind === 'period_excluded')).toBe(true);
  });
});

describe('validateEnrollmentFinanceSave', () => {
  it('blocks save when preview has an error', () => {
    expect(
      validateEnrollmentFinanceSave({
        customizePlan: true,
        customizationReason: 'scholarship',
        previewLoading: false,
        previewError: 'reason required',
        preview: null,
      }),
    ).toBe('preview_error');
  });

  it('blocks save while preview is loading', () => {
    expect(
      validateEnrollmentFinanceSave({
        customizePlan: true,
        customizationReason: 'scholarship',
        previewLoading: true,
        previewError: null,
        preview: null,
      }),
    ).toBe('preview_loading');
  });

  it('allows save without customization', () => {
    expect(
      validateEnrollmentFinanceSave({
        customizePlan: false,
        customizationReason: '',
        previewLoading: false,
        previewError: null,
        preview: null,
      }),
    ).toBe('ok');
  });
});
