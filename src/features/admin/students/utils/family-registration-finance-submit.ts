import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { StudentFinanceAssignPlanBody } from '@/types/student-finance-assign-plan';
import { buildAssignPlanBody } from '@/features/admin/student-finance/api/assign-plan-api';
import { classifyAssignPlanPreview } from '@/features/admin/student-finance/utils/normalize-assign-plan-preview';
import { isAlreadyAssignedAssignError } from '@/features/admin/finance/fee-plan-assign-errors';
import {
  AssignPlanIdempotencyRegistry,
  buildAssignPlanAttemptFingerprint,
  classifyAssignPlanIdempotencyOutcome,
  shouldClearAssignPlanIdempotencyKey,
  withAssignPlanIdempotencyKey,
} from '@/features/admin/student-finance/utils/assign-plan-idempotency';
import {
  type FamilyChildFinanceDraft,
  type FamilyChildFinanceSubmitResult,
  type FamilyFinanceSubmitState,
} from './family-registration-finance-state';

export type FamilyFinancePreviewFn = (
  studentId: number,
  body: { academic_year_id?: number; fee_plan_id?: number },
) => Promise<ApiResponse<unknown>>;

export type FamilyFinanceAssignFn = (
  studentId: number,
  body: StudentFinanceAssignPlanBody,
) => Promise<ApiResponse<unknown>>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

export function readAssignAgreementId(data: unknown): number | null {
  const record = asRecord(data);
  if (!record) return null;
  return (
    asNumber(record.agreement_id) ??
    asNumber(asRecord(record.agreement)?.id) ??
    asNumber(asRecord(record.financial_agreement)?.id) ??
    asNumber(record.id)
  );
}

function getError(res: ApiResponse<unknown>): ApiErrorBody | undefined {
  return res.success ? undefined : res.error;
}

function isAmbiguousTransportFailure(res: ApiResponse<unknown>): boolean {
  if (res.success) return false;
  const error = getError(res);
  const code = String(error?.code ?? '');
  if (
    code === 'validation_error' ||
    code === 'conflict' ||
    code === 'forbidden' ||
    code === 'fee_plan_already_assigned' ||
    code === 'active_agreement_exists' ||
    code === 'not_found' ||
    code === 'invalid_fee_plan' ||
    code === 'student_not_eligible' ||
    code === 'billing_partner_ambiguous' ||
    code === 'billing_partner_invalid' ||
    code === 'assign_plan_idempotency_conflict' ||
    code === 'assign_plan_idempotency_in_progress' ||
    code === 'assign_plan_idempotency_key_invalid' ||
    code === 'assign_plan_idempotency_key_mismatch'
  ) {
    return false;
  }
  return (
    code === 'network_error' ||
    code === 'timeout' ||
    code === 'server_error' ||
    code === '' ||
    error == null
  );
}

export function buildAssignBodyFromFinanceDraft(
  draft: FamilyChildFinanceDraft,
): StudentFinanceAssignPlanBody | null {
  if (draft.preview?.kind !== 'ready' || draft.preview.plan.feePlanId == null) return null;
  const feePlanId =
    draft.financeState?.selectedFeePlanId ?? draft.preview.plan.feePlanId;
  if (feePlanId == null) return null;
  return buildAssignPlanBody({
    feePlanId,
    academicYearId: draft.preview.plan.academicYearId ?? draft.academicYearId,
    financeState: draft.financeState,
    suggestPeriods: draft.preview.plan.suggestSnapshot?.suggested_periods,
  });
}

export interface FamilyFinanceSubmitResult extends FamilyFinanceSubmitState {}

/**
 * Sequential per-student plan assignment. Not family-atomic.
 * Skips excluded children and treats existing active plans as an independent outcome.
 * Reuses a stable idempotency_key per logical attempt when a registry is provided.
 */
