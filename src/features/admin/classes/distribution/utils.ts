import type { ApiErrorBody } from '@/types/api';
import type {
  ClassDistributionAssignment,
  ClassDistributionAssignRequest,
  DistributionClassSummary,
  UnassignedDistributionStudent,
} from '@/types/class-distribution';

export function classAvailableSeats(
  cls: Pick<DistributionClassSummary, 'capacity' | 'assigned_count'>,
): number | null {
  if (cls.capacity == null || cls.capacity <= 0) return null;
  return Math.max(cls.capacity - cls.assigned_count, 0);
}

export function classOccupancyPercent(
  cls: Pick<DistributionClassSummary, 'capacity' | 'assigned_count'>,
): number | null {
  if (cls.capacity == null || cls.capacity <= 0) return null;
  return Math.min(100, Math.round((cls.assigned_count / cls.capacity) * 100));
}

export function classIsFull(
  cls: Pick<DistributionClassSummary, 'capacity' | 'assigned_count'>,
): boolean {
  return cls.capacity != null && cls.capacity > 0 && cls.assigned_count >= cls.capacity;
}

export function buildDistributionAssignments(
  students: number[],
  classId: number,
): ClassDistributionAssignment[] {
  return students.map((studentId) => ({ student_id: studentId, class_id: classId }));
}

export function buildDistributionAssignRequest(
  levelId: number,
  mode: ClassDistributionAssignRequest['mode'],
  studentIds: number[],
  classId: number,
): ClassDistributionAssignRequest {
  return {
    level_id: levelId,
    mode,
    assignments: buildDistributionAssignments(studentIds, classId),
  };
}

export function selectedStudentsFromPage(
  items: UnassignedDistributionStudent[],
  selectedIds: Set<number>,
): UnassignedDistributionStudent[] {
  return items.filter((student) => selectedIds.has(student.id));
}

function collectCodes(value: unknown, out: Set<string>): void {
  if (value == null) return;
  if (typeof value === 'string') {
    if (/^[A-Za-z0-9_.-]{3,80}$/.test(value)) out.add(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectCodes(item, out));
    return;
  }
  if (typeof value === 'object') {
    Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
      if (key === 'code' || key === 'error_code' || key === 'reason') collectCodes(nested, out);
      else if (typeof nested === 'object' && nested != null) collectCodes(nested, out);
    });
  }
}

export function distributionErrorCodes(error: ApiErrorBody): Set<string> {
  const codes = new Set<string>();
  if (error.code) codes.add(error.code);
  collectCodes(error.details, codes);
  return codes;
}

export type DistributionErrorMessageKey =
  | 'admin.classDistribution.error.capacity'
  | 'admin.classDistribution.error.alreadyAssigned'
  | 'admin.classDistribution.error.context'
  | 'admin.classDistribution.error.class'
  | 'admin.classDistribution.error.concurrent'
  | 'admin.classDistribution.error.permission'
  | 'admin.classDistribution.error.generic';

export function distributionErrorMessageKey(error: ApiErrorBody): DistributionErrorMessageKey {
  const codes = distributionErrorCodes(error);
  if (codes.has('CLASS_CAPACITY_EXCEEDED')) return 'admin.classDistribution.error.capacity';
  if (codes.has('ALREADY_ASSIGNED')) return 'admin.classDistribution.error.alreadyAssigned';
  if (
    codes.has('NOT_REGISTERED_FOR_CONTEXT') ||
    codes.has('CONTEXT_MISMATCH') ||
    codes.has('CLASS_YEAR_MISMATCH')
  ) {
    return 'admin.classDistribution.error.context';
  }
  if (
    codes.has('CLASS_NOT_FOUND') ||
    codes.has('CLASS_LEVEL_MISMATCH') ||
    codes.has('CLASS_NOT_OPERATIONAL') ||
    codes.has('CLASS_SCHOOL_MISMATCH')
  ) {
    return 'admin.classDistribution.error.class';
  }
  if (
    codes.has('concurrent_assignment_conflict') ||
    codes.has('class_distribution_assign_invalid') ||
    codes.has('conflict')
  ) {
    return 'admin.classDistribution.error.concurrent';
  }
  if (
    codes.has('forbidden') ||
    codes.has('permission_denied') ||
    codes.has('missing_permission')
  ) {
    return 'admin.classDistribution.error.permission';
  }
  return 'admin.classDistribution.error.generic';
}

export function shouldRefetchAfterDistributionError(error: ApiErrorBody): boolean {
  const key = distributionErrorMessageKey(error);
  return (
    key === 'admin.classDistribution.error.alreadyAssigned' ||
    key === 'admin.classDistribution.error.context' ||
    key === 'admin.classDistribution.error.class' ||
    key === 'admin.classDistribution.error.concurrent' ||
    key === 'admin.classDistribution.error.capacity'
  );
}
