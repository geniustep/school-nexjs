import { STUDENT_IMPORT_REQUIRED_FIELDS, STUDENT_IMPORT_V1_REQUIRED_ROW_FIELDS } from './student-import-constants';
import {
  detectMissingRequiredColumns,
  detectUnknownColumns,
  parseStudentImportWorkbook,
} from './student-import-parser';
import {
  buildStudentImportWorkbookRefMaps,
  mapV1RawRowToNormalized,
  parseStudentImportMetaV1,
} from './student-import-parser-v1';
import {
  isStudentImportRowEmpty,
  normalizeStudentImportRow,
  rowFingerprint,
} from './student-import-normalizer';
import type {
  StudentImportIssue,
  StudentImportReferenceData,
  StudentImportRowResult,
  StudentImportSummary,
  StudentImportValidationResult,
} from './student-import-types';
import { requiresDepartureReason, requiresPreviousSchool } from '../utils/student-profile';

type IssueTranslator = (code: string, field?: string) => string;

function issue(code: string, message: string, severity: StudentImportIssue['severity'], field?: string): StudentImportIssue {
  return { code, field, message, severity };
}

function isFutureDate(value: string): boolean {
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return false;
  const [y, m, d] = parts;
  const input = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return input.getTime() > today.getTime();
}

function isBefore(a: string, b: string): boolean {
  return !!a && !!b && a < b;
}

