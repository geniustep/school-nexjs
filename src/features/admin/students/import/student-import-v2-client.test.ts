import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  buildStudentImportValidationRequest,
  hasStudentImportEligiblePayloadRows,
} from './student-import-payload';
import { studentImportPreviewNames } from './student-import-preview';
import type { StudentImportReferenceData, StudentImportRowResult } from './student-import-types';
import { validateStudentImportWorkbook } from './student-import-validator';
import { parseStudentImportOptionalBoolean } from './student-import-v2-contract';

const issueMessage = (code: string, field?: string) => (field ? `${code}:${field}` : code);

const emptyReference: StudentImportReferenceData = {
  genders: new Set(),
  studentStatuses: new Set(),
  registrationTypes: new Set(),
  emergencyRelationships: new Set(),
  nationalities: new Map(),
  schools: new Map(),
  academicYears: new Map(),
  levels: new Map(),
  classes: new Map(),
};

const V2_HEADERS = [
  'row_number',
  'school_number',
  'first_name',
  'last_name',
  'first_name_ar',
  'last_name_ar',
  'first_name_fr',
  'last_name_fr',
  'massar_code',
  'gender',
  'date_of_birth',
  'academic_year_label',
  'academic_year_id',
  'level_label',
  'level_id',
  'class_label',
  'class_id',
  'registration_type',
  'previous_school',
  'guardian_pick',
  'guardian_id',
  'guardian_name',
  'guardian_first_name_ar',
  'guardian_last_name_ar',
  'guardian_first_name_fr',
  'guardian_last_name_fr',
  'guardian_mobile',
  'guardian_relationship_type',
  'guardian_is_legal_guardian',
  'guardian_is_primary_contact',
  'guardian_is_financial_responsible',
] as const;

async function buildWorkbook(data: Record<string, unknown>): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const meta = workbook.addWorksheet('_SSC_Meta');
  meta.addRow(['key', 'value']);
  meta.addRow(['contract_id', 'SSC-STUDENT-IMPORT']);
  meta.addRow(['template_version', 1]);
  meta.addRow(['import_mode', 'create']);
  meta.addRow(['school_id', 3]);
  meta.addRow(['school_name', 'Test School']);
  meta.addRow(['academic_year_id', 1]);
  meta.addRow(['academic_year_name', '2026-2027']);

  const years = workbook.addWorksheet('Ref_AcademicYears');
  years.addRow(['id', 'code', 'name', 'state', 'is_current']);
  years.addRow([1, '2026-2027', '2026-2027', 'active', 'yes']);

  const levels = workbook.addWorksheet('Ref_Levels');
  levels.addRow(['id', 'code', 'name', 'display_label']);
  levels.addRow([176, 'M1', 'Level M1', 'Level M1']);

  const classes = workbook.addWorksheet('Ref_Classes');
  classes.addRow(['id', 'name', 'code', 'year', 'level', 'track', 'display_label']);
  classes.addRow([2059, 'M1A', '2026-M1-M1A', '2026-2027', 'Level M1', '', 'M1A · Level M1 · 2026-2027']);

  const students = workbook.addWorksheet('Students');
  students.addRow([...V2_HEADERS]);
  students.addRow(V2_HEADERS.map((header) => {
    const example: Record<string, unknown> = {
      row_number: 1,
      first_name: 'Example',
      last_name: 'Row',
      class_label: 'M1A · Level M1 · 2026-2027',
      class_id: 2059,
      registration_type: 'new',
      guardian_name: 'Example Parent',
      guardian_mobile: '0612345678',
    };
    return example[header] ?? '';
  }));

  const defaults: Record<string, unknown> = {
    row_number: 2,
    school_number: 'SN-2',
    first_name: 'Sara',
    last_name: 'Test',
    massar_code: 'A123456780',
    gender: 'female',
    date_of_birth: '2014-01-01',
    academic_year_label: '2026-2027',
    academic_year_id: 1,
    level_label: 'Level M1',
    level_id: 176,
    class_label: 'M1A · Level M1 · 2026-2027',
    class_id: 2059,
    registration_type: 'new',
    guardian_mobile: '0612345678',
    guardian_relationship_type: 'mother',
  };
  const row = { ...defaults, ...data };
  students.addRow(V2_HEADERS.map((header) => row[header] ?? ''));
  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

function invalidRow(): StudentImportRowResult {
  return {
    rowNumber: 3,
    raw: { first_name: 'Bad' },
    normalized: { first_name: 'Bad', last_name: 'Row' },
    errors: [{ code: 'missing_required_field', message: 'x', severity: 'error' }],
    warnings: [],
    status: 'invalid',
  };
}

