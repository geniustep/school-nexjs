import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { StudentClassOption } from '@/types/student-360';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import type {
  BatchChildResult,
  BatchGuardianResolved,
  BatchRegistrationRequest,
  BatchRegistrationResponse,
} from '@/types/student-batch-registration';
import {
  childDisplayName,
  type FamilyChildSubmitResult,
  type FamilyRegistrationFormState,
  type FamilyRegistrationSubmitState,
} from './family-registration-state';
import { collectFamilyGuardianEntries } from './family-registration-payload';
import { buildFamilyBatchRegistrationRequest } from './family-registration-batch-payload';
import {
  isFamilyBatchIdempotencyConflict,
  isFamilyBatchTransportAmbiguous,
  resolveFamilyBatchChildErrorMessage,
} from './family-registration-batch-errors';
import type { FamilyBatchIdempotencyRegistry } from './family-registration-idempotency';

export type FamilyRegistrationBatchPostFn = (
  payload: BatchRegistrationRequest,
) => Promise<ApiResponse<BatchRegistrationResponse>>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseBatchResponse(data: unknown): BatchRegistrationResponse | null {
  const record = asRecord(data);
  if (!record) return null;
  const status =
    record.status === 'completed' ||
    record.status === 'partially_completed' ||
    record.status === 'failed'
      ? record.status
      : null;
  if (!status || !Array.isArray(record.children)) return null;
  return {
    idempotency_key: typeof record.idempotency_key === 'string' ? record.idempotency_key : '',
    status,
    requested_count: typeof record.requested_count === 'number' ? record.requested_count : 0,
    succeeded_count: typeof record.succeeded_count === 'number' ? record.succeeded_count : 0,
    failed_count: typeof record.failed_count === 'number' ? record.failed_count : 0,
    replayed: record.replayed === true,
    guardians_resolved: Array.isArray(record.guardians_resolved)
      ? (record.guardians_resolved as BatchGuardianResolved[])
      : [],
    children: record.children as BatchChildResult[],
  };
}

function readStudentIdFromChildResult(child: BatchChildResult): number | undefined {
  if (typeof child.student_id === 'number' && child.student_id > 0) return child.student_id;
  const student = asRecord(child.student);
  if (student && typeof student.id === 'number' && student.id > 0) return student.id;
  return undefined;
}

function isSuccessfulChildStatus(status: string, replayed?: boolean): boolean {
  if (replayed === true) return true;
  return status === 'succeeded' || status === 'replayed' || status === 'success';
}

function mapBatchChildToResult(options: {
  prior: FamilyChildSubmitResult;
  childResult: BatchChildResult | undefined;
  batchStatus: BatchRegistrationResponse['status'];
  mapErrorMessage: (error: ApiErrorBody | undefined) => string;
  t: (key: string) => string;
}): FamilyChildSubmitResult {
  const { prior, childResult, batchStatus, mapErrorMessage, t } = options;
  if (!childResult) {
    return {
      ...prior,
      status: 'failed',
      canRetrySafely: true,
      errorCode: 'unexpected_internal_error',
      errorMessage: resolveFamilyBatchChildErrorMessage(
        { code: 'unexpected_internal_error' },
        t,
        mapErrorMessage,
      ),
      batchStatus,
    };
  }

  const statusRaw = String(childResult.status ?? '');
  const replayed = childResult.replayed === true || statusRaw === 'replayed';
  if (isSuccessfulChildStatus(statusRaw, childResult.replayed)) {
    return {
      ...prior,
      status: 'succeeded',
      studentId: readStudentIdFromChildResult(childResult),
      studentReference:
        typeof childResult.student_reference === 'string'
          ? childResult.student_reference
          : prior.studentReference ?? null,
      replayed,
      canRetrySafely: false,
      errorCode: undefined,
      errorMessage: undefined,
      batchStatus,
    };
  }

  const retryable = childResult.retryable === true;
  const errorBody = childResult.error
    ? ({
        code: childResult.error.code,
        message: childResult.error.message,
        details: childResult.error.details,
      } as ApiErrorBody)
    : undefined;

  return {
    ...prior,
    status: 'failed',
    studentId: undefined,
    studentReference: null,
    replayed: false,
    canRetrySafely: retryable || childResult.retryable !== false,
      errorCode: String(childResult.error?.code ?? (statusRaw || 'error')),
    errorMessage: resolveFamilyBatchChildErrorMessage(
      childResult.error ?? errorBody,
      t,
      mapErrorMessage,
    ),
    batchStatus,
  };
}

export function initializeFamilySubmitResults(
  children: FamilyRegistrationFormState['children'],
): FamilyChildSubmitResult[] {
  return children.map((child) => ({
    localId: child.localId,
    displayName: childDisplayName(child.profile),
    status: 'pending',
    canRetrySafely: false,
  }));
}

