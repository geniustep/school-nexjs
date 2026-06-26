import type { ApiResponse } from '@/types/api';
import type { StudentFinanceCurrency } from '@/types/student-finance';
import type {
  EligibleFeePlan,
  EnrollmentCustomizationContract,
  EnrollmentFinancialSummary,
  EnrollmentPlanLine,
  FeePlanExcludedPeriod,
  FeePlanSuggestAllowedActions,
  FeePlanSuggestResult,
  FeePlanSuggestedPeriod,
} from '@/types/student-enrollment-finance';
import type {
  AssignPlanPreview,
  AssignPlanPreviewState,
} from '@/types/student-finance-assign-plan';
import {
  buildFeePlanSuggestErrorFromApi,
  hasNoEligibleFeePlan,
  resolveSelectableCandidatePlans,
} from '@/features/admin/students/utils/student-enrollment-finance';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function readCurrency(value: unknown): StudentFinanceCurrency | null {
  const record = asRecord(value);
  if (!record) {
    const code = asString(value);
    return code ? { name: code, symbol: code } : null;
  }
  const name = asString(record.name) ?? asString(record.code) ?? '';
  const symbol = asString(record.symbol) ?? name;
  if (!name && !symbol) return null;
  return {
    name,
    symbol,
    position: asString(record.position) as StudentFinanceCurrency['position'],
  };
}

function readRefName(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return asString(value);
  return asString(record.name) ?? asString(record.display_name);
}

function readRefId(value: unknown): number | null {
  const record = asRecord(value);
  if (!record) return asNumber(value);
  return asNumber(record.id);
}

function readAllowedActions(value: unknown): string[] {
  const record = asRecord(value);
  if (!record) return [];
  return Object.entries(record)
    .filter(([, v]) => asBoolean(v) === true)
    .map(([key]) => key);
}

function readAllowedActionsMap(value: unknown): FeePlanSuggestAllowedActions | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const map: FeePlanSuggestAllowedActions = {};
  for (const [key, raw] of Object.entries(record)) {
    const enabled = asBoolean(raw);
    if (enabled == null) continue;
    map[key as keyof FeePlanSuggestAllowedActions] = enabled;
  }
  return Object.keys(map).length > 0 ? map : undefined;
}

function readArray<T>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

/** Builds a suggest-shaped snapshot so assign-plan UI can reuse create-flow panels. */
export function buildAssignPlanSuggestSnapshot(payload: unknown): FeePlanSuggestResult | null {
  const record = asRecord(payload) ?? {};
  const plan = asRecord(record.fee_plan) ?? asRecord(record.plan);
  const feePlanId = asNumber(record.fee_plan_id) ?? readRefId(record.fee_plan) ?? readRefId(record.plan);
  if (feePlanId == null) return null;

  const summary = asRecord(record.financial_summary) ?? asRecord(record.summary);
  const planName =
    asString(record.fee_plan_name) ?? readRefName(record.fee_plan) ?? readRefName(record.plan) ?? '';

  return {
    ok: true,
    fee_plan_id: feePlanId,
    fee_plan_name: planName,
    is_default_for_level: asBoolean(plan?.is_default_for_level) ?? undefined,
    academic_year: asRecord(record.academic_year) as FeePlanSuggestResult['academic_year'],
    level: asRecord(record.level) as FeePlanSuggestResult['level'],
    suggested_periods: readArray<FeePlanSuggestedPeriod>(record.suggested_periods) ?? [],
    excluded_periods: readArray<FeePlanExcludedPeriod>(record.excluded_periods) ?? [],
    total_due:
      asNumber(record.total) ??
      asNumber(record.expected_total) ??
      asNumber(summary?.expected_total) ??
      null,
    currency:
      readCurrency(record.currency) ??
      readCurrency(summary?.currency) ??
      (asString(summary?.currency) ? { name: asString(summary?.currency)!, symbol: asString(summary?.currency)! } : null),
    allowed_actions: readAllowedActionsMap(record.allowed_actions),
    eligible_plans: readArray<EligibleFeePlan>(record.eligible_plans),
    plan_lines: readArray<EnrollmentPlanLine>(record.plan_lines),
    financial_summary: (summary as EnrollmentFinancialSummary | null) ?? null,
    customization_contract: (asRecord(record.customization_contract) as EnrollmentCustomizationContract | null) ?? null,
  };
}

