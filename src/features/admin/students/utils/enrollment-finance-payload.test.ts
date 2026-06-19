import { describe, expect, it } from 'vitest';
import {
  buildFinancePeriodPayloads,
  buildStudentCreateFinancePayload,
  emptyFinanceDiscountState,
  ensureFinancePeriodOverrides,
  enrollmentPlanLineAmountParts,
  enrollmentPlanLinePricingModeKey,
  financialSummaryRows,
  formatCustomizationReason,
  hasValidCustomizedFinancePeriods,
  resolveDiscountReason,
} from './enrollment-finance-payload';
import type {
  EnrollmentPlanLine,
  StudentCreateFinanceFormState,
} from '@/types/student-enrollment-finance';

const periods = [
  { period_key: '2026-09', label: 'شتنبر', due_date: '2026-09-05', selected: true },
  { period_key: '2026-10', label: 'أكتوبر', due_date: '2026-10-05', selected: true },
];

const planLines: EnrollmentPlanLine[] = [
  {
    line_id: 2903,
    fee_type_name: 'التسجيل',
    frequency: 'one_time',
    is_one_time: true,
    total_amount: 2500,
    pricing_mode: 'total_amount_installments',
  },
  {
    line_id: 2904,
    fee_type_name: 'التمدرس',
    frequency: 'monthly',
    pricing_mode: 'total_amount_installments',
    total_amount: 2000,
    installment_amount: 200,
    installment_count: 10,
  },
  {
    line_id: 3671,
    fee_type_name: 'النقل',
    frequency: 'monthly',
    pricing_mode: 'recurring_unit_price',
    amount: 400,
    total_amount: 4000,
    installment_amount: 400,
    installment_count: 10,
  },
];

describe('enrollmentPlanLinePricingModeKey', () => {
  it('maps backend pricing modes to labels', () => {
    expect(enrollmentPlanLinePricingModeKey(planLines[0])).toContain('one_time');
    expect(enrollmentPlanLinePricingModeKey(planLines[1])).toContain('total_amount_installments');
    expect(enrollmentPlanLinePricingModeKey(planLines[2])).toContain('recurring_unit_price');
  });
});

describe('enrollmentPlanLineAmountParts', () => {
  it('uses backend totals without inventing monthly tuition', () => {
    const schooling = enrollmentPlanLineAmountParts(planLines[1]);
    expect(schooling.primary).toBe(2000);
    expect(schooling.installmentAmount).toBe(200);
    expect(schooling.installmentCount).toBe(10);
  });
});

describe('financialSummaryRows', () => {
  it('splits installment and recurring totals from plan lines', () => {
    const rows = financialSummaryRows(
      {
        one_time_total: 2500,
        monthly_installment_amount: 600,
        expected_total: 8500,
      },
      planLines,
    );
    expect(rows.find((row) => row.key === 'installment_total')?.value).toBe(2000);
    expect(rows.find((row) => row.key === 'recurring_periodic_total')?.value).toBe(4000);
    expect(rows.find((row) => row.key === 'expected_total')?.value).toBe(8500);
  });
});

