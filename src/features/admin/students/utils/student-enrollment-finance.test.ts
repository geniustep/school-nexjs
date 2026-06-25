import { describe, expect, it } from 'vitest';
import {
  buildFeePlanSuggestQuery,
  buildFeePlanSuggestErrorFromApi,
  buildEnrollmentPlanPreviewBody,
  buildStudentCreateFinancePayload,
  candidatePlanLevelNames,
  candidatePlanScopeSummary,
  candidatePlanTotal,
  canRequestFeePlanSuggest,
  defaultStudentCreateFinanceFormState,
  financePlanFingerprint,
  getFeePlanSuggestPendingReason,
  hasNoEligibleFeePlan,
  isCandidateSelectable,
  mergeFinanceStateWithSuggest,
  resolveFeePlanSuggestEmptyMessage,
  resolveNoDefaultFeePlanMessage,
  resolveSelectableCandidatePlans,
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

  it('returns null before level is selected', () => {
    const state = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '1',
      actualJoinDate: '2026-12-15',
    };
    expect(buildFeePlanSuggestQuery(state, 3)).toBeNull();
    expect(getFeePlanSuggestPendingReason({
      schoolId: 3,
      academicYearId: state.academicYearId,
      levelId: state.levelId,
      enrollmentDate: state.actualJoinDate,
    })).toBe('level');
  });

  it('blocks suggest until actual join date is set', () => {
    const state = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '1',
      levelId: '10',
      actualJoinDate: '',
    };
    expect(buildFeePlanSuggestQuery(state, 3)).toBeNull();
    expect(getFeePlanSuggestPendingReason({
      schoolId: 3,
      academicYearId: state.academicYearId,
      levelId: state.levelId,
      enrollmentDate: state.actualJoinDate,
    })).toBe('join_date');
    expect(
      resolveFeePlanSuggestEmptyMessage('join_date', (key) =>
        key.endsWith('waitingJoinDate') ? 'حدد تاريخ الالتحاق' : key,
      ),
    ).toBe('حدد تاريخ الالتحاق');
  });
});

describe('buildFeePlanSuggestErrorFromApi', () => {
  it('reads diagnostics and candidate plans from error details', () => {
    const error = buildFeePlanSuggestErrorFromApi({
      code: 'no_default_fee_plan_for_level',
      message: 'No default plan',
      details: {
        diagnostics: { matching_level_plans: 2, plans_not_default: 2 },
        candidate_plans: [{ id: 2461, name: 'خطة رسوم الابتدائي 2026-2027' }],
      },
    });
    expect(error.diagnostics?.plans_not_default).toBe(2);
    expect(error.candidate_plans?.[0]?.id).toBe(2461);
  });

  it('reads new candidate contract fields from details', () => {
    const error = buildFeePlanSuggestErrorFromApi({
      code: 'no_default_fee_plan_for_level',
      details: {
        requires_manual_selection: true,
        selectable_candidate_plans: [
          { id: 2426, name: 'QA 648874', selectable: true, allowed_action: 'select_manually' },
        ],
        candidate_plans: [{ id: 2426, name: 'QA 648874', reason_not_selected: 'not_default' }],
      },
    });
    expect(error.requires_manual_selection).toBe(true);
    expect(error.selectable_candidate_plans?.[0]?.id).toBe(2426);
  });
});

