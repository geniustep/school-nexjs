import { describe, expect, it } from 'vitest';
import { normalizeStudentOptions } from '../utils/student-options';
import { STUDENT_IMPORT_COLUMNS } from './student-import-columns';
import {
  STUDENT_IMPORT_SHEET_EXAMPLE,
  STUDENT_IMPORT_SHEET_INSTRUCTIONS,
  STUDENT_IMPORT_SHEET_REFERENCE,
  STUDENT_IMPORT_SHEET_STUDENTS,
  STUDENT_IMPORT_TEMPLATE_VERSION,
} from './student-import-constants';
import { buildStudentImportTemplateLabels } from './student-import-labels';
import { normalizeBoolean, normalizeStudentImportRow } from './student-import-normalizer';
import {
  detectMissingRequiredColumns,
  detectUnknownColumns,
  parseStudentImportWorkbook,
} from './student-import-parser';
import { buildStudentImportReferenceData } from './student-import-reference';
import { buildStudentImportTemplateWorkbook } from './student-import-template';
import { validateStudentImportWorkbook } from './student-import-validator';

const mockOptions = normalizeStudentOptions({
  gender: [{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }],
  student_status: [
    { value: 'active', label: 'Active' },
    { value: 'withdrawn', label: 'Withdrawn' },
    { value: 'transferred', label: 'Transferred' },
  ],
  registration_types: [
    { value: 'new', label: 'New' },
    { value: 're_enrollment', label: 'Re-enrollment' },
    { value: 'transfer', label: 'Transfer' },
  ],
  emergency_relationships: [{ value: 'father', label: 'Father' }],
  nationalities: [{ id: 1, name: 'Morocco', code: 'MA' }],
  schools: [{ id: 10, name: 'Main School' }],
  academic_years: [{ id: 20, name: '2025-2026', code: 'AY2025' }],
  levels: [{ id: 30, name: 'Level 1', code: 'L1', school_id: 10, academic_year_id: 20 }],
  classes: [
    {
      id: 40,
      name: 'Class A',
      code: 'C1',
      school_id: 10,
      academic_year_id: 20,
      level: { id: 30, name: 'Level 1', code: 'L1' },
    },
    {
      id: 41,
      name: 'Class B',
      code: 'C2',
      school_id: 10,
      academic_year_id: 20,
      level: { id: 99, name: 'Other', code: 'LX' },
    },
  ],
});

const reference = buildStudentImportReferenceData(mockOptions)!;

const t = (key: string, params?: Record<string, string | number>) => {
  if (key.startsWith('admin.studentImport.columns.')) return key.split('.').pop() ?? key;
  if (key.startsWith('admin.studentImport.comments.')) return key;
  if (key.startsWith('admin.studentImport.instructions.')) return key;
  if (key.startsWith('admin.studentImport.examples.')) return String(params?.field ?? key);
  if (key.startsWith('admin.studentImport.issueCodes.')) {
    const code = key.split('.').pop() ?? key;
    return params?.field ? `${code}:${params.field}` : code;
  }
  return key;
};

async function buildTemplateBuffer(): Promise<ArrayBuffer> {
  const labels = buildStudentImportTemplateLabels(t, reference);
  return buildStudentImportTemplateWorkbook(reference, labels);
}

describe('student import template', () => {
  it('generates required sheets and headers', async () => {
    const buffer = await buildTemplateBuffer();
    const parsed = await parseStudentImportWorkbook(buffer, (code) => code);
    expect(parsed.templateVersion).toBe(STUDENT_IMPORT_TEMPLATE_VERSION);
    expect(parsed.headers).toEqual(STUDENT_IMPORT_COLUMNS.map((c) => c.key));
    expect(parsed.fileErrors).toHaveLength(0);

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet(STUDENT_IMPORT_SHEET_INSTRUCTIONS)).toBeTruthy();
    expect(workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS)).toBeTruthy();
    expect(workbook.getWorksheet(STUDENT_IMPORT_SHEET_REFERENCE)).toBeTruthy();
    expect(workbook.getWorksheet(STUDENT_IMPORT_SHEET_EXAMPLE)).toBeTruthy();
  });
});

