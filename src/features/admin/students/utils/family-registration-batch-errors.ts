import type { ApiErrorBody } from '@/types/api';
import type { BatchChildError } from '@/types/student-batch-registration';

/** Known batch / child error codes from REGISTRATION-FINANCE-3D1. */
export const FAMILY_BATCH_ERROR_CODES = [
  'validation_error',
  'duplicate_student',
  'guardian_not_found',
  'guardian_tenant_mismatch',
  'missing_capability',
  'invalid_billing_responsibility',
  'invalid_academic_enrollment',
  'invalid_finance_payload',
  'idempotency_conflict',
  'retryable_server_error',
  'unexpected_internal_error',
  'forbidden',
  'conflict',
  'network_error',
  'timeout',
  'server_error',
] as const;

export type FamilyBatchErrorCode = (typeof FAMILY_BATCH_ERROR_CODES)[number] | string;

export function familyBatchErrorMessageKey(code: string | undefined | null): string {
  switch (String(code ?? '')) {
    case 'validation_error':
      return 'admin.student360.familyRegistration.batchErrors.validation_error';
    case 'duplicate_student':
    case 'duplicate':
    case 'duplicate_massar_code':
      return 'admin.student360.familyRegistration.batchErrors.duplicate_student';
    case 'guardian_not_found':
      return 'admin.student360.familyRegistration.batchErrors.guardian_not_found';
    case 'guardian_tenant_mismatch':
      return 'admin.student360.familyRegistration.batchErrors.guardian_tenant_mismatch';
    case 'missing_capability':
    case 'forbidden':
      return 'admin.student360.familyRegistration.batchErrors.missing_capability';
    case 'invalid_billing_responsibility':
      return 'admin.student360.familyRegistration.batchErrors.invalid_billing_responsibility';
    case 'invalid_academic_enrollment':
      return 'admin.student360.familyRegistration.batchErrors.invalid_academic_enrollment';
    case 'invalid_finance_payload':
      return 'admin.student360.familyRegistration.batchErrors.invalid_finance_payload';
    case 'idempotency_conflict':
    case 'conflict':
      return 'admin.student360.familyRegistration.batchErrors.idempotency_conflict';
    case 'retryable_server_error':
    case 'server_error':
    case 'timeout':
      return 'admin.student360.familyRegistration.batchErrors.retryable_server_error';
    case 'unexpected_internal_error':
      return 'admin.student360.familyRegistration.batchErrors.unexpected_internal_error';
    case 'network_error':
      return 'admin.student360.familyRegistration.batchErrors.network_error';
    default:
      return 'admin.student360.familyRegistration.batchErrors.generic';
  }
}

export function resolveFamilyBatchChildErrorMessage(
  error: BatchChildError | ApiErrorBody | null | undefined,
  t: (key: string) => string,
  fallbackMapper?: (error: ApiErrorBody | undefined) => string,
): string {
  if (!error) return t('admin.student360.familyRegistration.batchErrors.generic');
  const code = String(error.code ?? '');
  const key = familyBatchErrorMessageKey(code);
  const localized = t(key);
  if (localized && localized !== key) return localized;
  if (typeof error.message === 'string' && error.message.trim()) return error.message.trim();
  if (fallbackMapper && 'code' in error) {
    return fallbackMapper(error as ApiErrorBody);
  }
  return t('admin.student360.familyRegistration.batchErrors.generic');
}

export function isFamilyBatchTransportAmbiguous(error: ApiErrorBody | undefined): boolean {
  const code = String(error?.code ?? '');
  return (
    code === 'network_error' ||
    code === 'timeout' ||
    code === 'server_error' ||
    code === 'retryable_server_error' ||
    code === '' ||
    error == null
  );
}

export function isFamilyBatchIdempotencyConflict(error: ApiErrorBody | undefined): boolean {
  const code = String(error?.code ?? '');
  return code === 'idempotency_conflict' || code === 'conflict';
}
