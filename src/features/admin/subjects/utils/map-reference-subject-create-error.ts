import type { ApiErrorBody } from '@/types/api';
import type { ReferenceSubjectApiErrorCode } from '@/types/reference-subjects';
import type { ReferenceSubjectFormField } from './reference-subject-create-form';

type Translate = (key: string, params?: Record<string, string | number>) => string;

export type MappedReferenceSubjectCreateError = {
  code: string;
  message: string;
  field: ReferenceSubjectFormField | null;
};

const FIELD_BY_CODE: Partial<Record<ReferenceSubjectApiErrorCode, ReferenceSubjectFormField>> = {
  reference_subject_code_conflict: 'code',
  reference_subject_cycle_not_found: 'cycle',
  reference_subject_level_not_found: 'levels',
  reference_subject_cycle_level_mismatch: 'levels',
  invalid_payload: 'form',
  reference_subject_manage_forbidden: 'form',
};

const MESSAGE_KEY_BY_CODE: Record<ReferenceSubjectApiErrorCode, string> = {
  reference_subject_manage_forbidden: 'admin.referenceSubjects.errors.manageForbidden',
  reference_subject_code_conflict: 'admin.referenceSubjects.errors.codeConflict',
  reference_subject_cycle_not_found: 'admin.referenceSubjects.errors.cycleNotFound',
  reference_subject_level_not_found: 'admin.referenceSubjects.errors.levelNotFound',
  reference_subject_cycle_level_mismatch: 'admin.referenceSubjects.errors.cycleLevelMismatch',
  invalid_payload: 'admin.referenceSubjects.errors.invalidPayload',
};

export function mapReferenceSubjectCreateError(
  error: ApiErrorBody,
  t: Translate,
): MappedReferenceSubjectCreateError {
  const code = String(error.code || '');
  const known = MESSAGE_KEY_BY_CODE[code as ReferenceSubjectApiErrorCode];
  if (known) {
    return {
      code,
      message: t(known),
      field: FIELD_BY_CODE[code as ReferenceSubjectApiErrorCode] ?? 'form',
    };
  }

  const status =
    typeof error.details?.status === 'number' ? (error.details.status as number) : null;
  if (status === 403 || code === 'forbidden' || code === 'permission_denied') {
    return {
      code: code || 'reference_subject_manage_forbidden',
      message: t('admin.referenceSubjects.errors.manageForbidden'),
      field: 'form',
    };
  }

  return {
    code: code || 'invalid_payload',
    message: t('admin.referenceSubjects.errors.invalidPayload'),
    field: 'form',
  };
}
