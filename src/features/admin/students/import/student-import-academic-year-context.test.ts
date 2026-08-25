import { describe, expect, it } from 'vitest';
import {
  applyStudentImportAcademicYearContext,
  studentImportAcademicYearContextMatches,
} from './student-import-academic-year-context';
import type { StudentImportValidationResult } from './student-import-types';

const issueMessage = (code: string, field?: string) => (field ? `${code}:${field}` : code);

function validation(yearId = 1): StudentImportValidationResult {
  return {
    templateVersion: 1,
    importMode: 'create',
    format: 'odoo_v1',
    meta: {
      templateVersion: 1,
      importMode: 'create',
      schoolId: 3,
      schoolName: 'Test School',
      academicYearId: yearId,
      academicYearName: '2026-2027',
    },
    fileErrors: [],
    rows: [
      {
        rowNumber: 3,
        raw: {},
        normalized: {
          first_name: 'Sara',
          last_name: 'Test',
          academic_year_id: yearId,
        },
        errors: [],
        warnings: [],
        status: 'valid',
      },
    ],
    summary: {
      totalRows: 1,
      validRows: 1,
      warningRows: 0,
      invalidRows: 0,
      totalErrors: 0,
      totalWarnings: 0,
    },
    readyForImport: true,
  };
}

describe('student import academic year context guard', () => {
  it('accepts a workbook whose metadata and rows match the selected year', () => {
    const input = validation(1);
    expect(studentImportAcademicYearContextMatches(input, 1)).toBe(true);
    const guarded = applyStudentImportAcademicYearContext(input, 1, issueMessage);
    expect(guarded.fileErrors).toHaveLength(0);
    expect(guarded.readyForImport).toBe(true);
  });

  it('rejects a workbook from a different academic year before server validation', () => {
    const guarded = applyStudentImportAcademicYearContext(validation(2), 1, issueMessage);
    expect(guarded.fileErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'academic_year_context_mismatch',
          field: 'academic_year_id',
          severity: 'error',
        }),
      ]),
    );
    expect(guarded.readyForImport).toBe(false);
  });

  it('rejects import when no academic year is selected', () => {
    const guarded = applyStudentImportAcademicYearContext(validation(1), null, issueMessage);
    expect(guarded.fileErrors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'academic_year_context_required',
          field: 'academic_year_id',
          severity: 'error',
        }),
      ]),
    );
    expect(guarded.readyForImport).toBe(false);
  });
});
