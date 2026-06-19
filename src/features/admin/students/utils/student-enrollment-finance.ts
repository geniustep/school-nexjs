import type {
  FeePlanCustomizationReason,
  FeePlanSuggestError,
  FeePlanSuggestQuery,
  FeePlanSuggestResult,
  StudentCreateFinanceFormState,
  StudentCreateFinancePayload,
} from '@/types/student-enrollment-finance';
import type { StudentProfileFormState } from './student-profile';
import {
  buildStudentCreateFinancePayload as buildFinancePayload,
  emptyFinanceDiscountState,
  financeCustomizationReasonOptions,
} from './enrollment-finance-payload';

export {
  enrollmentPlanLineAmountParts,
  enrollmentPlanLinePricingModeKey,
  financialSummaryRows,
  financeCustomizationReasonOptions,
  formatCustomizationReason,
  resolveDiscountReason,
} from './enrollment-finance-payload';

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
  selectedFeePlanId?: number | null,
): FeePlanSuggestQuery | null {
  if (!canRequestFeePlanSuggest({
    schoolId,
    academicYearId: state.academicYearId,
    levelId: state.levelId,
    enrollmentDate: state.actualJoinDate,
  })) {
    return null;
  }
  const query: FeePlanSuggestQuery = {
    school_id: schoolId as number,
    academic_year_id: Number(state.academicYearId),
    level_id: Number(state.levelId),
    enrollment_date: state.actualJoinDate.trim(),
  };
  if (selectedFeePlanId != null && selectedFeePlanId > 0) {
    query.fee_plan_id = selectedFeePlanId;
  }
  return query;
}

function buildOneTimeLineState(
  suggest: FeePlanSuggestResult | null,
): StudentCreateFinanceFormState['oneTimeLines'] {
  const oneTimeLines: StudentCreateFinanceFormState['oneTimeLines'] = {};
  const contractLines = suggest?.customization_contract?.one_time_lines ?? [];
  const planOneTimeLines =
    suggest?.plan_lines?.filter((line) => line.is_one_time || line.frequency === 'one_time') ?? [];

  for (const line of planOneTimeLines) {
    const contract = contractLines.find((item) => item.line_id === line.line_id);
    oneTimeLines[String(line.line_id)] = {
      selected: contract?.selected ?? true,
      amountOverride:
        contract?.amount_override != null ? String(contract.amount_override) : '',
      dueDateOverride: contract?.due_date_override ?? line.due_date ?? '',
    };
  }

  for (const contract of contractLines) {
    if (oneTimeLines[String(contract.line_id)]) continue;
    oneTimeLines[String(contract.line_id)] = {
      selected: contract.selected ?? true,
      amountOverride:
        contract.amount_override != null ? String(contract.amount_override) : '',
      dueDateOverride: contract.due_date_override ?? '',
    };
  }

  return oneTimeLines;
}

function buildLineDiscountState(
  suggest: FeePlanSuggestResult | null,
): StudentCreateFinanceFormState['lineDiscounts'] {
  const lineDiscounts: StudentCreateFinanceFormState['lineDiscounts'] = {};
  for (const line of suggest?.plan_lines ?? []) {
    lineDiscounts[String(line.line_id)] = emptyFinanceDiscountState();
  }
  return lineDiscounts;
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
    selectedFeePlanId: suggest?.fee_plan_id ?? null,
    customizePlan: false,
    customizationReason: '',
    customizationNotes: '',
    periodOverrides,
    planDiscount: emptyFinanceDiscountState(),
    lineDiscounts: buildLineDiscountState(suggest),
    oneTimeLines: buildOneTimeLineState(suggest),
  };
}

export function mergeFinanceStateWithSuggest(
  previous: StudentCreateFinanceFormState,
  suggest: FeePlanSuggestResult | null,
  resetCustomization: boolean,
): StudentCreateFinanceFormState {
  const base = defaultStudentCreateFinanceFormState(suggest);
  if (resetCustomization || !previous.customizePlan) {
    return {
      ...base,
      selectedFeePlanId: previous.selectedFeePlanId ?? base.selectedFeePlanId,
    };
  }

  const periodOverrides = { ...base.periodOverrides };
  for (const [key, override] of Object.entries(previous.periodOverrides)) {
    if (!periodOverrides[key]) continue;
    periodOverrides[key] = {
      selected: override.selected,
      amountOverride: override.amountOverride,
      dueDateOverride: override.dueDateOverride,
    };
  }

  const oneTimeLines = { ...base.oneTimeLines };
  for (const [key, override] of Object.entries(previous.oneTimeLines)) {
    if (!oneTimeLines[key]) continue;
    oneTimeLines[key] = { ...override };
  }

  const lineDiscounts = { ...base.lineDiscounts };
  for (const [key, override] of Object.entries(previous.lineDiscounts)) {
    if (!lineDiscounts[key]) continue;
    lineDiscounts[key] = { ...override };
  }

  return {
    selectedFeePlanId: previous.selectedFeePlanId ?? base.selectedFeePlanId,
    customizePlan: previous.customizePlan,
    customizationReason: previous.customizationReason,
    customizationNotes: previous.customizationNotes,
    periodOverrides,
    planDiscount: { ...previous.planDiscount },
    lineDiscounts,
    oneTimeLines,
  };
}

