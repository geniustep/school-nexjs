import type { ApiErrorBody } from '@/types/api';
import { admissionApiErrorMessage } from './admission-errors';

export function familyAdmissionApiErrorMessage(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const code = error.code;
  if (code === 'family_batch_idempotency_conflict') {
    return t('admin.admissions.family.errors.idempotencyConflict');
  }
  if (code === 'guardian_snapshot_conflict') {
    return t('admin.admissions.family.errors.guardianSnapshotConflict');
  }
  return admissionApiErrorMessage(error, t);
}
