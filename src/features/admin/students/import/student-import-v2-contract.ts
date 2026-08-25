import {
  STUDENT_IMPORT_BOOLEAN_NO_VALUES,
  STUDENT_IMPORT_BOOLEAN_YES_VALUES,
} from './student-import-constants';
import type { StudentImportNormalizedRow } from './student-import-types';

function trimText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

export function parseStudentImportOptionalBoolean(value: unknown): {
  value: boolean | null;
  valid: boolean;
  provided: boolean;
} {
  if (value == null || value === '') return { value: null, valid: true, provided: false };
  if (value === true) return { value: true, valid: true, provided: true };
  if (value === false) return { value: false, valid: true, provided: true };

  const text = trimText(value)?.toLowerCase();
  if (!text) return { value: null, valid: true, provided: false };
  if (STUDENT_IMPORT_BOOLEAN_YES_VALUES.has(text)) {
    return { value: true, valid: true, provided: true };
  }
  if (STUDENT_IMPORT_BOOLEAN_NO_VALUES.has(text)) {
    return { value: false, valid: true, provided: true };
  }
  return { value: null, valid: false, provided: true };
}

export function fullStudentImportName(first: string | null | undefined, last: string | null | undefined): string | null {
  const parts = [first, last].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export function applyStudentImportV2RawFields(
  normalized: StudentImportNormalizedRow,
  raw: Record<string, unknown>,
): { legalBooleanValid: boolean; legalBooleanProvided: boolean } {
  normalized.first_name_ar = trimText(raw.first_name_ar);
  normalized.last_name_ar = trimText(raw.last_name_ar);
  normalized.first_name_fr = trimText(raw.first_name_fr);
  normalized.last_name_fr = trimText(raw.last_name_fr);
  normalized.guardian_first_name_ar = trimText(raw.guardian_first_name_ar);
  normalized.guardian_last_name_ar = trimText(raw.guardian_last_name_ar);
  normalized.guardian_first_name_fr = trimText(raw.guardian_first_name_fr);
  normalized.guardian_last_name_fr = trimText(raw.guardian_last_name_fr);

  const legal = parseStudentImportOptionalBoolean(raw.guardian_is_legal_guardian);
  normalized.guardian_is_legal_guardian = legal.value;

  return {
    legalBooleanValid: legal.valid,
    legalBooleanProvided: legal.provided,
  };
}

export function hasStudentImportGuardianIdentity(normalized: StudentImportNormalizedRow): boolean {
  return Boolean(
    normalized.guardian_id != null ||
      normalized.guardian_name ||
      normalized.guardian_first_name_ar ||
      normalized.guardian_last_name_ar ||
      normalized.guardian_first_name_fr ||
      normalized.guardian_last_name_fr
  );
}
