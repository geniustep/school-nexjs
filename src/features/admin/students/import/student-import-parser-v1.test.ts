import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import { STUDENT_IMPORT_TEMPLATE_VERSION } from './student-import-constants';
import {
  buildStudentImportWorkbookRefMaps,
  mapV1RawRowToNormalized,
  parseOdooV1StudentImportWorkbook,
  parseStudentImportMetaV1,
} from './student-import-parser-v1';
import { buildStudentImportValidationRequest, assertValidationPayloadKeys } from './student-import-payload';
import { detectStudentImportTemplateFormat } from './student-import-parser';
import { validateStudentImportWorkbook } from './student-import-validator';
import type { StudentImportReferenceData } from './student-import-types';

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

async function buildV1Workbook(args?: {
  includeMeta?: boolean;
  includeStudents?: boolean;
  includeSchoolColumns?: boolean;
  dataRows?: Array<Record<string, unknown>>;
}): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  if (args?.includeMeta !== false) {
    const meta = workbook.addWorksheet('_SSC_Meta');
    meta.addRow(['key', 'value']);
    meta.addRow(['contract_id', 'SSC-STUDENT-IMPORT']);
    meta.addRow(['template_version', STUDENT_IMPORT_TEMPLATE_VERSION]);
    meta.addRow(['import_mode', 'create']);
    meta.addRow(['school_id', 3]);
    meta.addRow(['school_name', 'Test School']);
    meta.addRow(['academic_year_id', 1]);
    meta.addRow(['academic_year_name', '2026-2027']);
  }

  if (args?.includeSchoolColumns) {
    const schools = workbook.addWorksheet('Ref_Schools');
    schools.addRow(['id', 'name', 'code', 'display_label']);
    schools.addRow([3, 'Test School', 'SCH3', 'Test School · SCH3']);
  }

  const years = workbook.addWorksheet('Ref_AcademicYears');
  years.addRow(['id', 'code', 'name', 'state', 'is_current']);
  years.addRow([1, '2026-2027', '2026-2027', 'active', 'yes']);

  const levels = workbook.addWorksheet('Ref_Levels');
  levels.addRow(['id', 'code', 'name', 'display_label']);
  levels.addRow([176, 'M1', 'Level M1', 'Level M1']);

  const classes = workbook.addWorksheet('Ref_Classes');
  classes.addRow(['id', 'name', 'code', 'year', 'level', 'track', 'display_label']);
  classes.addRow([2059, 'M1A', '2025-M1-M1A', '2026-2027', 'Level M1', '', 'M1A · Level M1 · 2026-2027']);

  if (args?.includeStudents !== false) {
    const students = workbook.addWorksheet('Students');
    const headers = [
      'row_number',
      'school_number',
      ...(args?.includeSchoolColumns ? (['school_label', 'school_id'] as const) : []),
      'first_name',
      'last_name',
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
      'guardian_mobile',
      'guardian_relationship_type',
      'guardian_is_primary_contact',
      'guardian_is_financial_responsible',
    ];
    students.addRow(headers);
    students.addRow([
      1,
      'STU-EXAMPLE-001',
      ...(args?.includeSchoolColumns ? ['Test School · SCH3', 3] : []),
      'Example',
      'Row',
      'A123456789',
      'male',
      '2014-05-15',
      '2026-2027',
      1,
      'Level M1',
      176,
      'M1A · Level M1 · 2026-2027',
      2059,
      'new',
      '',
      '',
      '',
      'Parent',
      '0612345678',
      'father',
      'true',
      'false',
    ]);

    for (const [index, row] of (args?.dataRows ?? []).entries()) {
      students.addRow([
        row.row_number ?? index + 1,
        'school_number' in row ? row.school_number : `SN-${index + 1}`,
        ...(args?.includeSchoolColumns
          ? [row.school_label ?? 'Test School · SCH3', row.school_id ?? '']
          : []),
        row.first_name ?? 'First',
        row.last_name ?? 'Last',
        row.massar_code ?? 'A123456780',
        row.gender ?? 'male',
        row.date_of_birth ?? '2014-01-01',
        row.academic_year_label ?? '2026-2027',
        row.academic_year_id ?? 1,
        row.level_label ?? 'Level M1',
        row.level_id ?? 176,
        'class_label' in row ? row.class_label : 'M1A · Level M1 · 2026-2027',
        'class_id' in row ? row.class_id : 2059,
        row.registration_type ?? 'new',
        row.previous_school ?? '',
        row.guardian_pick ?? '',
        row.guardian_id ?? '',
        row.guardian_name ?? 'Parent Name',
        row.guardian_mobile ?? '0612345678',
        row.guardian_relationship_type ?? '',
        row.guardian_is_primary_contact ?? '',
        row.guardian_is_financial_responsible ?? '',
      ]);
    }
  }

  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}

