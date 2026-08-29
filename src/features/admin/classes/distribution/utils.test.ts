import { describe, expect, it } from 'vitest';
import type { ApiErrorBody } from '@/types/api';
import type { DistributionClassSummary } from '@/types/class-distribution';
import {
  buildDistributionAssignRequest,
  classAvailableSeats,
  classIsFull,
  classOccupancyPercent,
  distributionErrorMessageKey,
  selectedStudentsFromPage,
  shouldRefetchAfterDistributionError,
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

  it('builds one preview assignment per selected student', () => {
    expect(buildDistributionAssignRequest(7, 'preview', [10, 11], 99)).toEqual({
      level_id: 7,
      mode: 'preview',
      assignments: [
        { student_id: 10, class_id: 99 },
        { student_id: 11, class_id: 99 },
      ],
    });
  });

  it('builds apply with the same explicit assignment shape', () => {
    expect(buildDistributionAssignRequest(7, 'apply', [10], 99)).toEqual({
      level_id: 7,
      mode: 'apply',
      assignments: [{ student_id: 10, class_id: 99 }],
    });
  });

  it('keeps selected students constrained to the visible page', () => {
    const items = [
      { id: 1, name: 'A', code: null, gender: 'female' as const },
      { id: 2, name: 'B', code: null, gender: 'male' as const },
    ];
    expect(selectedStudentsFromPage(items, new Set([2, 99])).map((student) => student.id)).toEqual([2]);
  });
});

describe('class distribution error mapping', () => {
  it('maps capacity errors to a safe user-facing key', () => {
    expect(distributionErrorMessageKey(error('CLASS_CAPACITY_EXCEEDED'))).toBe(
      'admin.classDistribution.error.capacity',
    );
  });

  it('maps already-assigned errors and requests a refetch', () => {
    const value = error('class_distribution_assign_invalid', {
      errors: [{ code: 'ALREADY_ASSIGNED' }],
    });
    expect(distributionErrorMessageKey(value)).toBe(
      'admin.classDistribution.error.alreadyAssigned',
    );
    expect(shouldRefetchAfterDistributionError(value)).toBe(true);
  });

  it('maps stale conflicts without exposing raw codes', () => {
    const value = error('concurrent_assignment_conflict');
    expect(distributionErrorMessageKey(value)).toBe(
      'admin.classDistribution.error.concurrent',
    );
  });

  it('maps context mismatches', () => {
    expect(distributionErrorMessageKey(error('NOT_REGISTERED_FOR_CONTEXT'))).toBe(
      'admin.classDistribution.error.context',
    );
  });

  it('maps class scope mismatches', () => {
    expect(distributionErrorMessageKey(error('CLASS_LEVEL_MISMATCH'))).toBe(
      'admin.classDistribution.error.class',
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