describe('student import normalization', () => {
  it('normalizes booleans and preserves codes as strings', () => {
    expect(normalizeBoolean('yes')).toBe(true);
    expect(normalizeBoolean('no')).toBe(false);
    const row = normalizeStudentImportRow({
      school_number: '00123',
      massar_code: '0123456789',
      is_repeating: 'yes',
    });
    expect(row.school_number).toBe('00123');
    expect(row.massar_code).toBe('0123456789');
    expect(row.is_repeating).toBe(true);
  });

  it('normalizes dates to yyyy-mm-dd', () => {
    const row = normalizeStudentImportRow({ date_of_birth: '01/09/2010' });
    expect(row.date_of_birth).toBe('2010-09-01');
  });
});

describe('student import validation', () => {
  it('accepts valid rows from generated template data', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildTemplateBuffer());
    const sheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS)!;
    sheet.getRow(3).getCell(1).value = 'Ali';
    sheet.getRow(3).getCell(2).value = 'Ben';
    sheet.getRow(3).getCell(10).value = 'SN001';
    sheet.getRow(3).getCell(13).value = '10';
    sheet.getRow(3).getCell(14).value = 'AY2025';
    sheet.getRow(3).getCell(15).value = 'L1';
    sheet.getRow(3).getCell(16).value = 'C1';
    sheet.getRow(3).getCell(17).value = 'new';

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await validateStudentImportWorkbook(buffer, reference, (code, field) =>
      field ? `${code}:${field}` : code,
    );
    expect(result.fileErrors).toHaveLength(0);
    expect(result.summary.totalRows).toBe(1);
    expect(result.summary.invalidRows).toBe(0);
    expect(result.readyForImport).toBe(true);
  });

  it('detects duplicate school numbers and invalid references', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildTemplateBuffer());
    const sheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS)!;

    for (const rowNumber of [3, 4]) {
      sheet.getRow(rowNumber).getCell(1).value = 'Dup';
      sheet.getRow(rowNumber).getCell(2).value = 'Student';
      sheet.getRow(rowNumber).getCell(10).value = 'SN-DUP';
      sheet.getRow(rowNumber).getCell(13).value = '10';
      sheet.getRow(rowNumber).getCell(14).value = 'AY2025';
      sheet.getRow(rowNumber).getCell(15).value = 'L1';
      sheet.getRow(rowNumber).getCell(16).value = rowNumber === 3 ? 'C1' : 'C2';
      sheet.getRow(rowNumber).getCell(17).value = 'new';
      sheet.getRow(rowNumber).getCell(24).value = 'bad-email';
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    const result = await validateStudentImportWorkbook(buffer, reference, (code, field) =>
      field ? `${code}:${field}` : code,
    );
    expect(result.summary.invalidRows).toBeGreaterThan(0);
    expect(result.rows.some((row) => row.errors.some((e) => e.code === 'duplicate_school_number_in_file'))).toBe(
      true,
    );
    expect(result.rows.some((row) => row.errors.some((e) => e.code === 'invalid_email'))).toBe(true);
  });

  it('requires previous school for transfer and departure reason for withdrawn', async () => {
    const rowValues = {
      first_name: 'A',
      last_name: 'B',
      school_number: '1',
      school_code: '10',
      academic_year_code: 'AY2025',
      level_code: 'L1',
      class_code: 'C1',
      registration_type: 'transfer',
      status: 'withdrawn',
    };
    const result = await validateStudentImportWorkbook(
      await rowWorkbook(rowValues),
      reference,
      (code, field) => (field ? `${code}:${field}` : code),
    );
    expect(result.rows[0].errors.some((e) => e.field === 'previous_school')).toBe(true);
    expect(result.rows[0].errors.some((e) => e.field === 'departure_reason')).toBe(true);
  });

  it('rejects unknown columns and missing students sheet', async () => {
    expect(detectUnknownColumns(['first_name', 'foo'])).toEqual(['foo']);
    expect(detectMissingRequiredColumns(['first_name'])).toContain('last_name');

    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Wrong');
    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    const parsed = await parseStudentImportWorkbook(buffer, (code) => code);
    expect(parsed.fileErrors.some((e) => e.code === 'missing_students_sheet')).toBe(true);
  });
});

async function rowWorkbook(values: Record<string, unknown>): Promise<ArrayBuffer> {
  const ExcelJS = (await import('exceljs')).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await buildTemplateBuffer());
  const sheet = workbook.getWorksheet(STUDENT_IMPORT_SHEET_STUDENTS)!;
  STUDENT_IMPORT_COLUMNS.forEach((column, index) => {
    const value = values[column.key];
    if (value != null) sheet.getRow(3).getCell(index + 1).value = value as string;
  });
  return workbook.xlsx.writeBuffer() as Promise<ArrayBuffer>;
}
