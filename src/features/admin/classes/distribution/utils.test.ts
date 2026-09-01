import { describe, expect, it } from 'vitest';
import type { ApiErrorBody } from '@/types/api';
import type { DistributionClassSummary, DistributionSelectionItem } from '@/types/class-distribution';
import {
  MAX_DISTRIBUTION_MOVE_BATCH,
  buildDistributionAssignRequest,
  buildDistributionMoveRequest,
  buildDistributionMoves,
  classAvailableSeats,
  classIsFull,
  classOccupancyPercent,
  distributionErrorMessageKey,
  selectedStudentsFromPage,
  selectionFitsTargetCapacity,
  shouldRefetchAfterDistributionError,
  targetIsNoopForSelection,
} from './utils';

function cls(overrides: Partial<DistributionClassSummary> = {}): DistributionClassSummary {
  return {
    id: 1,
    name: '6APG-1',
    code: '6APG-1',
    capacity: 24,
    assigned_count: 18,
    gender_summary: { female: 9, male: 8, unspecified: 1, total: 18 },
    readiness: {
      completed: 3,
      total: 4,
      status: 'partial',
      items: {
        capacity: { ready: true },
        subjects: { ready: true },
        teaching_assignments: { ready: false, missing_count: 2 },
        timetable: { ready: true },
      },
    },
    ...overrides,
  };
}

function selection(studentId: number, sourceClassId: number | null): DistributionSelectionItem {
  return {
    studentId,
    enrollmentId: sourceClassId == null ? null : 1000 + studentId,
    sourceClassId,
    name: `Student ${studentId}`,
    code: `ST-${studentId}`,
    gender: null,
  };
}

function error(code: string, details?: Record<string, unknown>): ApiErrorBody {
  return { code, message: 'raw backend message', details };
}

describe('class distribution presentation utilities', () => {
  it('calculates available seats from canonical assigned count', () => {
    expect(classAvailableSeats(cls())).toBe(6);
  });

  it('never exposes negative available seats', () => {
    expect(classAvailableSeats(cls({ assigned_count: 28 }))).toBe(0);
  });

  it('returns null when capacity is not configured', () => {
    expect(classAvailableSeats(cls({ capacity: null }))).toBeNull();
    expect(classAvailableSeats(cls({ capacity: 0 }))).toBeNull();
  });

  it('marks a class full only when a positive capacity is reached', () => {
    expect(classIsFull(cls({ assigned_count: 24 }))).toBe(true);
    expect(classIsFull(cls({ capacity: null, assigned_count: 50 }))).toBe(false);
  });

  it('caps occupancy visual at 100 percent', () => {
    expect(classOccupancyPercent(cls({ assigned_count: 30 }))).toBe(100);
  });

  it('preserves the V1 assignment helper', () => {
    expect(buildDistributionAssignRequest(7, 'preview', [10, 11], 99)).toEqual({
      level_id: 7,
      mode: 'preview',
      assignments: [
        { student_id: 10, class_id: 99 },
        { student_id: 11, class_id: 99 },
      ],
    });
  });

  it('keeps selected V1 students constrained to the visible page', () => {
    const items = [
      { id: 1, name: 'A', code: null, gender: 'female' as const },
      { id: 2, name: 'B', code: null, gender: 'male' as const },
    ];
    expect(selectedStudentsFromPage(items, new Set([2, 99])).map((student) => student.id)).toEqual([2]);
  });
});

