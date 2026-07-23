import type { ApiErrorBody } from '@/types/api';
import type {
  FamilyBatchConvertApplicationResult,
  FamilyBatchConvertApplicationResultStatus,
  FamilyBatchConvertBatchStatus,
  FamilyBatchConvertToStudentsResult,
} from '@/types/admission';
import { admissionApiErrorMessage } from './admission-errors';

export type FamilyBatchConvertUiOutcome =
  | 'completed'
  | 'partially_completed'
  | 'failed'
  | 'replayed'
  | 'network_uncertainty'
  | 'idempotency_conflict'
  | 'error';

const IDEMPOTENCY_CONFLICT_CODES = new Set([
  'idempotency_conflict',
  'family_batch_idempotency_conflict',
  'family_convert_idempotency_conflict',
  'conflict',
]);

export function isFamilyBatchConvertIdempotencyConflict(error: ApiErrorBody | null | undefined): boolean {
  if (!error) return false;
  if (IDEMPOTENCY_CONFLICT_CODES.has(error.code)) return true;
  const status = error.details?.status;
  return status === 409;
}

export function isFamilyBatchConvertNetworkUncertainty(
  error: ApiErrorBody | null | undefined,
  httpStatus?: number,
): boolean {
  if (!error) return false;
  if (error.code === 'network_error' || error.code === 'timeout') return true;
  if (httpStatus === 0) return true;
  const status = typeof error.details?.status === 'number' ? error.details.status : httpStatus;
  // Gateway / timeout class — request may have reached Odoo.
  return status === 502 || status === 503 || status === 504;
}

export function familyBatchConvertApiErrorMessage(
  error: ApiErrorBody,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (isFamilyBatchConvertIdempotencyConflict(error)) {
    return t('admin.admissions.family.selectiveConversion.errors.idempotencyConflict');
  }
  if (error.code === 'unauthenticated' || error.details?.status === 401) {
    return t('admin.admissions.family.selectiveConversion.errors.unauthenticated');
  }
  if (
    error.code === 'forbidden' ||
    error.code === 'permission_denied' ||
    error.details?.status === 403
  ) {
    return t('admin.admissions.family.selectiveConversion.errors.forbidden');
  }
  if (error.code === 'not_found' || error.details?.status === 404) {
    return t('admin.admissions.family.selectiveConversion.errors.notFound');
  }
  if (error.code === 'validation_error' || error.details?.status === 400) {
    if (error.message?.trim()) return error.message.trim();
    return t('admin.admissions.family.selectiveConversion.errors.validation');
  }
  if (isFamilyBatchConvertNetworkUncertainty(error)) {
    return t('admin.admissions.family.selectiveConversion.errors.networkUncertainty');
  }
  if (error.message?.trim()) return admissionApiErrorMessage(error, t);
  return t('admin.admissions.family.selectiveConversion.errors.failed');
}

export function normalizeFamilyBatchConvertResult(
  raw: FamilyBatchConvertToStudentsResult | null | undefined,
): FamilyBatchConvertToStudentsResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const applications = Array.isArray(raw.applications)
    ? raw.applications.map(normalizeApplicationResult).filter(Boolean) as FamilyBatchConvertApplicationResult[]
    : [];
  const status = String(raw.status ?? '').trim() || 'failed';
  return {
    ...raw,
    batch_id: Number(raw.batch_id),
    status: status as FamilyBatchConvertBatchStatus,
    applications,
    requested_count:
      typeof raw.requested_count === 'number'
        ? raw.requested_count
        : applications.length,
    succeeded_count:
      typeof raw.succeeded_count === 'number'
        ? raw.succeeded_count
        : countByStatus(applications, ['succeeded', 'replayed']),
    replayed_count:
      typeof raw.replayed_count === 'number'
        ? raw.replayed_count
        : countByStatus(applications, ['replayed']),
    already_registered_count:
      typeof raw.already_registered_count === 'number'
        ? raw.already_registered_count
        : countByStatus(applications, ['already_registered']),
    failed_count:
      typeof raw.failed_count === 'number'
        ? raw.failed_count
        : countByStatus(applications, ['failed', 'ineligible']),
  };
}