/** Reads the success-shaped preview body into the UI model. */
export function normalizeAssignPlanPreview(payload: unknown): AssignPlanPreview {
  const record = asRecord(payload) ?? {};
  const plan = asRecord(record.fee_plan) ?? asRecord(record.plan);
  const summary = asRecord(record.financial_summary) ?? asRecord(record.summary);

  const total =
    asNumber(record.total) ??
    asNumber(record.expected_total) ??
    asNumber(record.total_due) ??
    asNumber(summary?.expected_total) ??
    asNumber(summary?.total_due) ??
    null;

  const installmentCount =
    asNumber(record.installment_count) ??
    asNumber(record.installments_count) ??
    asNumber(record.suggested_period_count) ??
    asNumber(summary?.monthly_installments_count) ??
    (Array.isArray(record.suggested_periods) ? record.suggested_periods.length : null) ??
    (Array.isArray(record.installments) ? record.installments.length : null);

  const canAssign = asBoolean(record.can_assign);

  return {
    feePlanId: asNumber(record.fee_plan_id) ?? readRefId(record.fee_plan) ?? readRefId(record.plan),
    planName:
      asString(record.fee_plan_name) ?? readRefName(record.fee_plan) ?? readRefName(record.plan),
    academicYearId:
      asNumber(record.academic_year_id) ?? readRefId(record.academic_year),
    academicYearName:
      asString(record.academic_year_name) ?? readRefName(record.academic_year),
    levelName:
      asString(record.level_name) ??
      readRefName(record.level) ??
      readRefName(record.class) ??
      asString(record.section_name),
    total,
    currency: readCurrency(record.currency) ?? readCurrency(summary?.currency),
    installmentCount,
    allowedActions: readAllowedActions(record.allowed_actions),
    canAssign: canAssign ?? true,
    suggestSnapshot: buildAssignPlanSuggestSnapshot(record),
  };
}

const ACTIVE_AGREEMENT_REASONS = new Set([
  'active_agreement_exists',
  'agreement_already_active',
  'active_agreement',
]);

const MISSING_ENROLLMENT_REASONS = new Set([
  'missing_academic_enrollment',
  'academic_enrollment_incomplete',
  'no_academic_enrollment',
]);

const NO_ELIGIBLE_REASONS = new Set(['no_eligible_fee_plan_for_level']);

const NO_DEFAULT_REASONS = new Set(['no_default_fee_plan_for_level']);

function classifyByReason(
  reason: string | null,
  source: {
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
    candidate_plans?: unknown;
    selectable_candidate_plans?: unknown;
  },
): AssignPlanPreviewState | null {
  if (!reason) return null;
  if (ACTIVE_AGREEMENT_REASONS.has(reason)) return { kind: 'active_agreement_exists' };
  if (MISSING_ENROLLMENT_REASONS.has(reason)) return { kind: 'missing_academic_enrollment' };
  if (NO_ELIGIBLE_REASONS.has(reason)) return { kind: 'no_eligible_plan' };
  if (NO_DEFAULT_REASONS.has(reason)) {
    const error = buildFeePlanSuggestErrorFromApi({
      code: reason,
      message: source.message,
      details: source.details,
      candidate_plans: Array.isArray(source.candidate_plans)
        ? (source.candidate_plans as never)
        : undefined,
      selectable_candidate_plans: Array.isArray(source.selectable_candidate_plans)
        ? (source.selectable_candidate_plans as never)
        : undefined,
    });
    if (hasNoEligibleFeePlan(error)) return { kind: 'no_eligible_plan' };
    const candidates = resolveSelectableCandidatePlans(error);
    if (candidates.length > 0) {
      return { kind: 'candidate_selection', candidates, message: source.message };
    }
    return { kind: 'no_eligible_plan' };
  }
  return null;
}

/**
 * Maps a preview API response (success body or error envelope) into a single
 * declarative UI state. Handles both "blocking reason on a 200 body" and
 * "error code envelope" shapes so the component stays contract-agnostic.
 */
export function classifyAssignPlanPreview(
  res: ApiResponse<unknown>,
): AssignPlanPreviewState {
  if (!res.success) {
    const details = (res.error.details ?? {}) as Record<string, unknown>;
    const byCode = classifyByReason(res.error.code, {
      code: res.error.code,
      message: res.error.message,
      details,
      candidate_plans: details.candidate_plans,
      selectable_candidate_plans: details.selectable_candidate_plans,
    });
    if (byCode) return byCode;
    return { kind: 'error', message: res.error.message };
  }

  const record = asRecord(res.data) ?? {};

  if (asBoolean(record.active_agreement_exists) === true) {
    return { kind: 'active_agreement_exists' };
  }

  const blockingReason =
    asString(record.blocking_reason) ??
    asString(record.block_reason) ??
    asString(record.reason);
  const canAssign = asBoolean(record.can_assign);

  if (canAssign === false || blockingReason) {
    const byReason = classifyByReason(blockingReason, {
      message: asString(record.message) ?? undefined,
      details: record,
      candidate_plans: record.candidate_plans,
      selectable_candidate_plans: record.selectable_candidate_plans,
    });
    if (byReason) return byReason;
    if (canAssign === false) {
      return { kind: 'error', message: asString(record.message) ?? undefined };
    }
  }

  return { kind: 'ready', plan: normalizeAssignPlanPreview(record) };
}