export function buildStudentCreateFinancePayload(
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
): StudentCreateFinancePayload {
  const feePlanId = financeState.selectedFeePlanId ?? suggest.fee_plan_id;
  return buildFinancePayload(feePlanId, suggest.suggested_periods, financeState);
}

export function buildEnrollmentPlanPreviewBody(
  state: StudentProfileFormState,
  schoolId: number,
  suggest: FeePlanSuggestResult,
  financeState: StudentCreateFinanceFormState,
): Record<string, unknown> {
  return {
    school_id: schoolId,
    academic_year_id: Number(state.academicYearId),
    level_id: Number(state.levelId),
    enrollment_date: state.actualJoinDate.trim(),
    ...buildStudentCreateFinancePayload(suggest, financeState),
  };
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

export function canSkipFinanceOnCreate(
  suggestError: FeePlanSuggestError | null,
  allowedActions?: FeePlanSuggestResult['allowed_actions'],
): boolean {
  return suggestError?.code === 'no_default_fee_plan_for_level' && allowedActions?.skip_finance === true;
}

export function buildFeePlanSuggestErrorFromApi(error: {
  code?: string;
  message?: string;
  details?: Record<string, unknown>;
  diagnostics?: FeePlanSuggestError['diagnostics'];
  candidate_plans?: FeePlanSuggestError['candidate_plans'];
}): FeePlanSuggestError {
  const details = error.details ?? {};
  const diagnostics =
    error.diagnostics ??
    (typeof details.diagnostics === 'object' && details.diagnostics !== null
      ? (details.diagnostics as FeePlanSuggestError['diagnostics'])
      : undefined);
  const candidatePlans =
    error.candidate_plans ??
    (Array.isArray(details.candidate_plans)
      ? (details.candidate_plans as FeePlanSuggestError['candidate_plans'])
      : undefined);

  return {
    code: error.code ?? 'server_error',
    message: error.message,
    diagnostics,
    candidate_plans: candidatePlans,
  };
}

export function resolveNoDefaultFeePlanMessage(
  error: FeePlanSuggestError | null,
  t: (key: string) => string,
): string {
  if (!error) return t('admin.student360.create.finance.noPlanMessage');
  const diagnostics = error.diagnostics;
  if (
    (diagnostics?.matching_level_plans ?? 0) > 0 &&
    (diagnostics?.plans_not_default ?? 0) > 0
  ) {
    return t('admin.student360.create.finance.diagnostics.notDefault');
  }
  if (error.message?.trim()) return error.message.trim();
  return t('admin.student360.create.finance.noPlanMessage');
}

export function financePlanFingerprint(query: FeePlanSuggestQuery | null): string {
  if (!query) return '';
  const planPart = query.fee_plan_id != null ? `:${query.fee_plan_id}` : '';
  return `${query.school_id}:${query.academic_year_id}:${query.level_id}:${query.enrollment_date}${planPart}`;
}

export function financePreviewFingerprint(input: {
  query: FeePlanSuggestQuery | null;
  financeState: StudentCreateFinanceFormState;
}): string {
  const base = financePlanFingerprint(input.query);
  const { financeState } = input;
  return [
    base,
    financeState.customizePlan ? '1' : '0',
    financeState.customizationReason,
    financeState.customizationNotes,
    JSON.stringify(financeState.periodOverrides),
    JSON.stringify(financeState.planDiscount),
    JSON.stringify(financeState.lineDiscounts),
    JSON.stringify(financeState.oneTimeLines),
  ].join('|');
}

export function mapEnrollmentPreviewErrorMessage(
  error: { code?: string; message?: string } | null | undefined,
  t: (key: string) => string,
): string {
  if (!error) return t('admin.student360.create.finance.previewError');
  const message = error.message?.trim();
  if (message) {
    const lower = message.toLowerCase();
    if (lower.includes('academic_year')) {
      return t('admin.student360.create.errors.academicYearRequiredForFinance');
    }
    if (/customization.?reason|customize.?reason/i.test(message)) {
      return t('admin.student360.create.finance.reasonRequired');
    }
    if (/discount.*reason|reason.*discount/i.test(message)) {
      return t('admin.student360.create.finance.reasonRequired');
    }
    if (/percent/i.test(message) || /> *100/i.test(message)) {
      return t('admin.student360.create.finance.errors.percentTooHigh');
    }
    if (/fixed_amount|amount/i.test(message) && /greater|exceed/i.test(message)) {
      return t('admin.student360.create.finance.errors.fixedAmountTooHigh');
    }
    if (/period/i.test(message)) return t('admin.student360.create.finance.errors.invalidPeriod');
    return message;
  }
  return t('admin.student360.create.finance.previewError');
}