export function familySubmitOutcomeSummary(results: FamilyChildSubmitResult[]): {
  succeeded: number;
  failed: number;
  ambiguous: number;
  blocked: number;
  pending: number;
  kind: 'full_success' | 'partial_success' | 'full_failure' | 'in_progress' | 'idle';
} {
  const succeeded = results.filter((r) => r.status === 'succeeded').length;
  const failed = results.filter((r) => r.status === 'failed').length;
  const ambiguous = results.filter((r) => r.status === 'ambiguous').length;
  const blocked = results.filter((r) => r.status === 'blocked').length;
  const pending = results.filter(
    (r) => r.status === 'pending' || r.status === 'queued' || r.status === 'submitting',
  ).length;

  let kind: 'full_success' | 'partial_success' | 'full_failure' | 'in_progress' | 'idle' = 'idle';
  if (pending > 0) kind = 'in_progress';
  else if (succeeded > 0 && failed + ambiguous + blocked === 0) kind = 'full_success';
  else if (succeeded > 0) kind = 'partial_success';
  else if (results.length > 0) kind = 'full_failure';

  return { succeeded, failed, ambiguous, blocked, pending, kind };
}

export function shouldOfferFamilyFailedRetry(results: FamilyChildSubmitResult[]): boolean {
  return results.some((r) => r.status === 'failed' && r.canRetrySafely);
}

export function mapGuardiansResolvedToEntries(
  prior: StudentCreateGuardianEntry[],
  resolved: BatchGuardianResolved[] | undefined,
): StudentCreateGuardianEntry[] {
  if (!resolved || resolved.length === 0) return prior;
  const byKey = new Map(
    resolved
      .filter((g) => typeof g.guardian_id === 'number' && g.guardian_id > 0)
      .map((g) => [g.client_guardian_key, g.guardian_id as number]),
  );
  return prior.map((entry) => {
    if (entry.kind === 'existing') return entry;
    const guardianId = byKey.get(entry.entryKey);
    if (guardianId == null) return entry;
    // Keep entryKey stable so relationshipByEntryKey / billingGuardianEntryKey stay valid.
    return {
      kind: 'existing' as const,
      entryKey: entry.entryKey,
      guardian_id: guardianId,
      displayName: entry.full_name,
      relationship_type: entry.relationship_type,
      is_primary_contact: entry.is_primary_contact,
      phone: entry.phone,
      email: entry.email,
    };
  });
}

export interface FamilyRegistrationSubmitResult extends FamilyRegistrationSubmitState {
  /** Guardians after resolution — persist into form before a safe failed-only retry. */
  resolvedGuardianEntries: StudentCreateGuardianEntry[];
}

/**
 * Single-request multi-child registration via POST /admin/students/batch-registration.
 * No sequential per-child create fallback.
 */
