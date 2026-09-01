import { describe, expect, it } from 'vitest';
import { normalizeFeePlanSuggestResponse } from './normalize-fee-plan-suggest';
import {
  buildFeePlanSuggestQuery,
  buildEnrollmentPlanPreviewBody,
  buildStudentCreateFinancePayload,
  defaultStudentCreateFinanceFormState,
  financePlanFingerprint,
} from './student-enrollment-finance';
import { defaultStudentProfileFormState } from './student-profile';
import type { StudentCreateFinanceFormState } from '@/types/student-enrollment-finance';

const suggestPayload = {
  ok: true,
  plan: { id: 2461, name: 'خطة رسوم الابتدائي 2026-2027', is_default_for_level: true },
  eligible_plans: [
    { id: 2461, name: 'خطة رسوم الابتدائي 2026-2027', is_default_for_level: true, is_selected: true },
    { id: 2967, name: 'نسخة من خطة رسوم الابتدائي 2026-2027', is_default_for_level: false },
  ],
  plan_lines: [
    {
      line_id: 2903,
      fee_type_name: 'التسجيل',
      frequency: 'one_time',
      total_amount: 2500,
      pricing_mode: 'total_amount_installments',
    },
    {
      line_id: 2904,
      fee_type_name: 'التمدرس',
      frequency: 'monthly',
      total_amount: 2000,
      installment_amount: 200,
      installment_count: 10,
      pricing_mode: 'total_amount_installments',
    },
  ],
  financial_summary: {
    currency: 'MAD',
    one_time_total: 2500,
    suggested_monthly_total: 2000,
    monthly_installment_amount: 200,
    expected_total: 4500,
  },
  suggested_periods: [
    { period_key: '2026-09', label: 'شتنبر 2026', due_date: '2026-09-05', selected: true },
  ],
  excluded_periods: [],
  customization_contract: {
    one_time_lines: [{ line_id: 2903, selected: true }],
    supports_plan_discount: true,
    supports_line_discount: true,
  },
  allowed_actions: { customize_plan: true, select_other_plan: true },
};

describe('normalizeFeePlanSuggestResponse enrollment contract', () => {
  it('reads eligible plans, lines, summary, and customization contract', () => {
    const normalized = normalizeFeePlanSuggestResponse(suggestPayload);
    expect(normalized?.eligible_plans).toHaveLength(2);
    expect(normalized?.plan_lines).toHaveLength(2);
    expect(normalized?.financial_summary?.expected_total).toBe(4500);
    expect(normalized?.customization_contract?.supports_line_discount).toBe(true);
  });
});

describe('buildFeePlanSuggestQuery canonical Base Plan', () => {
  it('ignores a legacy alternate-plan id and keeps resolver inputs canonical', () => {
    const state = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '1',
      levelId: '2446',
      actualJoinDate: '2026-06-19',
    };
    const query = buildFeePlanSuggestQuery(state, 3, 2967);
    expect(query?.fee_plan_id).toBeUndefined();
    expect(financePlanFingerprint(query)).toBe('3:1:2446:2026-06-19');
  });
});

describe('defaultStudentCreateFinanceFormState', () => {
  it('initializes one-time lines and line discounts from suggest', () => {
    const suggest = normalizeFeePlanSuggestResponse(suggestPayload);
    const state = defaultStudentCreateFinanceFormState(suggest);
    expect(state.selectedFeePlanId).toBe(2461);
    expect(state.oneTimeLines['2903']?.selected).toBe(true);
    expect(state.lineDiscounts['2904']).toBeDefined();
  });
});

describe('buildEnrollmentPlanPreviewBody', () => {
  it('matches save payload shape for preview', () => {
    const suggest = normalizeFeePlanSuggestResponse(suggestPayload);
    const financeState: StudentCreateFinanceFormState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship',
      lineDiscounts: {
        ...defaultStudentCreateFinanceFormState(suggest).lineDiscounts,
        '2904': {
          enabled: true,
          type: 'percent',
          value: '10',
          reason: '',
        },
      },
    };
    const profile = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '1',
      levelId: '2446',
      actualJoinDate: '2026-06-19',
    };
    const body = buildEnrollmentPlanPreviewBody(profile, 3, suggest!, financeState);
    expect(body.fee_plan_id).toBe(2461);
    expect(body.customize_plan).toBe(true);
    expect(body.discounts).toEqual([
      { scope: 'line', line_id: 2904, type: 'percent', value: 10, reason: 'scholarship' },
    ]);
    expect(buildStudentCreateFinancePayload(suggest!, financeState)).toMatchObject({
      fee_plan_id: 2461,
      customize_plan: true,
      discounts: body.discounts,
    });
  });

  it('preview and save payloads share normalized percent discount values', () => {
    const suggest = normalizeFeePlanSuggestResponse(suggestPayload);
    const financeState: StudentCreateFinanceFormState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship',
      lineDiscounts: {
        ...defaultStudentCreateFinanceFormState(suggest).lineDiscounts,
        '2904': {
          enabled: true,
          type: 'percent',
          value: '39.98',
          reason: 'scholarship',
        },
      },
    };
    const profile = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '1',
      levelId: '2446',
      actualJoinDate: '2026-09-05',
    };
    const previewBody = buildEnrollmentPlanPreviewBody(profile, 3, suggest!, financeState);
    const savePayload = buildStudentCreateFinancePayload(suggest!, financeState);
    expect(previewBody.discounts).toEqual(savePayload.discounts);
    expect(previewBody.discounts).toEqual([
      { scope: 'line', line_id: 2904, type: 'percent', value: 40, reason: 'scholarship' },
    ]);
  });
});