function validateEmail(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isV1RowEmpty(normalized: import('./student-import-types').StudentImportNormalizedRow): boolean {
  return (
    !normalized.first_name &&
    !normalized.last_name &&
    !normalized.school_number &&
    !normalized.class_code &&
    !normalized.class_id
  );
}

function validateV1Row(
  rowNumber: number,
  raw: Record<string, unknown>,
  meta: import('./student-import-parser-v1').StudentImportMetaV1,
  refs: import('./student-import-parser-v1').StudentImportWorkbookRefMaps,
  t: IssueTranslator,
): StudentImportRowResult {
  const normalized = mapV1RawRowToNormalized(raw, meta, refs);
  const errors: StudentImportIssue[] = [];
  const warnings: StudentImportIssue[] = [];

  if (isV1RowEmpty(normalized)) {
    return { rowNumber, raw, normalized, errors, warnings, status: 'valid' };
  }

  for (const field of STUDENT_IMPORT_V1_REQUIRED_ROW_FIELDS) {
    const value = normalized[field as keyof typeof normalized];
    if (value == null || value === '') {
      errors.push(issue('missing_required_field', t('missing_required_field', field), 'error', field));
    }
  }

  if (normalized.registration_type === 'transfer' && !normalized.previous_school) {
    errors.push(
      issue('missing_required_field', t('missing_required_field', 'previous_school'), 'error', 'previous_school'),
    );
  }

  if (normalized.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(normalized.date_of_birth)) {
    errors.push(issue('invalid_date', t('invalid_date', 'date_of_birth'), 'error', 'date_of_birth'));
  }

  if (normalized.email && !validateEmail(normalized.email)) {
    errors.push(issue('invalid_email', t('invalid_email', 'email'), 'error', 'email'));
  }

  const status: StudentImportRowResult['status'] =
    errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return { rowNumber, raw, normalized, errors, warnings, status };
}

function validateLegacyRow(
  rowNumber: number,
  raw: Record<string, unknown>,
  reference: StudentImportReferenceData,
  t: IssueTranslator,
): StudentImportRowResult {
  const normalized = normalizeStudentImportRow(raw);
  const errors: StudentImportIssue[] = [];
  const warnings: StudentImportIssue[] = [];

  if (isStudentImportRowEmpty(normalized)) {
    return { rowNumber, raw, normalized, errors, warnings, status: 'valid' };
  }

  for (const field of STUDENT_IMPORT_REQUIRED_FIELDS) {
    const value = normalized[field];
    if (value == null || value === '') {
      errors.push(issue('missing_required_field', t('missing_required_field', field), 'error', field));
    }
  }

  if (normalized.date_of_birth) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.date_of_birth)) {
      errors.push(issue('invalid_date', t('invalid_date', 'date_of_birth'), 'error', 'date_of_birth'));
    } else if (isFutureDate(normalized.date_of_birth)) {
      errors.push(issue('future_birth_date', t('future_birth_date', 'date_of_birth'), 'error', 'date_of_birth'));
    }
  }

  for (const field of ['admission_date', 'actual_join_date'] as const) {
    const value = normalized[field];
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push(issue('invalid_date', t('invalid_date', field), 'error', field));
    }
  }

  if (
    normalized.actual_join_date &&
    normalized.date_of_birth &&
    isBefore(normalized.actual_join_date, normalized.date_of_birth)
  ) {
    errors.push(issue('invalid_date', t('join_before_birth', 'actual_join_date'), 'error', 'actual_join_date'));
  }

  if (normalized.email && !validateEmail(normalized.email)) {
    errors.push(issue('invalid_email', t('invalid_email', 'email'), 'error', 'email'));
  }

  if (normalized.gender && !reference.genders.has(normalized.gender)) {
    errors.push(issue('invalid_gender', t('invalid_gender', 'gender'), 'error', 'gender'));
  }

  if (normalized.status && !reference.studentStatuses.has(normalized.status)) {
    errors.push(issue('invalid_student_status', t('invalid_student_status', 'status'), 'error', 'status'));
  }

  if (
    normalized.registration_type &&
    !reference.registrationTypes.has(normalized.registration_type)
  ) {
    errors.push(
      issue('invalid_registration_type', t('invalid_registration_type', 'registration_type'), 'error', 'registration_type'),
    );
  }

  if (
    normalized.emergency_relationship &&
    !reference.emergencyRelationships.has(normalized.emergency_relationship)
  ) {
    errors.push(
      issue(
        'invalid_emergency_relationship',
        t('invalid_emergency_relationship', 'emergency_relationship'),
        'error',
        'emergency_relationship',
      ),
    );
  }

  if (normalized.nationality_code) {
    const nationalityId = reference.nationalities.get(normalized.nationality_code);
    if (nationalityId == null) {
      errors.push(issue('unknown_nationality', t('unknown_nationality', 'nationality_code'), 'error', 'nationality_code'));
    } else {
      normalized.nationality_id = nationalityId;
    }
  }

  const school = normalized.school_code ? reference.schools.get(normalized.school_code) : undefined;
  if (normalized.school_code && !school) {
    errors.push(issue('unknown_school', t('unknown_school', 'school_code'), 'error', 'school_code'));
  } else if (school) {
    normalized.school_id = school.id;
  }

  const year = normalized.academic_year_code
    ? reference.academicYears.get(normalized.academic_year_code)
    : undefined;
  if (normalized.academic_year_code && !year) {
    errors.push(
      issue('unknown_academic_year', t('unknown_academic_year', 'academic_year_code'), 'error', 'academic_year_code'),
    );
  } else if (year) {
    normalized.academic_year_id = year.id;
  }

  const level = normalized.level_code ? reference.levels.get(normalized.level_code) : undefined;
  if (normalized.level_code && !level) {
    errors.push(issue('unknown_level', t('unknown_level', 'level_code'), 'error', 'level_code'));
  } else if (level) {
    normalized.level_id = level.id;
    if (school && level.schoolId != null && level.schoolId !== school.id) {
      errors.push(issue('class_school_mismatch', t('class_school_mismatch', 'level_code'), 'error', 'level_code'));
    }
    if (year && level.academicYearId != null && level.academicYearId !== year.id) {
      errors.push(issue('class_year_mismatch', t('class_year_mismatch', 'level_code'), 'error', 'level_code'));
    }
  }

  const cls = normalized.class_code ? reference.classes.get(normalized.class_code) : undefined;
  if (normalized.class_code && !cls) {
    errors.push(issue('unknown_class', t('unknown_class', 'class_code'), 'error', 'class_code'));
  } else if (cls) {
    normalized.class_id = cls.id;
    if (school && cls.schoolId != null && cls.schoolId !== school.id) {
      errors.push(issue('class_school_mismatch', t('class_school_mismatch', 'class_code'), 'error', 'class_code'));
    }
    if (year && cls.academicYearId != null && cls.academicYearId !== year.id) {
      errors.push(issue('class_year_mismatch', t('class_year_mismatch', 'class_code'), 'error', 'class_code'));
    }
    if (level && cls.levelId != null && cls.levelId !== level.id) {
      errors.push(issue('class_level_mismatch', t('class_level_mismatch', 'class_code'), 'error', 'class_code'));
    }
  }

  if (raw.is_repeating != null && String(raw.is_repeating).trim() !== '' && normalized.is_repeating == null) {
    errors.push(issue('invalid_boolean', t('invalid_boolean', 'is_repeating'), 'error', 'is_repeating'));
  }

  if (normalized.is_repeating != null && typeof normalized.is_repeating !== 'boolean') {
    errors.push(issue('invalid_boolean', t('invalid_boolean', 'is_repeating'), 'error', 'is_repeating'));
  }

  if (requiresPreviousSchool(normalized.registration_type ?? '') && !normalized.previous_school) {
    errors.push(
      issue('missing_required_field', t('missing_required_field', 'previous_school'), 'error', 'previous_school'),
    );
  }

  if (requiresDepartureReason(normalized.status ?? '') && !normalized.departure_reason) {
    errors.push(
      issue('missing_required_field', t('missing_required_field', 'departure_reason'), 'error', 'departure_reason'),
    );
  }

  if (normalized.emergency_contact_name && !normalized.emergency_phone) {
    warnings.push(
      issue('missing_emergency_phone', t('missing_emergency_phone', 'emergency_phone'), 'warning', 'emergency_phone'),
    );
  }

  const status: StudentImportRowResult['status'] =
    errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid';

  return { rowNumber, raw, normalized, errors, warnings, status };
}