describe('candidate plan selection helpers', () => {
  it('treats explicit selectable flag and not_default reason as selectable', () => {
    expect(isCandidateSelectable({ id: 1, name: 'A', selectable: true })).toBe(true);
    expect(isCandidateSelectable({ id: 2, name: 'B', selectable: false })).toBe(false);
    expect(isCandidateSelectable({ id: 3, name: 'C', allowed_action: 'select_manually' })).toBe(true);
    expect(isCandidateSelectable({ id: 4, name: 'D', reason_not_selected: 'not_default' })).toBe(true);
    expect(
      isCandidateSelectable({ id: 5, name: 'E', reason_not_selected: 'wrong_academic_year_or_not_default' }),
    ).toBe(false);
    expect(isCandidateSelectable({ id: 6, name: 'F', reason_not_selected: 'not_default_or_not_confirmed' })).toBe(
      false,
    );
  });

  it('prefers backend selectable_candidate_plans, falls back to derived list', () => {
    const backend = resolveSelectableCandidatePlans({
      code: 'no_default_fee_plan_for_level',
      selectable_candidate_plans: [{ id: 9, name: 'Backend' }],
      candidate_plans: [{ id: 1, name: 'X', reason_not_selected: 'not_default' }],
    });
    expect(backend.map((c) => c.id)).toEqual([9]);

    const derived = resolveSelectableCandidatePlans({
      code: 'no_default_fee_plan_for_level',
      candidate_plans: [
        { id: 1, name: 'X', reason_not_selected: 'not_default' },
        { id: 2, name: 'Y', reason_not_selected: 'wrong_academic_year_or_not_default' },
      ],
    });
    expect(derived.map((c) => c.id)).toEqual([1]);
  });

  it('detects no-eligible cases for both contract codes', () => {
    expect(hasNoEligibleFeePlan({ code: 'no_eligible_fee_plan_for_level', candidate_plans: [] })).toBe(true);
    expect(
      hasNoEligibleFeePlan({
        code: 'no_default_fee_plan_for_level',
        diagnostics: { matching_level_plans: 0 },
        candidate_plans: [],
      }),
    ).toBe(true);
    expect(
      hasNoEligibleFeePlan({
        code: 'no_default_fee_plan_for_level',
        diagnostics: { matching_level_plans: 3, plans_not_default: 3 },
        candidate_plans: [{ id: 1, name: 'X', reason_not_selected: 'not_default' }],
      }),
    ).toBe(false);
  });

  it('summarises scope and total from candidate data', () => {
    expect(candidatePlanScopeSummary({ id: 1, name: 'X', level_names: ['الأولي 1', 'الأولي 2'] })).toBe(
      'الأولي 1، الأولي 2',
    );
    expect(candidatePlanScopeSummary({ id: 1, name: 'X', scope_summary: 'كل المستويات' })).toBe('كل المستويات');
    expect(candidatePlanScopeSummary({ id: 1, name: 'X' })).toBeNull();
    expect(candidatePlanTotal({ id: 1, name: 'X', expected_total: 4500 })).toBe(4500);
    expect(candidatePlanTotal({ id: 1, name: 'X', total: 1200 })).toBe(1200);
    expect(candidatePlanTotal({ id: 1, name: 'X' })).toBeNull();
  });

  it('cleans candidate level names (trims, drops blanks and duplicates)', () => {
    expect(
      candidatePlanLevelNames({
        id: 1,
        name: 'X',
        level_names: [' الأولي 1 ', 'الأولي 2', 'الأولي 1', '', '  '],
      }),
    ).toEqual(['الأولي 1', 'الأولي 2']);
    expect(candidatePlanLevelNames({ id: 1, name: 'X' })).toEqual([]);
  });
});

describe('resolveNoDefaultFeePlanMessage', () => {
  it('returns diagnostics message when plans are not default', () => {
    const message = resolveNoDefaultFeePlanMessage(
      {
        code: 'no_default_fee_plan_for_level',
        diagnostics: { matching_level_plans: 3, plans_not_default: 3 },
      },
      (key) => (key.endsWith('notDefault') ? 'توجد خطط لهذا المستوى، لكنها غير معينة كخطط افتراضية.' : key),
    );
    expect(message).toContain('غير معينة كخطط افتراضية');
  });

  it('returns no eligible plan when nothing matches the level', () => {
    const message = resolveNoDefaultFeePlanMessage(
      {
        code: 'no_default_fee_plan_for_level',
        diagnostics: { matching_level_plans: 0 },
      },
      (key) => (key.endsWith('noEligiblePlan') ? 'لا توجد خطة مؤهلة' : key),
    );
    expect(message).toBe('لا توجد خطة مؤهلة');
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

  it('includes periods for line-discount-only customization without month edits', () => {
    const base = defaultStudentCreateFinanceFormState(suggest);
    const financeState: typeof base = {
      ...base,
      customizePlan: true,
      customizationReason: 'special_discount',
      periodOverrides: {},
      lineDiscounts: {
        ...base.lineDiscounts,
        '2904': {
          enabled: true,
          type: 'percent',
          value: '50',
          reason: '',
        },
      },
    };
    const payload = buildStudentCreateFinancePayload(suggest, financeState);
    expect(payload.periods).toEqual([
      {
        period_key: '2025-12',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
      {
        period_key: '2026-01',
        selected: true,
        amount_override: null,
        due_date_override: null,
      },
    ]);
  });

  it('uses the same periods in preview body and save payload', () => {
    const profileState = {
      ...defaultStudentProfileFormState(null),
      academicYearId: '2025',
      levelId: '10',
      actualJoinDate: '2025-12-15',
    };
    const financeState = {
      ...defaultStudentCreateFinanceFormState(suggest),
      customizePlan: true,
      customizationReason: 'family_agreement' as const,
    };
    const savePayload = buildStudentCreateFinancePayload(suggest, financeState);
    const previewBody = buildEnrollmentPlanPreviewBody(profileState, 1, suggest, financeState);
    expect(previewBody.periods).toEqual(savePayload.periods);
    expect(previewBody.customize_plan).toBe(true);
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