describe('buildStudentCreateFinancePayload', () => {
  const baseState: StudentCreateFinanceFormState = {
    selectedFeePlanId: 2461,
    customizePlan: true,
    customizationReason: 'scholarship',
    customizationNotes: '',
    periodOverrides: {
      '2026-09': { selected: true, amountOverride: '', dueDateOverride: '' },
      '2026-10': { selected: true, amountOverride: '', dueDateOverride: '' },
    },
    planDiscount: emptyFinanceDiscountState(),
    lineDiscounts: {
      '2904': {
        enabled: true,
        type: 'percent',
        value: '10',
        reason: 'scholarship',
      },
    },
    oneTimeLines: {
      '2903': { selected: true, amountOverride: '', dueDateOverride: '2026-09-05' },
    },
  };

  it('includes percent line discount in payload', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, baseState);
    expect(payload).toMatchObject({
      fee_plan_id: 2461,
      customize_plan: true,
      customization_reason: 'scholarship',
      discounts: [
        {
          scope: 'line',
          line_id: 2904,
          type: 'percent',
          value: 10,
          reason: 'scholarship',
        },
      ],
      one_time_lines: [
        {
          line_id: 2903,
          selected: true,
          amount_override: null,
          due_date_override: '2026-09-05',
        },
      ],
      periods: [
        { period_key: '2026-09', selected: true, amount_override: null, due_date_override: null },
        { period_key: '2026-10', selected: true, amount_override: null, due_date_override: null },
      ],
    });
  });

  it('inherits general customization reason for line discounts without line-specific reason', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      lineDiscounts: {
        '2904': {
          enabled: true,
          type: 'percent',
          value: '50',
          reason: '',
        },
      },
    });
    expect(payload.discounts).toEqual([
      {
        scope: 'line',
        line_id: 2904,
        type: 'percent',
        value: 50,
        reason: 'scholarship',
      },
    ]);
  });

  it('prefers line-specific discount reason when provided', () => {
    expect(
      resolveDiscountReason('family_agreement', 'special_discount'),
    ).toBe('family_agreement');
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      customizationReason: 'special_discount',
      lineDiscounts: {
        '2904': {
          enabled: true,
          type: 'percent',
          value: '50',
          reason: 'family_agreement',
        },
      },
    });
    expect(payload.discounts?.[0]?.reason).toBe('family_agreement');
  });

  it('formats customization reason keys for display', () => {
    const t = (key: string) =>
      key === 'admin.student360.create.finance.reasons.special_discount'
        ? 'تخفيض خاص'
        : key;
    expect(formatCustomizationReason('special_discount', t)).toBe('تخفيض خاص');
  });

  it('includes fixed_amount discount on registration line', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      lineDiscounts: {
        '2903': {
          enabled: true,
          type: 'fixed_amount',
          value: '500',
          reason: 'family_agreement',
        },
      },
    });
    expect(payload.discounts).toEqual([
      {
        scope: 'line',
        line_id: 2903,
        type: 'fixed_amount',
        value: 500,
        reason: 'family_agreement',
      },
    ]);
  });

  it('sends minimal payload when customization is off', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      customizePlan: false,
    });
    expect(payload).toEqual({
      fee_plan_id: 2461,
      customize_plan: false,
    });
    expect(payload.periods).toBeUndefined();
  });

  it('includes default periods when customize is on without user month edits', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      selectedFeePlanId: 2461,
      customizePlan: true,
      customizationReason: 'special_discount',
      customizationNotes: '',
      periodOverrides: {},
      planDiscount: emptyFinanceDiscountState(),
      lineDiscounts: {
        '2904': {
          enabled: true,
          type: 'percent',
          value: '50',
          reason: '',
        },
      },
      oneTimeLines: {},
    });
    expect(payload.periods).toEqual([
      {
        period_key: '2026-09',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
      {
        period_key: '2026-10',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
    ]);
    expect(payload.discounts?.[0]?.reason).toBe('special_discount');
  });

  it('keeps one-time line customization with valid periods', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      customizePlan: true,
      customizationReason: 'family_agreement',
      periodOverrides: {},
      lineDiscounts: {},
      oneTimeLines: {
        '2903': { selected: true, amountOverride: '2400', dueDateOverride: '2026-09-12' },
      },
    });
    expect(payload.periods).toHaveLength(2);
    expect(payload.one_time_lines?.[0]).toMatchObject({
      line_id: 2903,
      amount_override: 2400,
      due_date_override: '2026-09-12',
    });
  });

  it('preserves deselected month and due date override from UI state', () => {
    const payload = buildStudentCreateFinancePayload(2461, periods, {
      ...baseState,
      customizePlan: true,
      periodOverrides: {
        '2026-09': { selected: false, amountOverride: '', dueDateOverride: '' },
        '2026-10': { selected: true, amountOverride: '', dueDateOverride: '2026-10-12' },
      },
    });
    expect(payload.periods).toEqual([
      {
        period_key: '2026-09',
        selected: false,
        amount_override: null,
        due_date_override: null,
      },
      {
        period_key: '2026-10',
        selected: true,
        amount_override: null,
        due_date_override: '2026-10-12',
      },
    ]);
  });

  it('ensureFinancePeriodOverrides fills missing keys from suggested periods', () => {
    expect(
      ensureFinancePeriodOverrides(periods, {
        '2026-10': { selected: true, amountOverride: '100', dueDateOverride: '2026-10-01' },
      }),
    ).toEqual({
      '2026-09': { selected: true, amountOverride: '', dueDateOverride: '' },
      '2026-10': { selected: true, amountOverride: '100', dueDateOverride: '2026-10-01' },
    });
  });

  it('hasValidCustomizedFinancePeriods rejects empty suggested periods', () => {
    expect(hasValidCustomizedFinancePeriods([], {})).toBe(false);
    expect(
      hasValidCustomizedFinancePeriods(periods, {
        '2026-09': { selected: false, amountOverride: '', dueDateOverride: '' },
        '2026-10': { selected: false, amountOverride: '', dueDateOverride: '' },
      }),
    ).toBe(false);
    expect(hasValidCustomizedFinancePeriods(periods, {})).toBe(true);
  });

  it('buildFinancePeriodPayloads matches expected default shape', () => {
    expect(buildFinancePeriodPayloads(periods, {})).toEqual([
      {
        period_key: '2026-09',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
      {
        period_key: '2026-10',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
    ]);
  });
});
