import { describe, expect, it } from 'vitest';
import {
  buildFeePlanSuggestQuery,
  buildStudentCreateFinancePayload,
  canRequestFeePlanSuggest,
  defaultStudentCreateFinanceFormState,
  financePlanFingerprint,
  mergeFinanceStateWithSuggest,
  selectedFinancePeriods,
} from './student-enrollment-finance';
import { defaultStudentProfileFormState } from './student-profile';
import type { FeePlanSuggestResult } from '@/types/student-enrollment-finance';

const suggest: FeePlanSuggestResult = {
  ok: true,
  fee_plan_id: 123,
  fee_plan_name: 'خطة الأول ابتدائي 2025-2026',
  suggested_periods: [
    {
      period_key: '2025-12',
      label: 'دجنبر 2025',
      due_date: '2025-12-05',
      amount: 1000,
      selected: true,
    },
    {
      period_key: '2026-01',
      label: 'يناير 2026',
      due_date: '2026-01-05',
      amount: 1000,
      selected: true,
    },
  ],
  excluded_periods: [{ period_key: '2025-09', label: 'شتنبر 2025' }],
};

describe('buildFeePlanSuggestQuery', () => {
  it('builds suggest query when enrollment inputs are complete', () => {
    const state = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '2025',
      levelId: '10',
      actualJoinDate: '2025-12-15',
    };
    expect(canRequestFeePlanSuggest({
      schoolId: 1,
      academicYearId: state.academicYearId,
      levelId: state.levelId,
      enrollmentDate: state.actualJoinDate,
    })).toBe(true);
    expect(buildFeePlanSuggestQuery(state, 1)).toEqual({
      school_id: 1,
      academic_year_id: 2025,
      level_id: 10,
      enrollment_date: '2025-12-15',
    });
    expect(financePlanFingerprint(buildFeePlanSuggestQuery(state, 1))).toBe('1:2025:10:2025-12-15');
  });
});

describe('buildStudentCreateFinancePayload', () => {
  it('sends finance without customization', () => {
    const financeState = defaultStudentCreateFinanceFormState(suggest);
    expect(buildStudentCreateFinancePayload(suggest, financeState)).toEqual({
      fee_plan_id: 123,
      customize_plan: false,
    });
  });

  it('sends finance with customization periods and reason', () => {
    const financeState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'late_enrollment' as const,
      customizationNotes: 'ملاحظة',
      periodOverrides: {
        '2025-12': { selected: true, amountOverride: '', dueDateOverride: '' },
        '2026-01': { selected: true, amountOverride: '1000', dueDateOverride: '' },
      },
    };
    expect(buildStudentCreateFinancePayload(suggest, financeState)).toEqual({
      fee_plan_id: 123,
      customize_plan: true,
      customization_reason: 'late_enrollment',
      customization_notes: 'ملاحظة',
      periods: [
        {
          period_key: '2025-12',
          selected: true,
          amount_override: null,
          due_date_override: null,
        },
        {
          period_key: '2026-01',
          selected: true,
          amount_override: 1000,
          due_date_override: null,
        },
      ],
    });
  });
});

describe('mergeFinanceStateWithSuggest', () => {
  it('drops old customization when suggest fingerprint changes', () => {
    const previous = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'scholarship' as const,
      periodOverrides: {
        '2025-12': { selected: false, amountOverride: '500', dueDateOverride: '2025-12-10' },
        '2026-01': { selected: true, amountOverride: '', dueDateOverride: '' },
      },
    };
    const nextSuggest: FeePlanSuggestResult = {
      ...suggest,
      fee_plan_id: 456,
      suggested_periods: [
        {
          period_key: '2026-02',
          label: 'فبراير 2026',
          due_date: '2026-02-05',
          selected: true,
        },
      ],
      excluded_periods: [],
    };
    const merged = mergeFinanceStateWithSuggest(previous, nextSuggest, true);
    expect(merged.customizePlan).toBe(false);
    expect(merged.customizationReason).toBe('');
    expect(merged.periodOverrides).toEqual({
      '2026-02': { selected: true, amountOverride: '', dueDateOverride: '' },
    });
  });
});

describe('selectedFinancePeriods', () => {
  it('respects customized month selection', () => {
    const financeState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      periodOverrides: {
        '2025-12': { selected: true, amountOverride: '', dueDateOverride: '' },
        '2026-01': { selected: false, amountOverride: '', dueDateOverride: '' },
      },
    };
    expect(selectedFinancePeriods(suggest, financeState)).toHaveLength(1);
    expect(selectedFinancePeriods(suggest, financeState)[0].period_key).toBe('2025-12');
  });
});
