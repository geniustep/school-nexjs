import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type { StudentCreatePayload } from '@/types/student-360';
import type { StudentCreateGuardianEntry } from '@/types/student-enrollment-finance';
import {
  childDisplayName,
  type FamilyChildSubmitResult,
  type FamilyRegistrationChildState,
  type FamilyRegistrationFormState,
  type FamilyRegistrationSubmitState,
} from './family-registration-state';
import { buildFamilyChildCreatePayload, collectFamilyGuardianEntries } from './family-registration-payload';
import {
  canSafelyContinueFamilyRegistration,
  extractResolvedGuardiansFromStudentPayload,
  resolveFamilyGuardianEntriesToExisting,
} from './family-registration-resolve-guardians';

export type FamilyRegistrationPostFn = (
  payload: StudentCreatePayload,
) => Promise<ApiResponse<unknown>>;

export type FamilyRegistrationFetchStudentFn = (
  studentId: number,
) => Promise<ApiResponse<unknown>>;

function readStudentId(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.id === 'number' && record.id > 0) return record.id;
  const student = record.student;
  if (student && typeof student === 'object') {
    const id = (student as Record<string, unknown>).id;
    if (typeof id === 'number' && id > 0) return id;
  }
  return null;
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
    code === 'billing_guardian_required' ||
    code === 'billing_guardian_ambiguous' ||
    code === 'billing_guardian_not_linked' ||
    code === 'guardian_identity_candidate_exists' ||
    code === 'duplicate' ||
    code === 'not_found'
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

export function initializeFamilySubmitResults(
  children: FamilyRegistrationChildState[],
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

/**
 * Sequential multi-student create with explicit per-child outcomes.
 * Not backend-atomic across children — callers must present that clearly.
 */
export interface FamilyRegistrationSubmitResult extends FamilyRegistrationSubmitState {
  /** Guardians after resolution — persist into form before a safe failed-only retry. */
  resolvedGuardianEntries: StudentCreateGuardianEntry[];
}

export async function runFamilyRegistrationSubmit(options: {
  form: FamilyRegistrationFormState;
  schoolId: number | null;
  classes?: Parameters<typeof buildFamilyChildCreatePayload>[0]['classes'];
  postStudent: FamilyRegistrationPostFn;
  fetchStudentDetails?: FamilyRegistrationFetchStudentFn;
  /** When set, only these localIds are attempted (safe failed retry). */
  onlyLocalIds?: string[];
  /** Prior results to preserve (e.g. succeeded siblings during failed-only retry). */
  priorResults?: FamilyChildSubmitResult[];
  /** Pre-resolved guardians from a previous successful sibling create. */
  resolvedGuardianEntries?: StudentCreateGuardianEntry[];
  mapErrorMessage: (error: ApiErrorBody | undefined) => string;
  onProgress?: (state: FamilyRegistrationSubmitState) => void;
}): Promise<FamilyRegistrationSubmitResult> {
  const {
    form,
    schoolId,
    classes,
    postStudent,
    fetchStudentDetails,
    onlyLocalIds,
    priorResults,
    resolvedGuardianEntries,
    mapErrorMessage,
    onProgress,
  } = options;

  let guardianEntries =
    resolvedGuardianEntries && resolvedGuardianEntries.length > 0
      ? resolvedGuardianEntries
      : collectFamilyGuardianEntries(form);
  const targets = form.children.filter((child) =>
    onlyLocalIds ? onlyLocalIds.includes(child.localId) : true,
  );

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

  const emit = (phase: FamilyRegistrationSubmitState['phase'], locked: boolean) => {
    onProgress?.({
      phase,
      results: results.map((r) => ({ ...r })),
      lockedAgainstFullResubmit: locked,
    });
  };

  let lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
  emit('submitting', lockedAgainstFullResubmit);

  for (const child of targets) {
    const index = results.findIndex((r) => r.localId === child.localId);
    if (index < 0) continue;

    const alreadyHasSucceededSibling = results.some((r) => r.status === 'succeeded');
    if (
      alreadyHasSucceededSibling &&
      !canSafelyContinueFamilyRegistration(guardianEntries)
    ) {
      results[index] = {
        ...results[index],
        status: 'blocked',
        canRetrySafely: false,
        errorCode: 'guardians_unresolved',
        errorMessage: 'guardians_unresolved',
      };
      for (let i = 0; i < results.length; i += 1) {
        if (results[i].status === 'queued') {
          results[i] = {
            ...results[i],
            status: 'blocked',
            canRetrySafely: false,
            errorCode: 'guardians_unresolved',
            errorMessage: 'guardians_unresolved',
          };
        }
      }
      emit('submitting', lockedAgainstFullResubmit);
      break;
    }

    results[index] = { ...results[index], status: 'submitting', canRetrySafely: false };
    emit('submitting', lockedAgainstFullResubmit);

    const payload = buildFamilyChildCreatePayload({
      child,
      guardianHost: form.guardianHost,
      billing: form.billing,
      guardianEntries,
      schoolId,
      classes,
    });

    let res: ApiResponse<unknown>;
    try {
      res = await postStudent(payload);
    } catch {
      results[index] = {
        ...results[index],
        status: 'ambiguous',
        canRetrySafely: false,
        errorCode: 'network_error',
        errorMessage: 'network_error',
      };
      lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
      // Stop queue — later creates may duplicate if this one actually succeeded.
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

    if (res.success && res.data != null) {
      const studentId = readStudentId(res.data);
      results[index] = {
        ...results[index],
        status: 'succeeded',
        studentId: studentId ?? undefined,
        canRetrySafely: false,
      };
      lockedAgainstFullResubmit = true;

      let resolved = extractResolvedGuardiansFromStudentPayload(res.data);
      if (
        resolved.length === 0 &&
        studentId != null &&
        fetchStudentDetails &&
        guardianEntries.some((e) => e.kind === 'new')
      ) {
        const details = await fetchStudentDetails(studentId);
        if (details.success) {
          resolved = extractResolvedGuardiansFromStudentPayload(details.data);
        }
      }

      if (guardianEntries.some((e) => e.kind === 'new')) {
        const mapped = resolveFamilyGuardianEntriesToExisting(guardianEntries, resolved);
        guardianEntries = mapped.entries;
      }

      emit('submitting', lockedAgainstFullResubmit);
      continue;
    }

    if (isAmbiguousTransportFailure(res)) {
      results[index] = {
        ...results[index],
        status: 'ambiguous',
        canRetrySafely: false,
        errorCode: String(getError(res)?.code ?? 'network_error'),
        errorMessage: mapErrorMessage(getError(res)),
      };
      lockedAgainstFullResubmit = results.some((r) => r.status === 'succeeded');
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
    // Stop further children so partial state stays understandable; user retries failed only.
    for (let i = 0; i < results.length; i += 1) {
      if (results[i].status === 'queued') {
        results[i] = {
          ...results[i],
          status: 'blocked',
          canRetrySafely: false,
          errorCode: 'stopped_after_failure',
          errorMessage: 'stopped_after_failure',
        };
      }
    }
    emit('submitting', lockedAgainstFullResubmit);
    break;
  }

  const finalState: FamilyRegistrationSubmitResult = {
    phase: 'completed',
    results,
    lockedAgainstFullResubmit:
      lockedAgainstFullResubmit || results.some((r) => r.status === 'succeeded'),
    resolvedGuardianEntries: guardianEntries,
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