describe('student import parser v1', () => {
  it('detects odoo v1 format from _SSC_Meta', async () => {
    const buffer = await buildV1Workbook();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(detectStudentImportTemplateFormat(workbook)).toBe('odoo_v1');
  });

  it('reads template_version and import_mode from _SSC_Meta', async () => {
    const buffer = await buildV1Workbook();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const meta = parseStudentImportMetaV1(workbook);
    expect(meta.templateVersion).toBe(STUDENT_IMPORT_TEMPLATE_VERSION);
    expect(meta.importMode).toBe('create');
    expect(meta.schoolId).toBe(3);
    expect(meta.academicYearId).toBe(1);
  });

  it('rejects workbook without _SSC_Meta', async () => {
    const buffer = await buildV1Workbook({ includeMeta: false });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const parsed = parseOdooV1StudentImportWorkbook(workbook, issueMessage);
    expect(parsed.fileErrors.some((issue) => issue.code === 'missing_meta_sheet')).toBe(true);
  });

  it('rejects workbook without Students sheet', async () => {
    const buffer = await buildV1Workbook({ includeStudents: false });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const parsed = parseOdooV1StudentImportWorkbook(workbook, issueMessage);
    expect(parsed.fileErrors.some((issue) => issue.code === 'missing_students_sheet')).toBe(true);
  });

  it('parses input rows and skips the example row', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [{ row_number: 2, school_number: 'SN-100', first_name: 'Ali', last_name: 'Test' }],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const parsed = parseOdooV1StudentImportWorkbook(workbook, issueMessage);
    expect(parsed.fileErrors.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    expect(parsed.fileErrors.some((issue) => issue.code === 'example_row_ignored')).toBe(true);
    expect(parsed.templateVersion).toBe(STUDENT_IMPORT_TEMPLATE_VERSION);
    expect(parsed.importMode).toBe('create');
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].rowNumber).toBe(2);
    expect(parsed.rows[0].raw.school_number).toBe('SN-100');
    expect(parsed.rows[0].raw.first_name).toBe('Ali');
    expect(workbook.getWorksheet('Students')?.getRow(2).getCell(3).value).toBe('Example');
  });

  it('maps v1 row ids and labels into validate payload shape', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [
        {
          row_number: 3,
          school_number: 'SN-200',
          first_name: 'Sara',
          last_name: 'Test',
          guardian_id: 894,
          guardian_name: 'Parent Name',
          guardian_mobile: '0612345678',
          guardian_relationship_type: 'father',
          guardian_is_primary_contact: true,
          guardian_is_financial_responsible: false,
        },
      ],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const parsed = parseOdooV1StudentImportWorkbook(workbook, issueMessage);
    const meta = parseStudentImportMetaV1(workbook);
    const refs = buildStudentImportWorkbookRefMaps(workbook);
    const normalized = mapV1RawRowToNormalized(parsed.rows[0].raw, meta, refs);

    expect(normalized.school_id).toBe(3);
    expect(normalized.academic_year_id).toBe(1);
    expect(normalized.level_id).toBe(176);
    expect(normalized.class_id).toBe(2059);
    expect(normalized.class_code).toBe('M1A · Level M1 · 2026-2027');
    expect(normalized.guardian_id).toBe(894);
    expect(normalized.guardian_name).toBe('Parent Name');
    expect(normalized.guardian_mobile).toBe('0612345678');
    expect(normalized.guardian_relationship_type).toBe('father');
    expect(normalized.guardian_is_primary_contact).toBe(true);
    expect(normalized.guardian_is_financial_responsible).toBe(false);

    const payload = buildStudentImportValidationRequest({
      activeSchoolId: 3,
      activeAcademicYearId: 1,
      sourceFilename: 'import.xlsx',
      templateVersion: parsed.templateVersion,
      rows: [
        {
          rowNumber: parsed.rows[0].rowNumber,
          raw: parsed.rows[0].raw,
          normalized,
          errors: [],
          warnings: [],
          status: 'valid',
        },
      ],
    });

    expect(payload.template_version).toBe(1);
    expect(payload.rows[0]).toMatchObject({
      row_number: 3,
      first_name: 'Sara',
      last_name: 'Test',
      school_number: 'SN-200',
      school_id: 3,
      academic_year_id: 1,
      level_id: 176,
      class_id: 2059,
      registration_type: 'new',
      guardian_id: 894,
      guardian_name: 'Parent Name',
      guardian_mobile: '0612345678',
      guardian_relationship_type: 'father',
      guardian_is_primary_contact: true,
      guardian_is_financial_responsible: false,
    });
    assertValidationPayloadKeys(payload);
  });

  it('accepts school_label, school_id, and Ref_Schools without unknown_column errors', async () => {
    const buffer = await buildV1Workbook({
      includeSchoolColumns: true,
      dataRows: [
        {
          row_number: 2,
          school_number: 'SN-SCHOOL-ROW',
          school_label: 'Other School · SCH5',
          school_id: 5,
          first_name: 'Row',
          last_name: 'SchoolId',
        },
        {
          row_number: 3,
          school_number: 'SN-META-SCHOOL',
          school_label: 'Test School · SCH3',
          first_name: 'Row',
          last_name: 'MetaSchool',
        },
      ],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    expect(workbook.getWorksheet('Ref_Schools')).toBeTruthy();

    const parsed = parseOdooV1StudentImportWorkbook(workbook, issueMessage);
    expect(parsed.fileErrors.filter((issue) => issue.code === 'unknown_column')).toEqual([]);
    expect(parsed.headers).toEqual(
      expect.arrayContaining(['school_label', 'school_id']),
    );
    expect(parsed.rows).toHaveLength(2);

    const meta = parseStudentImportMetaV1(workbook);
    const refs = buildStudentImportWorkbookRefMaps(workbook);

    const withRowSchoolId = mapV1RawRowToNormalized(parsed.rows[0].raw, meta, refs);
    expect(withRowSchoolId.school_id).toBe(5);

    const withMetaSchoolId = mapV1RawRowToNormalized(parsed.rows[1].raw, meta, refs);
    expect(withMetaSchoolId.school_id).toBe(3);

    const payload = buildStudentImportValidationRequest({
      activeSchoolId: 3,
      activeAcademicYearId: 1,
      sourceFilename: 'import.xlsx',
      templateVersion: parsed.templateVersion,
      rows: parsed.rows.map((row) => ({
        rowNumber: row.rowNumber,
        raw: row.raw,
        normalized: mapV1RawRowToNormalized(row.raw, meta, refs),
        errors: [],
        warnings: [],
        status: 'valid' as const,
      })),
    });

    expect(payload.rows[0]?.school_id).toBe(5);
    expect(payload.rows[1]?.school_id).toBe(3);
    expect(payload.rows[0]).not.toHaveProperty('school_label');
    expect(payload.rows[1]).not.toHaveProperty('school_label');
    assertValidationPayloadKeys(payload);
  });
});