describe('student import v2 boolean contract', () => {
  it('distinguishes false from missing and rejects unknown values', () => {
    expect(parseStudentImportOptionalBoolean(false)).toEqual({ value: false, valid: true, provided: true });
    expect(parseStudentImportOptionalBoolean('false')).toEqual({ value: false, valid: true, provided: true });
    expect(parseStudentImportOptionalBoolean('')).toEqual({ value: null, valid: true, provided: false });
    expect(parseStudentImportOptionalBoolean('maybe')).toEqual({ value: null, valid: false, provided: true });
  });
});

describe('student import v2 workbook contract', () => {
  it('parses bilingual student and guardian identity and preserves legal=false in payload', async () => {
    const buffer = await buildWorkbook({
      first_name_ar: 'سارة',
      last_name_ar: 'العلمي',
      first_name_fr: 'Sara',
      last_name_fr: 'Alami',
      guardian_name: '',
      guardian_first_name_ar: 'مريم',
      guardian_last_name_ar: 'العلمي',
      guardian_first_name_fr: 'Mariam',
      guardian_last_name_fr: 'Alami',
      guardian_is_legal_guardian: false,
    });

    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.fileErrors.filter((item) => item.severity === 'error')).toHaveLength(0);
    expect(result.summary.invalidRows).toBe(0);
    expect(result.rows).toHaveLength(1);

    const row = result.rows[0];
    expect(row.normalized).toMatchObject({
      first_name_ar: 'سارة',
      last_name_ar: 'العلمي',
      first_name_fr: 'Sara',
      last_name_fr: 'Alami',
      guardian_first_name_ar: 'مريم',
      guardian_last_name_ar: 'العلمي',
      guardian_first_name_fr: 'Mariam',
      guardian_last_name_fr: 'Alami',
      guardian_is_legal_guardian: false,
    });

    const payload = buildStudentImportValidationRequest({
      activeSchoolId: 3,
      sourceFilename: 'students.xlsx',
      rows: result.rows,
      templateVersion: result.templateVersion,
    });
    expect(payload.rows[0]).toMatchObject({
      first_name_ar: 'سارة',
      last_name_ar: 'العلمي',
      first_name_fr: 'Sara',
      last_name_fr: 'Alami',
      guardian_first_name_ar: 'مريم',
      guardian_last_name_ar: 'العلمي',
      guardian_first_name_fr: 'Mariam',
      guardian_last_name_fr: 'Alami',
      guardian_is_legal_guardian: false,
    });
  });

  it('marks an invalid legal value as a local row error', async () => {
    const buffer = await buildWorkbook({
      guardian_name: 'Parent Name',
      guardian_is_legal_guardian: 'maybe',
    });
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.summary.invalidRows).toBe(1);
    expect(result.rows[0].errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'invalid_boolean', field: 'guardian_is_legal_guardian' }),
      ]),
    );
  });

  it('keeps old V1 rows backward compatible when legal status is absent', async () => {
    const buffer = await buildWorkbook({
      guardian_name: 'Parent Name',
      guardian_is_legal_guardian: '',
    });
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.summary.invalidRows).toBe(0);
    expect(result.rows[0].normalized.guardian_is_legal_guardian).toBeNull();
    const payload = buildStudentImportValidationRequest({
      activeSchoolId: 3,
      sourceFilename: 'students.xlsx',
      rows: result.rows,
    });
    expect(payload.rows[0]).not.toHaveProperty('guardian_is_legal_guardian');
  });
});

describe('student import v2 preview and eligible rows', () => {
  it('exposes Arabic and French student and guardian names for preview', () => {
    const row: StudentImportRowResult = {
      rowNumber: 3,
      raw: {},
      normalized: {
        first_name: 'Sara',
        last_name: 'Alami',
        first_name_ar: 'سارة',
        last_name_ar: 'العلمي',
        first_name_fr: 'Sara',
        last_name_fr: 'Alami',
        guardian_first_name_ar: 'مريم',
        guardian_last_name_ar: 'العلمي',
        guardian_first_name_fr: 'Mariam',
        guardian_last_name_fr: 'Alami',
        guardian_is_legal_guardian: true,
      },
      errors: [],
      warnings: [],
      status: 'valid',
    };
    expect(studentImportPreviewNames(row)).toMatchObject({
      studentAr: 'سارة العلمي',
      studentFr: 'Sara Alami',
      guardianAr: 'مريم العلمي',
      guardianFr: 'Mariam Alami',
    });
  });

  it('reports no eligible payload rows when every local row is invalid', () => {
    expect(hasStudentImportEligiblePayloadRows([invalidRow()])).toBe(false);
  });
});
