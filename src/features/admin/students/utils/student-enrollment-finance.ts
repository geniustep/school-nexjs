import type {
  FeePlanCustomizationReason,
  FeePlanSuggestQuery,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
  StudentCreateFinancePayload,
  StudentCreateFinancePeriodPayload,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from './student-profile';

export function canRequestFeePlanSuggest(input: {
  schoolId: number | null;
  academicYearId: string;
  levelId: string;
  enrollmentDate: string;
}): boolean {
  return (
    input.schoolId != null &&
    input.schoolId > 0 &&
    Boolean(input.academicYearId.trim()) &&
    Boolean(input.levelId.trim()) &&
    Boolean(input.enrollmentDate.trim())
  );
}

export function buildFeePlanSuggestQuery(
  state: StudentProfileFormState,
  schoolId: number | null,
): FeePlanSuggestQuery | null {
  if (!canRequestFeePlanSuggest({
    schoolId,
    academicYearId: state.academicYearId,
    levelId: state.levelId,
    enrollmentDate: state.actualJoinDate,
  })) {
    return null;
  }
  return {
    school_id: schoolId as number,
    academic_year_id: Number(state.academicYearId),
    level_id: Number(state.levelId),
    enrollment_date: state.actualJoinDate.trim(),
  };
}

export function defaultStudentCreateFinanceFormState(
  suggest: FeePlanSuggestResult | null,
): StudentCreateFinanceFormState {
  const periodOverrides: StudentCreateFinanceFormState['periodOverrides'] = {};
  for (const period of suggest?.suggested_periods ?? []) {
    periodOverrides[period.period_key] = {
      selected: period.selected !== false,
      amountOverride: '',
      dueDateOverride: '',
    };
  }
  return {
    customizePlan: false,
    customizationReason: '',
    customizationNotes: '',
    periodOverrides,
  };
}

export function mergeFinanceStateWithSuggest(
  previous: StudentCreateFinanceFormState,
  suggest: FeePlanSuggestResult | null,
  resetCustomization: boolean,
): StudentCreateFinanceFormState {
  const base = defaultStudentCreateFinanceFormState(suggest);
  if (resetCustomization || !previous.customizePlan) return base;
  const periodOverrides = { ...base.periodOverrides };
  for (const [key, override] of Object.entries(previous.periodOverrides)) {
    if (!periodOverrides[key]) continue;
    periodOverrides[key] = {
      selected: override.selected,
      amountOverride: override.amountOverride,
      dueDateOverride: override.dueDateOverride,
    };
  }
  return {
    customizePlan: previous.customizePlan,
    customizationReason: previous.customizationReason,
    customizationNotes: previous.customizationNotes,
    periodOverrides,
  };
}

function parseOptionalAmount(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : undefined;
}

export function buildStudentCreateFinancePayload(
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinancePayload {
  const payload: StudentCreateFinancePayload = {
    fee_plan_id: suggest.fee_plan_id,
    customize_plan: financeState.customizePlan,
  };

  if (!financeState.customizePlan) return payload;

  if (financeState.customizationReason) {
    payload.customization_reason = financeState.customizationReason;
  }
  const notes = financeState.customizationNotes.trim();
  if (notes) payload.customization_notes = notes;

  const periods: StudentCreateFinancePeriodPayload[] = suggest.suggested_periods.map((period) => {
    const override = financeState.periodOverrides[period.period_key];
    const selected = override?.selected ?? period.selected !== false;
    const amountOverride = override ? parseOptionalAmount(override.amountOverride) : null;
    const dueDateOverride = override?.dueDateOverride?.trim() || null;
    return {
      period_key: period.period_key,
      selected,
      amount_override: amountOverride === undefined ? null : amountOverride,
      due_date_override: dueDateOverride,
    };
  });
  payload.periods = periods;
  return payload;
}

export function selectedFinancePeriods(
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
): FeePlanSuggestResult['suggested_periods'] {
  if (!financeState.customizePlan) {
    return suggest.suggested_periods.filter((p) => p.selected !== false);
  }
  return suggest.suggested_periods.filter((period) => {
    const override = financeState.periodOverrides[period.period_key];
    return override?.selected ?? period.selected !== false;
  });
}

export function financeCustomizationReasonOptions(): FeePlanCustomizationReason[] {
  return [
    'late_enrollment',
    'scholarship',
    'special_discount',
    'family_agreement',
    'expected_withdrawal',
    'manual_adjustment',
    'other',
  ];
}

export function canSkipFinanceOnCreate(
  suggestErrorCode: string | null,
  allowedActions?: FeePlanSuggestResult['allowed_actions'],
): boolean {
  return suggestErrorCode === 'no_default_fee_plan_for_level' && allowedActions?.skip_finance === true;
}

export function financePlanFingerprint(query: FeePlanSuggestQuery | null): string {
  if (!query) return '';
  return `${query.school_id}:${query.academic_year_id}:${query.level_id}:${query.enrollment_date}`;
}
