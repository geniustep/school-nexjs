import type {
  FeePlanCandidatePlan,
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
  ensureFinancePeriodOverrides,
  financeCustomizationReasonOptions,
  hasValidCustomizedFinancePeriods,
  resolveFinanceSuggestedPeriods,
} from './enrollment-finance-payload';

export {
  enrollmentPlanLineAmountParts,
  enrollmentPlanLinePricingModeKey,
  ensureFinancePeriodOverrides,
  financialSummaryRows,
  financeCustomizationReasonOptions,
  formatCustomizationReason,
  hasValidCustomizedFinancePeriods,
  buildFinancePeriodPayloads,
  resolveDiscountReason,
  resolveFinanceSuggestedPeriods,
} from './enrollment-finance-payload';
export {
  formatDiscountPercentDisplay,
  normalizeDiscountPercentInput,
  parseDiscountPayloadValue,
} from './normalize-discount-percent';

export function canRequestFeePlanSuggest(input: {
  schoolId: number | null;
  academicYearId: string;
  levelId: string;
  enrollmentDate: string;
}): boolean {
  return getFeePlanSuggestPendingReason(input) == null;
}

export type FeePlanSuggestPendingReason = 'school' | 'academic_year' | 'level' | 'join_date';

export function getFeePlanSuggestPendingReason(input: {
  schoolId: number | null;
  academicYearId: string;
  levelId: string;
  enrollmentDate: string;
}): FeePlanSuggestPendingReason | null {
  if (input.schoolId == null || input.schoolId <= 0) return 'school';
  if (!input.academicYearId.trim()) return 'academic_year';
  if (!input.levelId.trim()) return 'level';
  if (!input.enrollmentDate.trim()) return 'join_date';
  return null;
}

export function resolveFeePlanSuggestEmptyMessage(
  pendingReason: FeePlanSuggestPendingReason | null,
  t: (key: string) => string,
): string {
  if (pendingReason === 'join_date') {
    return t('admin.student360.create.finance.waitingJoinDate');
  }
  if (pendingReason === 'academic_year' || pendingReason === 'school') {
    return t('admin.student360.create.finance.waitingEnrollment');
  }
  if (pendingReason === 'level') {
    return t('admin.student360.create.finance.selectLevelForPlan');
  }
  return t('admin.student360.create.finance.waitingEnrollment');
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
  options?: { activationMode?: 'activate' },
): StudentCreateFinancePayload {
  const feePlanId = financeState.selectedFeePlanId ?? suggest.fee_plan_id;
  const suggestPeriods = resolveFinanceSuggestedPeriods(suggest);
  const normalizedState = financeState.customizePlan
    ? {
        ...financeState,
        periodOverrides: ensureFinancePeriodOverrides(suggestPeriods, financeState.periodOverrides),
      }
    : financeState;
  return buildFinancePayload(feePlanId, suggestPeriods, normalizedState, options);
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
  selectable_candidate_plans?: FeePlanSuggestError['selectable_candidate_plans'];
  requires_manual_selection?: boolean;
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
  const selectableCandidatePlans =
    error.selectable_candidate_plans ??
    (Array.isArray(details.selectable_candidate_plans)
      ? (details.selectable_candidate_plans as FeePlanSuggestError['selectable_candidate_plans'])
      : undefined);
  const requiresManualSelection =
    error.requires_manual_selection ??
    (typeof details.requires_manual_selection === 'boolean'
      ? (details.requires_manual_selection as boolean)
      : undefined);

  return {
    code: error.code ?? 'server_error',
    message: error.message,
    diagnostics,
    candidate_plans: candidatePlans,
    selectable_candidate_plans: selectableCandidatePlans,
    requires_manual_selection: requiresManualSelection,
  };
}

/**
 * Reasons (from `reason_not_selected`) that a client may safely treat as
 * manually selectable when the backend does not send an explicit `selectable`
 * flag. Only `not_default` is safe: the plan matches the level and academic
 * year but is simply not marked as default. Inactive / unconfirmed / wrong-year
 * plans are NOT auto-selectable client-side.
 */
const CLIENT_SELECTABLE_REASONS = new Set(['not_default']);

export function isCandidateSelectable(candidate: FeePlanCandidatePlan): boolean {
  if (typeof candidate.selectable === 'boolean') return candidate.selectable;
  if (candidate.allowed_action === 'select_manually') return true;
  if (candidate.reason_not_selected) {
    return CLIENT_SELECTABLE_REASONS.has(candidate.reason_not_selected);
  }
  return false;
}

/**
 * Returns the candidate plans the user may select manually. Prefers the
 * backend `selectable_candidate_plans` list (new contract); otherwise derives
 * from `candidate_plans` using conservative client-side rules.
 */
export function resolveSelectableCandidatePlans(
  error: FeePlanSuggestError | null,
): FeePlanCandidatePlan[] {
  if (!error) return [];
  if (Array.isArray(error.selectable_candidate_plans) && error.selectable_candidate_plans.length > 0) {
    return error.selectable_candidate_plans;
  }
  const candidates = error.candidate_plans ?? [];
  return candidates.filter(isCandidateSelectable);
}

/**
 * True when there is no plan at all matching this level/cycle for the year, so
 * the student should be created without a finance plan. Robust to both the new
 * `no_eligible_fee_plan_for_level` code and the legacy
 * `no_default_fee_plan_for_level` with zero matching plans / no candidates.
 */
export function hasNoEligibleFeePlan(error: FeePlanSuggestError | null): boolean {
  if (!error) return false;
  if (error.code === 'no_eligible_fee_plan_for_level') return true;
  if (error.code !== 'no_default_fee_plan_for_level') return false;
  const matching = error.diagnostics?.matching_level_plans;
  const hasCandidates = (error.candidate_plans?.length ?? 0) > 0;
  const hasSelectable = resolveSelectableCandidatePlans(error).length > 0;
  return matching === 0 && !hasCandidates && !hasSelectable;
}

/** Localized scope/levels summary for a candidate plan, if data is available. */
export function candidatePlanScopeSummary(candidate: FeePlanCandidatePlan): string | null {
  if (candidate.scope_summary?.trim()) return candidate.scope_summary.trim();
  if (Array.isArray(candidate.level_names) && candidate.level_names.length > 0) {
    return candidate.level_names.join('، ');
  }
  return null;
}

export function candidatePlanTotal(candidate: FeePlanCandidatePlan): number | null {
  return candidate.expected_total ?? candidate.total ?? null;
}

export function resolveNoDefaultFeePlanMessage(
  error: FeePlanSuggestError | null,
  t: (key: string) => string,
): string {
  if (!error) return t('admin.student360.create.finance.noPlanMessage');
  const diagnostics = error.diagnostics;
  if ((diagnostics?.matching_level_plans ?? 0) === 0) {
    return t('admin.student360.create.finance.noEligiblePlan');
  }
  if (
    (diagnostics?.matching_level_plans ?? 0) > 0 &&
    (diagnostics?.plans_not_default ?? 0) > 0
  ) {
    return t('admin.student360.create.finance.diagnostics.notDefault');
  }
  if ((diagnostics?.plans_inactive ?? 0) > 0) {
    return t('admin.student360.create.finance.diagnostics.inactive');
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
    if (/period/i.test(message)) {
      return t('admin.student360.create.finance.errors.billingPeriodsRequired');
    }
    return message;
  }
  return t('admin.student360.create.finance.previewError');
}
