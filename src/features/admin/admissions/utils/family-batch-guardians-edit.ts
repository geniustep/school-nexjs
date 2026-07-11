import type { ApiErrorBody } from '@/types/api';
import { admissionApiErrorMessage } from './admission-errors';

const FAMILY_GUARDIANS_EDIT_ERROR_KEYS: Record<string, string> = {
  family_guardians_edit_forbidden:
    'admin.admissions.family.guardiansEdit.errors.editForbidden',
  family_guardian_not_in_scope: 'admin.admissions.family.guardiansEdit.errors.notInScope',
  family_guardian_duplicate: 'admin.admissions.family.guardiansEdit.errors.duplicate',
  family_primary_guardian_required:
    'admin.admissions.family.guardiansEdit.errors.primaryRequired',
  family_multiple_primary_guardians:
    'admin.admissions.family.guardiansEdit.errors.multiplePrimary',
  family_linked_child_not_in_batch:
    'admin.admissions.family.guardiansEdit.errors.childNotInBatch',
  family_guardian_children_required:
    'admin.admissions.family.guardiansEdit.errors.childrenRequired',
};

export function familyBatchGuardiansApiErrorMessage(
  error: ApiErrorBody,
  t: (key: string) => string,
): string {
  const key = FAMILY_GUARDIANS_EDIT_ERROR_KEYS[error.code];
  if (key) return t(key);

  const detailsCode =
    error.details && typeof error.details === 'object' && 'code' in error.details
      ? String((error.details as { code?: unknown }).code ?? '')
      : '';
  if (detailsCode && FAMILY_GUARDIANS_EDIT_ERROR_KEYS[detailsCode]) {
    return t(FAMILY_GUARDIANS_EDIT_ERROR_KEYS[detailsCode]);
  }

  return admissionApiErrorMessage(error, t);
}

export function canEditFamilyBatchGuardians(
  allowed: { edit_guardians?: boolean } | null | undefined,
): boolean {
  return allowed?.edit_guardians === true;
}
