import { describe, expect, it } from 'vitest';
import { hasStudentImportCapability } from './student-import-capability';
import { mergeLocalAndServerRows } from './student-import-merge';
import {
  assertValidationPayloadKeys,
  buildStudentImportValidationRequest,
  canExecuteImport,
  isValidationExpired,
} from './student-import-payload';
import {
  normalizeImportExecuteResponse,
  normalizeImportJobResponse,
  normalizeImportValidationResponse,
  StudentImportContractError,
} from './student-import-server-normalize';
import type { StudentImportRowResult } from './student-import-types';

function localRow(overrides: Partial<StudentImportRowResult> = {}): StudentImportRowResult {
  return {
    rowNumber: 3,
    raw: { first_name: 'Ali', last_name: 'Test' },
    normalized: {
      first_name: 'Ali',
      last_name: 'Test',
      school_number: 'STU-QA-001',
      school_id: 3,
      academic_year_id: 1,
      level_id: 10,
      class_id: 20,
      registration_type: 'new',
    },
    errors: [],
    warnings: [],
    status: 'valid',
    ...overrides,
  };
}

describe('student import payload builder', () => {
  it('whitelists fields and skips invalid local rows', () => {
    const payload = buildStudentImportValidationRequest({
      activeSchoolId: 3,
      sourceFilename: 'students.xlsx',
      rows: [
        localRow(),
        localRow({ rowNumber: 4, status: 'invalid', errors: [{ code: 'missing_required_field', severity: 'error', message: 'x' }] }),
      ],
    });
    expect(payload.rows).toHaveLength(1);
    expect(payload.rows[0].row_number).toBe(3);
    expect(payload.rows[0].first_name).toBe('Ali');
    expect(Object.keys(payload.rows[0])).not.toContain('raw');
    assertValidationPayloadKeys(payload);
  });
});

describe('student import response normalization', () => {
  it('normalizes validation response', () => {
    const data = normalizeImportValidationResponse({
      job_id: 12,
      validation_token: 12,
      expires_at: '2026-06-15 09:50:21',
      summary: { total_rows: 1, valid_rows: 1, warning_rows: 0, invalid_rows: 0 },
      rows: [{ row_number: 3, status: 'valid', errors: [], warnings: [] }],
      capabilities: { can_import: true },
    });
    expect(data.job_id).toBe(12);
    expect(data.capabilities.can_import).toBe(true);
  });

  it('rejects invalid validation response', () => {
    expect(() => normalizeImportValidationResponse({})).toThrow(StudentImportContractError);
  });

  it('normalizes execute and job responses', () => {
    const exec = normalizeImportExecuteResponse({
      job_id: 5,
      state: 'completed',
      summary: { total_rows: 1, valid_rows: 1, warning_rows: 0, invalid_rows: 0, created_rows: 1 },
      rows: [{ row_number: 3, status: 'created', student_id: 99, enrollment_id: 88, errors: [], warnings: [] }],
    });
    expect(exec.state).toBe('completed');
    expect(exec.rows[0].student_id).toBe(99);

    const job = normalizeImportJobResponse({
      id: 5,
      state: 'completed',
      summary: exec.summary,
      rows: exec.rows,
      pagination: { limit: 20, offset: 0, total: 1 },
    });
    expect(job.job.pagination.total).toBe(1);
  });
});

describe('student import merge', () => {
  it('merges local and server issues by row number', () => {
    const merged = mergeLocalAndServerRows([localRow()], [
      { row_number: 3, status: 'valid', errors: [], warnings: [] },
    ]);
    expect(merged[0].executable).toBe(true);
    expect(merged[0].serverStatus).toBe('valid');
  });

  it('marks row non-executable when server has errors', () => {
    const merged = mergeLocalAndServerRows([localRow()], [
      {
        row_number: 3,
        status: 'failed',
        errors: [{ code: 'duplicate_school_number', message: 'dup', severity: 'error', source: 'server' }],
        warnings: [],
      },
    ]);
    expect(merged[0].executable).toBe(false);
    expect(merged[0].serverErrors).toHaveLength(1);
  });
});

describe('student import guards', () => {
  it('detects validation expiry', () => {
    expect(isValidationExpired('2020-01-01 00:00:00')).toBe(true);
    expect(isValidationExpired('2099-01-01 00:00:00')).toBe(false);
  });

  it('blocks execute when invalid or unconfirmed', () => {
    expect(
      canExecuteImport({
        localInvalidRows: 0,
        serverInvalidRows: 1,
        validationExpired: false,
        hasCapability: true,
        confirmed: true,
        phase: 'confirming',
      }),
    ).toBe(false);

    expect(
      canExecuteImport({
        localInvalidRows: 0,
        serverInvalidRows: 0,
        validationExpired: false,
        hasCapability: true,
        confirmed: false,
        phase: 'confirming',
      }),
    ).toBe(false);
  });

  it('checks students.import capability only', () => {
    expect(hasStudentImportCapability({ effective_capabilities: ['students.import'] } as never)).toBe(true);
    expect(hasStudentImportCapability({ effective_capabilities: ['manage_students'] } as never)).toBe(false);
  });
});