export async function runFamilyRegistrationSubmit(options: {
  form: FamilyRegistrationFormState;
  schoolId: number | null;
  classes?: StudentClassOption[];
  postBatch: FamilyRegistrationBatchPostFn;
  /** When set, only these localIds are attempted (safe failed retry). */
  onlyLocalIds?: string[];
  /** Prior results to preserve (e.g. succeeded siblings during failed-only retry). */
  priorResults?: FamilyChildSubmitResult[];
  /** Pre-resolved guardians from a previous successful sibling create. */
  resolvedGuardianEntries?: StudentCreateGuardianEntry[];
  idempotency: FamilyBatchIdempotencyRegistry;
  mapErrorMessage: (error: ApiErrorBody | undefined) => string;
  t: (key: string) => string;
  onProgress?: (state: FamilyRegistrationSubmitState) => void;
}): Promise<FamilyRegistrationSubmitResult> {
  const {
    form,
    schoolId,
    classes,
    postBatch,
    onlyLocalIds,
    priorResults,
    resolvedGuardianEntries,
    idempotency,
    mapErrorMessage,
    t,
    onProgress,
  } = options;

  const guardianEntries =
    resolvedGuardianEntries && resolvedGuardianEntries.length > 0
      ? resolvedGuardianEntries
      : collectFamilyGuardianEntries(form);

  const priorById = new Map((priorResults ?? []).map((r) => [r.localId, r]));
  const results: FamilyChildSubmitResult[] = form.children.map((child) => {
    const prior = priorById.get(child.localId);
    if (prior?.status === 'succeeded') return prior;
    if (onlyLocalIds && !onlyLocalIds.includes(child.localId)) {
      return (
        prior ?? {
          localId: child.localId,
          displayName: childDisplayName(child.profile),
          status: 'pending' as const,
          canRetrySafely: false,
        }
      );
    }
    return {
      localId: child.localId,
      displayName: childDisplayName(child.profile),
      status: 'queued' as const,
      canRetrySafely: false,
    };
  });

  const emit = (
    phase: FamilyRegistrationSubmitState['phase'],
    locked: boolean,
    extra?: Partial<FamilyRegistrationSubmitState>,
  ) => {
    onProgress?.({
      phase,
      results: results.map((r) => ({ ...r })),
      lockedAgainstFullResubmit: locked,
      batchIdempotencyKey: idempotency.currentBatchKey(),
      ...extra,
    });
  };

  let lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
  for (let i = 0; i < results.length; i += 1) {
    if (onlyLocalIds?.includes(results[i].localId) || (!onlyLocalIds && results[i].status === 'queued')) {
      results[i] = { ...results[i], status: 'submitting', canRetrySafely: false };
    }
  }
  emit('submitting', lockedAgainstFullResubmit);

  const request = buildFamilyBatchRegistrationRequest({
    form,
    schoolId,
    classes,
    onlyClientChildIds: onlyLocalIds,
    guardianEntries,
    idempotency,
  });

  let res: ApiResponse<BatchRegistrationResponse>;
  try {
    res = await postBatch(request);
  } catch {
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].status === 'submitting' || results[i].status === 'queued') {
        results[i] = {
          ...results[i],
          status: 'ambiguous',
          canRetrySafely: false,
          errorCode: 'network_error',
          errorMessage: t('admin.student360.familyRegistration.batchErrors.network_error'),
        };
      }
    }
    lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
    const finalState: FamilyRegistrationSubmitResult = {
      phase: 'completed',
      results,
      lockedAgainstFullResubmit,
      batchIdempotencyKey: request.idempotency_key,
      batchStatus: null,
      resolvedGuardianEntries: guardianEntries,
    };
    onProgress?.(finalState);
    return finalState;
  }

  if (!res.success) {
    const error = res.error;
    const ambiguous = isFamilyBatchTransportAmbiguous(error);
    const conflict = isFamilyBatchIdempotencyConflict(error);
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].status !== 'submitting' && results[i].status !== 'queued') continue;
      if (ambiguous) {
        results[i] = {
          ...results[i],
          status: 'ambiguous',
          canRetrySafely: false,
          errorCode: String(error?.code ?? 'network_error'),
          errorMessage: resolveFamilyBatchChildErrorMessage(error, t, mapErrorMessage),
        };
      } else {
        results[i] = {
          ...results[i],
          status: 'failed',
          canRetrySafely: !conflict,
          errorCode: String(error?.code ?? 'error'),
          errorMessage: resolveFamilyBatchChildErrorMessage(error, t, mapErrorMessage),
        };
      }
    }
    lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
    const finalState: FamilyRegistrationSubmitResult = {
      phase: 'completed',
      results,
      lockedAgainstFullResubmit,
      batchIdempotencyKey: request.idempotency_key,
      batchStatus: null,
      resolvedGuardianEntries: guardianEntries,
    };
    onProgress?.(finalState);
    return finalState;
  }

  const batch = parseBatchResponse(res.data);
  if (!batch) {
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].status === 'submitting' || results[i].status === 'queued') {
        results[i] = {
          ...results[i],
          status: 'ambiguous',
          canRetrySafely: false,
          errorCode: 'unexpected_internal_error',
          errorMessage: t('admin.student360.familyRegistration.batchErrors.unexpected_internal_error'),
        };
      }
    }
    const finalState: FamilyRegistrationSubmitResult = {
      phase: 'completed',
      results,
      lockedAgainstFullResubmit: results.some((r) => r.status === 'succeeded'),
      batchIdempotencyKey: request.idempotency_key,
      batchStatus: null,
      resolvedGuardianEntries: guardianEntries,
    };
    onProgress?.(finalState);
    return finalState;
  }

  const byClientId = new Map(batch.children.map((c) => [c.client_child_id, c]));
  for (let i = 0; i < results.length; i += 1) {
    const prior = results[i];
    if (prior.status === 'succeeded') continue;
    if (onlyLocalIds && !onlyLocalIds.includes(prior.localId)) continue;
    results[i] = mapBatchChildToResult({
      prior,
      childResult: byClientId.get(prior.localId),
      batchStatus: batch.status,
      mapErrorMessage,
      t,
    });
  }

  lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
  const nextGuardians = mapGuardiansResolvedToEntries(
    guardianEntries,
    batch.guardians_resolved,
  );

  const finalState: FamilyRegistrationSubmitResult = {
    phase: 'completed',
    results,
    lockedAgainstFullResubmit,
    batchIdempotencyKey: batch.idempotency_key || request.idempotency_key,
    batchStatus: batch.status,
    resolvedGuardianEntries: nextGuardians,
  };
  onProgress?.(finalState);
  return finalState;
}

export function mergeRetryPreservedResults(
  previous: FamilyChildSubmitResult[],
  next: FamilyChildSubmitResult[],
): FamilyChildSubmitResult[] {
  const byId = new Map(next.map((r) => [r.localId, r]));
  return previous.map((prev) => {
    if (prev.status === 'succeeded') return prev;
    return byId.get(prev.localId) ?? prev;
  });
}
