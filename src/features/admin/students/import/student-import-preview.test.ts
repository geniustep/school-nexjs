import { describe, expect, it } from 'vitest';
import { mergeLocalAndServerRows, mergedRowsForPreview } from './student-import-merge';

describe('student import preview merge', () => {
  it('merges server validation results by row_number for preview', () => {
    const localRows = [
      {
        rowNumber: 3,
        raw: { school_number: 'SN-1' },
        normalized: {
          first_name: 'Ali',
          last_name: 'Test',
          school_number: 'SN-1',
          class_id: 2059,
        },
        errors: [],
        warnings: [],
        status: 'valid' as const,
      },
    ];

    const merged = mergeLocalAndServerRows(localRows, [
      {
        row_number: 3,
        status: 'invalid',
        errors: [{ code: 'duplicate_school_number', field: 'school_number', message: 'Duplicate', severity: 'error', source: 'server' }],
        warnings: [],
      },
    ]);

    const preview = mergedRowsForPreview(merged);
    expect(preview).toHaveLength(1);
    expect(preview[0].rowNumber).toBe(3);
    expect(preview[0].status).toBe('invalid');
    expect(preview[0].errors[0].code).toBe('duplicate_school_number');
  });
});
