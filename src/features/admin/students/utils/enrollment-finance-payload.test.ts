import { describe, expect, it } from 'vitest';
import {
  buildStudentCreateFinancePayload,
  emptyFinanceDiscountState,
  enrollmentPlanLineAmountParts,
  enrollmentPlanLinePricingModeKey,
  financialSummaryRows,
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
  });
});