describe('student import v1 local validation', () => {
  it('accepts a row without school_number when class and guardian fields are present', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [
        {
          row_number: 2,
          school_number: '',
          first_name: 'Ali',
          last_name: 'Ben',
          guardian_name: 'Parent',
          guardian_mobile: '0612345678',
        },
      ],
    });
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.fileErrors.filter((issue) => issue.severity === 'error')).toHaveLength(0);
    expect(result.summary.invalidRows).toBe(0);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].normalized.school_number).toBeNull();
    expect(result.readyForImport).toBe(true);
  });

  it('does not send example row 2 to validation rows', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [{ row_number: 2, first_name: 'Real', last_name: 'Student' }],
    });
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.rows.some((row) => row.normalized.first_name === 'Example')).toBe(false);
    expect(result.fileErrors.some((issue) => issue.code === 'example_row_ignored')).toBe(true);
  });

  it('sends actual data starting from sheet row 3', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [{ row_number: 2, first_name: 'SheetRow3', last_name: 'Student' }],
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheetRow3FirstName = workbook.getWorksheet('Students')?.getRow(3).getCell(3).value;
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(sheetRow3FirstName).toBe('SheetRow3');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].normalized.first_name).toBe('SheetRow3');
  });

  it('still errors when class_label and class_id are missing', async () => {
    const buffer = await buildV1Workbook({
      dataRows: [
        {
          row_number: 2,
          first_name: 'No',
          last_name: 'Class',
          class_label: '',
          class_id: '',
          guardian_name: 'Parent',
          guardian_mobile: '0612345678',
        },
      ],
    });
    const result = await validateStudentImportWorkbook(buffer, emptyReference, issueMessage);
    expect(result.summary.invalidRows).toBe(1);
    expect(result.rows[0].errors.some((error) => error.field === 'class_id')).toBe(true);
  });
});