function normalizeApplicationResult(
  raw: FamilyBatchConvertApplicationResult,
): FamilyBatchConvertApplicationResult | null {
  if (!raw || typeof raw !== 'object') return null;
  const applicationId = Number(raw.application_id);
  if (!Number.isFinite(applicationId) || applicationId <= 0) return null;
  const studentRaw = raw.student_id;
  const studentId =
    typeof studentRaw === 'number' && Number.isFinite(studentRaw) && studentRaw > 0
      ? studentRaw
      : null;
  return {
    ...raw,
    application_id: applicationId,
    status: (String(raw.status ?? 'failed').trim() ||
      'failed') as FamilyBatchConvertApplicationResultStatus,
    student_id: studentId,
    code: typeof raw.code === 'string' ? raw.code : null,
    message: typeof raw.message === 'string' ? raw.message : null,
    replayed: raw.replayed === true,
  };
}

function countByStatus(
  applications: FamilyBatchConvertApplicationResult[],
  statuses: string[],
): number {
  const set = new Set(statuses);
  return applications.filter((app) => set.has(String(app.status))).length;
}

export function resolveFamilyBatchConvertUiOutcome(
  result: FamilyBatchConvertToStudentsResult | null,
): FamilyBatchConvertUiOutcome {
  if (!result) return 'failed';
  if (result.replayed === true) return 'replayed';
  const status = String(result.status);
  if (status === 'completed') return 'completed';
  if (status === 'partially_completed') return 'partially_completed';
  if (status === 'failed') return 'failed';
  return 'failed';
}

export function familyBatchConvertSummaryKey(
  outcome: FamilyBatchConvertUiOutcome,
): string {
  switch (outcome) {
    case 'completed':
      return 'admin.admissions.family.selectiveConversion.summary.completed';
    case 'partially_completed':
      return 'admin.admissions.family.selectiveConversion.summary.partiallyCompleted';
    case 'replayed':
      return 'admin.admissions.family.selectiveConversion.summary.replayed';
    case 'failed':
      return 'admin.admissions.family.selectiveConversion.summary.failed';
    case 'network_uncertainty':
      return 'admin.admissions.family.selectiveConversion.errors.networkUncertainty';
    case 'idempotency_conflict':
      return 'admin.admissions.family.selectiveConversion.errors.idempotencyConflict';
    default:
      return 'admin.admissions.family.selectiveConversion.errors.failed';
  }
}

export function familyBatchConvertAppStatusLabelKey(
  status: string,
): string {
  switch (status) {
    case 'succeeded':
      return 'admin.admissions.family.selectiveConversion.appStatus.succeeded';
    case 'replayed':
      return 'admin.admissions.family.selectiveConversion.appStatus.replayed';
    case 'already_registered':
      return 'admin.admissions.family.selectiveConversion.appStatus.alreadyRegistered';
    case 'ineligible':
      return 'admin.admissions.family.selectiveConversion.appStatus.ineligible';
    case 'failed':
      return 'admin.admissions.family.selectiveConversion.appStatus.failed';
    default:
      return 'admin.admissions.family.selectiveConversion.appStatus.failed';
  }
}

export function familyBatchConvertEligibilityLabelKey(
  reason: string,
): string {
  switch (reason) {
    case 'eligible':
      return 'admin.admissions.family.selectiveConversion.eligibility.eligible';
    case 'already_registered':
      return 'admin.admissions.family.selectiveConversion.eligibility.alreadyRegistered';
    case 'ineligible':
      return 'admin.admissions.family.selectiveConversion.eligibility.ineligible';
    case 'not_ready':
      return 'admin.admissions.family.selectiveConversion.eligibility.notReady';
    case 'converting':
      return 'admin.admissions.family.selectiveConversion.eligibility.converting';
    default:
      return 'admin.admissions.family.selectiveConversion.eligibility.ineligible';
  }
}