function buildSummary(rows: StudentImportRowResult[]): StudentImportSummary {
  let validRows = 0;
  let warningRows = 0;
  let invalidRows = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const row of rows) {
    if (row.status === 'valid') validRows += 1;
    if (row.status === 'warning') warningRows += 1;
    if (row.status === 'invalid') invalidRows += 1;
    totalErrors += row.errors.length;
    totalWarnings += row.warnings.length;
  }

  return {
    totalRows: rows.length,
    validRows,
    warningRows,
    invalidRows,
    totalErrors,
    totalWarnings,
  };
}

function applyDuplicateDetection(rows: StudentImportRowResult[], t: IssueTranslator): void {
  const schoolNumbers = new Map<string, number>();
  const massarCodes = new Map<string, number>();
  const fingerprints = new Map<string, number>();

  for (const row of rows) {
    if (row.status === 'valid' && isStudentImportRowEmpty(row.normalized)) continue;

    const schoolKey = `${row.normalized.school_code ?? ''}::${row.normalized.school_number ?? ''}`;
    if (row.normalized.school_number && row.normalized.school_code) {
      const first = schoolNumbers.get(schoolKey);
      if (first != null) {
        row.errors.push(
          issue(
            'duplicate_school_number_in_file',
            t('duplicate_school_number_in_file', 'school_number'),
            'error',
            'school_number',
          ),
        );
        row.status = 'invalid';
      } else {
        schoolNumbers.set(schoolKey, row.rowNumber);
      }
    }

    const massarKey = `${row.normalized.school_code ?? ''}::${row.normalized.massar_code ?? ''}`;
    if (row.normalized.massar_code && row.normalized.school_code) {
      const first = massarCodes.get(massarKey);
      if (first != null) {
        row.errors.push(
          issue(
            'duplicate_massar_code_in_file',
            t('duplicate_massar_code_in_file', 'massar_code'),
            'error',
            'massar_code',
          ),
        );
        row.status = 'invalid';
      } else {
        massarCodes.set(massarKey, row.rowNumber);
      }
    }

    const fingerprint = rowFingerprint(row.normalized);
    const firstRow = fingerprints.get(fingerprint);
    if (firstRow != null && !isStudentImportRowEmpty(row.normalized)) {
      row.errors.push(issue('duplicate_row', t('duplicate_row'), 'error'));
      row.status = 'invalid';
    } else if (!isStudentImportRowEmpty(row.normalized)) {
      fingerprints.set(fingerprint, row.rowNumber);
    }
  }
}

export async function validateStudentImportWorkbook(
  buffer: ArrayBuffer,
  reference: StudentImportReferenceData,
  t: IssueTranslator,
): Promise<StudentImportValidationResult> {
  const parsed = await parseStudentImportWorkbook(buffer, (code, field) => t(code, field));
  const fileErrors = [...parsed.fileErrors];

  if (parsed.format === 'odoo_v1') {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const meta = parsed.meta ?? parseStudentImportMetaV1(workbook);
    const refs = buildStudentImportWorkbookRefMaps(workbook);

    const rows = parsed.rows.map((row) => validateV1Row(row.rowNumber, row.raw, meta, refs, t));

    const summary = buildSummary(rows);

    return {
      templateVersion: parsed.templateVersion,
      importMode: parsed.importMode,
      format: parsed.format,
      meta: parsed.meta,
      fileErrors,
      rows,
      summary,
      readyForImport: fileErrors.length === 0 && summary.invalidRows === 0,
    };
  }

  for (const column of detectUnknownColumns(parsed.headers)) {
    fileErrors.push(issue('unknown_column', t('unknown_column', column), 'error', column));
  }

  for (const column of detectMissingRequiredColumns(parsed.headers)) {
    fileErrors.push(issue('missing_required_field', t('missing_required_field', column), 'error', column));
  }

  const rows = parsed.rows
    .filter((row) => !isStudentImportRowEmpty(normalizeStudentImportRow(row.raw)))
    .map((row) => validateLegacyRow(row.rowNumber, row.raw, reference, t));

  applyDuplicateDetection(rows, t);

  const summary = buildSummary(rows);
  const readyForImport = fileErrors.length === 0 && summary.invalidRows === 0;

  return {
    templateVersion: parsed.templateVersion,
    format: parsed.format ?? 'legacy_raqeem',
    fileErrors,
    rows,
    summary,
    readyForImport,
  };
}

export function filterStudentImportRows(
  rows: StudentImportRowResult[],
  filter: import('./student-import-types').StudentImportPreviewFilter,
  search: string,
): StudentImportRowResult[] {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filter === 'valid' && row.status !== 'valid') return false;
    if (filter === 'warning' && row.status !== 'warning') return false;
    if (filter === 'invalid' && row.status !== 'invalid') return false;
    if (!q) return true;
    const haystack = [
      String(row.rowNumber),
      row.normalized.first_name ?? '',
      row.normalized.last_name ?? '',
      row.normalized.school_number ?? '',
      row.normalized.massar_code ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}