export async function runFamilyFinancePlansSubmit(options: {
  drafts: FamilyChildFinanceDraft[];
  assignPlan: FamilyFinanceAssignFn;
  /** Optional re-preview before assign to catch race conflicts. */
  previewPlan?: FamilyFinancePreviewFn;
  /** Retains keys across retries for the same logical attempt. */
  idempotencyRegistry?: AssignPlanIdempotencyRegistry;
  onlyLocalIds?: string[];
  priorResults?: FamilyChildFinanceSubmitResult[];
  mapErrorMessage: (error: ApiErrorBody | undefined) => string;
  onProgress?: (state: FamilyFinanceSubmitState) => void;
}): Promise<FamilyFinanceSubmitResult> {
  const {
    drafts,
    assignPlan,
    previewPlan,
    idempotencyRegistry,
    onlyLocalIds,
    priorResults,
    mapErrorMessage,
    onProgress,
  } = options;

  const priorById = new Map((priorResults ?? []).map((r) => [r.localId, r]));
  const results: FamilyChildFinanceSubmitResult[] = drafts.map((draft) => {
    const prior = priorById.get(draft.localId);
    if (prior?.status === 'succeeded' || prior?.status === 'already_active') {
      return prior;
    }
    if (!draft.included) {
      return {
        localId: draft.localId,
        studentId: draft.studentId,
        displayName: draft.displayName,
        status: 'skipped',
        canRetrySafely: false,
      };
    }
    if (onlyLocalIds && !onlyLocalIds.includes(draft.localId)) {
      return (
        prior ?? {
          localId: draft.localId,
          studentId: draft.studentId,
          displayName: draft.displayName,
          status: 'pending',
          canRetrySafely: false,
        }
      );
    }
    if (draft.preview?.kind === 'active_agreement_exists') {
      return {
        localId: draft.localId,
        studentId: draft.studentId,
        displayName: draft.displayName,
        status: 'already_active',
        canRetrySafely: false,
        errorCode: 'active_agreement_exists',
      };
    }
    return {
      localId: draft.localId,
      studentId: draft.studentId,
      displayName: draft.displayName,
      status: 'queued',
      canRetrySafely: false,
    };
  });

  const targets = drafts.filter((draft) => {
    if (!draft.included) return false;
    if (onlyLocalIds && !onlyLocalIds.includes(draft.localId)) return false;
    const current = results.find((r) => r.localId === draft.localId);
    if (current?.status === 'succeeded' || current?.status === 'already_active') return false;
    if (current?.status === 'skipped') return false;
    return true;
  });

  const emit = (phase: FamilyFinanceSubmitState['phase'], locked: boolean) => {
    onProgress?.({
      phase,
      results: results.map((r) => ({ ...r })),
      lockedAgainstFullResubmit: locked,
    });
  };

  let lockedAgainstFullResubmit = results.some(
    (r) => r.status === 'succeeded' || r.status === 'already_active',
  );
  emit('submitting', lockedAgainstFullResubmit);

  for (const draft of targets) {
    const index = results.findIndex((r) => r.localId === draft.localId);
    if (index < 0) continue;

    results[index] = { ...results[index], status: 'submitting', canRetrySafely: false };
    emit('submitting', lockedAgainstFullResubmit);

    if (previewPlan) {
      let previewRes: ApiResponse<unknown>;
      try {
        const feePlanId =
          draft.financeState?.selectedFeePlanId ??
          (draft.preview?.kind === 'ready' ? draft.preview.plan.feePlanId : undefined);
        previewRes = await previewPlan(draft.studentId, {
          ...(draft.academicYearId != null
            ? { academic_year_id: draft.academicYearId }
            : {}),
          ...(feePlanId != null ? { fee_plan_id: feePlanId } : {}),
        });
      } catch {
        results[index] = {
          ...results[index],
          status: 'ambiguous',
          canRetrySafely: true,
          errorCode: 'network_error',
          errorMessage: 'network_error',
        };
        for (let i = 0; i < results.length; i += 1) {
          if (results[i].status === 'queued') {
            results[i] = {
              ...results[i],
              status: 'blocked',
              canRetrySafely: false,
              errorCode: 'stopped_after_ambiguous',
              errorMessage: 'stopped_after_ambiguous',
            };
          }
        }
        emit('submitting', lockedAgainstFullResubmit);
        break;
      }

      const classified = classifyAssignPlanPreview(previewRes);
      if (classified.kind === 'active_agreement_exists') {
        results[index] = {
          ...results[index],
          status: 'already_active',
          canRetrySafely: false,
          errorCode: 'active_agreement_exists',
        };
        lockedAgainstFullResubmit = true;
        emit('submitting', lockedAgainstFullResubmit);
        continue;
      }
      if (classified.kind !== 'ready' || classified.plan.feePlanId == null) {
        results[index] = {
          ...results[index],
          status: 'failed',
          canRetrySafely: true,
          errorCode:
            classified.kind === 'error'
              ? 'preview_error'
              : classified.kind,
          errorMessage:
            classified.kind === 'error'
              ? classified.message
              : classified.kind,
        };
        // Continue with other children — finance plans are independent.
        emit('submitting', lockedAgainstFullResubmit);
        continue;
      }
    }

    const body = buildAssignBodyFromFinanceDraft(draft);
    if (!body) {
      results[index] = {
        ...results[index],
        status: 'failed',
        canRetrySafely: true,
        errorCode: 'invalid_plan_draft',
        errorMessage: 'invalid_plan_draft',
      };
      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    let requestBody = body;
    if (idempotencyRegistry) {
      const fingerprint = buildAssignPlanAttemptFingerprint(draft.studentId, body);
      const key = idempotencyRegistry.ensureKey(
        draft.studentId,
        fingerprint,
        draft.localId,
      );
      requestBody = withAssignPlanIdempotencyKey(body, key);
    }

    let res: ApiResponse<unknown>;
    try {
      res = await assignPlan(draft.studentId, requestBody);
    } catch {
      results[index] = {
        ...results[index],
        status: 'ambiguous',
        // Same logical attempt / key retained — safe to re-check with registry.
        canRetrySafely: true,
        errorCode: 'network_error',
        errorMessage: 'network_error',
      };
      for (let i = 0; i < results.length; i += 1) {
        if (results[i].status === 'queued') {
          results[i] = {
            ...results[i],
            status: 'blocked',
            canRetrySafely: false,
            errorCode: 'stopped_after_ambiguous',
            errorMessage: 'stopped_after_ambiguous',
          };
        }
      }
      emit('submitting', lockedAgainstFullResubmit);
      break;
    }

    const idempotencyOutcome = classifyAssignPlanIdempotencyOutcome(res);
    if (shouldClearAssignPlanIdempotencyKey(idempotencyOutcome)) {
      idempotencyRegistry?.clear(draft.studentId, draft.localId);
    }

    if (res.success) {
      results[index] = {
        ...results[index],
        status: 'succeeded',
        agreementId: readAssignAgreementId(res.data) ?? undefined,
        feePlanId: body.fee_plan_id,
        canRetrySafely: false,
      };
      lockedAgainstFullResubmit = true;
      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    if (idempotencyOutcome.kind === 'in_progress') {
      results[index] = {
        ...results[index],
        status: 'failed',
        canRetrySafely: true,
        errorCode: 'assign_plan_idempotency_in_progress',
        errorMessage: mapErrorMessage(getError(res)),
      };
      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    if (
      idempotencyOutcome.kind === 'payload_conflict' ||
      idempotencyOutcome.kind === 'invalid_key' ||
      idempotencyOutcome.kind === 'key_mismatch'
    ) {
      results[index] = {
        ...results[index],
        status: 'failed',
        canRetrySafely: false,
        errorCode: String(getError(res)?.code ?? 'error'),
        errorMessage: mapErrorMessage(getError(res)),
      };
      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    if (
      isAlreadyAssignedAssignError(getError(res)?.code, getError(res)?.message) ||
      classifyAssignPlanPreview(res).kind === 'active_agreement_exists'
    ) {
      idempotencyRegistry?.clear(draft.studentId, draft.localId);
      results[index] = {
        ...results[index],
        status: 'already_active',
        canRetrySafely: false,
        errorCode: String(getError(res)?.code ?? 'fee_plan_already_assigned'),
        errorMessage: mapErrorMessage(getError(res)),
      };
      lockedAgainstFullResubmit = true;
      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    if (isAmbiguousTransportFailure(res)) {
      results[index] = {
        ...results[index],
        status: 'ambiguous',
        canRetrySafely: true,
        errorCode: String(getError(res)?.code ?? 'network_error'),
        errorMessage: mapErrorMessage(getError(res)),
      };
      for (let i = 0; i < results.length; i += 1) {
        if (results[i].status === 'queued') {
          results[i] = {
            ...results[i],
            status: 'blocked',
            canRetrySafely: false,
            errorCode: 'stopped_after_ambiguous',
            errorMessage: 'stopped_after_ambiguous',
          };
        }
      }
      emit('submitting', lockedAgainstFullResubmit);
      break;
    }

    results[index] = {
      ...results[index],
      status: 'failed',
      canRetrySafely: true,
      errorCode: String(getError(res)?.code ?? 'error'),
      errorMessage: mapErrorMessage(getError(res)),
    };
    // Continue remaining children — independent plans, clear failure.
    emit('submitting', lockedAgainstFullResubmit);
  }

  const finalState: FamilyFinanceSubmitResult = {
    phase: 'completed',
    results,
    lockedAgainstFullResubmit:
      lockedAgainstFullResubmit ||
      results.some((r) => r.status === 'succeeded' || r.status === 'already_active'),
  };
  onProgress?.(finalState);
  return finalState;
}