describe('Class Distribution Workspace V2 move helpers', () => {
  it('builds unassigned → class moves', () => {
    expect(buildDistributionMoves([selection(1, null)], 20)).toEqual([
      { student_id: 1, from_class_id: null, to_class_id: 20 },
    ]);
  });

  it('builds class → class moves', () => {
    expect(buildDistributionMoves([selection(2, 10)], 20)).toEqual([
      { student_id: 2, from_class_id: 10, to_class_id: 20 },
    ]);
  });

  it('builds class → unassigned moves', () => {
    expect(buildDistributionMoves([selection(3, 10)], null)).toEqual([
      { student_id: 3, from_class_id: 10, to_class_id: null },
    ]);
  });

  it('preserves mixed sources in one preview request', () => {
    const items = [selection(1, null), selection(2, 10), selection(3, 11)];
    expect(buildDistributionMoveRequest(7, 'preview', items, 20, 2026)).toEqual({
      academic_year_id: 2026,
      level_id: 7,
      mode: 'preview',
      moves: [
        { student_id: 1, from_class_id: null, to_class_id: 20 },
        { student_id: 2, from_class_id: 10, to_class_id: 20 },
        { student_id: 3, from_class_id: 11, to_class_id: 20 },
      ],
    });
  });

  it('marks a target invalid when any selected student already belongs to it', () => {
    expect(targetIsNoopForSelection([selection(1, 10), selection(2, 11)], 10)).toBe(true);
    expect(targetIsNoopForSelection([selection(1, null)], null)).toBe(true);
    expect(targetIsNoopForSelection([selection(1, 10)], 11)).toBe(false);
  });

  it('guards known target capacity while leaving unspecified capacity to backend validation', () => {
    expect(selectionFitsTargetCapacity([selection(1, null), selection(2, null)], cls({ id: 20, assigned_count: 22 }))).toBe(true);
    expect(selectionFitsTargetCapacity([selection(1, null), selection(2, null), selection(3, null)], cls({ id: 20, assigned_count: 22 }))).toBe(false);
    expect(selectionFitsTargetCapacity([selection(1, null)], cls({ id: 20, capacity: null }))).toBe(true);
  });

  it('keeps the UI batch ceiling aligned with the backend contract', () => {
    expect(MAX_DISTRIBUTION_MOVE_BATCH).toBe(100);
  });
});

describe('class distribution error mapping', () => {
  it('maps capacity errors to a safe user-facing key and refetches', () => {
    const value = error('CLASS_CAPACITY_EXCEEDED');
    expect(distributionErrorMessageKey(value)).toBe('admin.classDistribution.error.capacity');
    expect(shouldRefetchAfterDistributionError(value)).toBe(true);
  });

  it('preserves already-assigned V1 handling', () => {
    const value = error('class_distribution_assign_invalid', {
      errors: [{ code: 'ALREADY_ASSIGNED' }],
    });
    expect(distributionErrorMessageKey(value)).toBe('admin.classDistribution.error.alreadyAssigned');
    expect(shouldRefetchAfterDistributionError(value)).toBe(true);
  });

  it('maps V2 source/current/concurrency drift without exposing raw codes', () => {
    for (const code of ['SOURCE_CLASS_MISMATCH', 'CURRENT_CLASS_MISMATCH', 'concurrent_move_conflict']) {
      const value = error(code);
      expect(distributionErrorMessageKey(value)).toBe('admin.classDistribution.error.concurrent');
      expect(shouldRefetchAfterDistributionError(value)).toBe(true);
    }
  });

  it('maps nested move-invalid stale details', () => {
    const value = error('class_distribution_move_invalid', {
      errors: [{ error_code: 'SOURCE_CLASS_MISMATCH' }],
    });
    expect(distributionErrorMessageKey(value)).toBe('admin.classDistribution.error.concurrent');
    expect(shouldRefetchAfterDistributionError(value)).toBe(true);
  });

  it('maps context mismatches', () => {
    expect(distributionErrorMessageKey(error('NOT_REGISTERED_FOR_CONTEXT'))).toBe(
      'admin.classDistribution.error.context',
    );
  });

  it('maps source/class scope mismatches', () => {
    expect(distributionErrorMessageKey(error('SOURCE_CLASS_NOT_FOUND'))).toBe(
      'admin.classDistribution.error.class',
    );
    expect(distributionErrorMessageKey(error('CLASS_LEVEL_MISMATCH'))).toBe(
      'admin.classDistribution.error.class',
    );
  });

  it('maps batch and invalid-request errors', () => {
    expect(distributionErrorMessageKey(error('move_batch_too_large'))).toBe(
      'admin.classDistribution.error.batchTooLarge',
    );
    expect(distributionErrorMessageKey(error('invalid_move'))).toBe(
      'admin.classDistribution.error.invalidMove',
    );
  });

  it('maps permission errors', () => {
    expect(distributionErrorMessageKey(error('forbidden'))).toBe(
      'admin.classDistribution.error.permission',
    );
  });

  it('falls back to a generic localized message key', () => {
    expect(distributionErrorMessageKey(error('unexpected_backend_code'))).toBe(
      'admin.classDistribution.error.generic',
    );
  });
});
