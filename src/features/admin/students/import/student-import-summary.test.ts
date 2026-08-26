import { describe, expect, it } from 'vitest';
import type { StudentImportMergedRow } from './student-import-server-types';
import type { StudentImportSummary } from './student-import-types';
import { buildStudentImportDisplaySummary } from './student-import-summary';

const localSummary: StudentImportSummary = {
  totalRows: 296,
  validRows: 296,
  warningRows: 0,
  invalidRows: 0,
  totalErrors: 0,
  totalWarnings: 0,
};

function mergedRow(
  rowNumber: number,
  status: StudentImportMergedRow['previewStatus'],
  options?: { errors?: number; warnings?: number },
): StudentImportMergedRow {
  return {
    rowNumber,
    raw: {},
    normalized: {},
    localErrors: [],
    localWarnings: [],
    serverErrors: Array.from({ length: options?.errors ?? 0 }, (_, index) => ({
      code: `server_error_${index}`,
      message: 'server error',
      severity: 'error' as const,
      source: 'server' as const,
    })),
    serverWarnings: Array.from({ length: options?.warnings ?? 0 }, (_, index) => ({
      code: `server_warning_${index}`,
      message: 'server warning',
      severity: 'warning' as const,
      source: 'server' as const,
    })),
    serverStatus: status,
    previewStatus: status,
    executable: status !== 'invalid',
  };
}

describe('student import display summary', () => {
  it('keeps the local summary before server rows are merged', () => {
    expect(buildStudentImportDisplaySummary(localSummary, [])).toEqual(localSummary);
  });

  it('uses merged local/server row status after server validation', () => {
    const rows: StudentImportMergedRow[] = [
      ...Array.from({ length: 293 }, (_, index) => mergedRow(index + 1, 'valid')),
      mergedRow(294, 'invalid', { errors: 1 }),
      mergedRow(295, 'invalid', { errors: 1 }),
      mergedRow(296, 'invalid', { errors: 1 }),
    ];

    expect(buildStudentImportDisplaySummary(localSummary, rows)).toEqual({
      totalRows: 296,
      validRows: 293,
      warningRows: 0,
      invalidRows: 3,
      totalErrors: 3,
      totalWarnings: 0,
    });
  });

  it('counts warning rows and issue totals from merged results', () => {
    const rows: StudentImportMergedRow[] = [
      mergedRow(1, 'valid'),
      mergedRow(2, 'warning', { warnings: 2 }),
      mergedRow(3, 'invalid', { errors: 2, warnings: 1 }),
    ];

    expect(buildStudentImportDisplaySummary(localSummary, rows)).toEqual({
      totalRows: 3,
      validRows: 1,
      warningRows: 1,
      invalidRows: 1,
      totalErrors: 2,
      totalWarnings: 3,
    });
  });
});
