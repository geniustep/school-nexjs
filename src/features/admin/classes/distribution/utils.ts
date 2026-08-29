import type { ApiErrorBody } from '@/types/api';
import type {
  ClassDistributionAssignment,
  ClassDistributionAssignRequest,
  ClassDistributionMove,
  ClassDistributionMoveRequest,
  DistributionClassSummary,
  DistributionSelectionItem,
  UnassignedDistributionStudent,
} from '@/types/class-distribution';

export const MAX_DISTRIBUTION_MOVE_BATCH = 100;

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

/** V1 helpers retained while old assignment endpoints remain supported. */
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

export function buildDistributionMoves(
  items: DistributionSelectionItem[],
  targetClassId: number | null,
): ClassDistributionMove[] {
  return items.map((item) => ({
    student_id: item.studentId,
    from_class_id: item.sourceClassId,
    to_class_id: targetClassId,
  }));
}

export function buildDistributionMoveRequest(
  levelId: number,
  mode: ClassDistributionMoveRequest['mode'],
  items: DistributionSelectionItem[],
  targetClassId: number | null,
  academicYearId?: number | null,
): ClassDistributionMoveRequest {
  const request: ClassDistributionMoveRequest = {
    level_id: levelId,
    mode,
    moves: buildDistributionMoves(items, targetClassId),
  };
  if (academicYearId != null) request.academic_year_id = academicYearId;
  return request;
}

/** Backend rejects any row whose source already equals the chosen target. */
export function targetIsNoopForSelection(
  items: DistributionSelectionItem[],
  targetClassId: number | null,
): boolean {
  return items.some((item) => item.sourceClassId === targetClassId);
}

export function selectionFitsTargetCapacity(
  items: DistributionSelectionItem[],
  target: Pick<DistributionClassSummary, 'id' | 'capacity' | 'assigned_count'>,
): boolean {
  if (targetIsNoopForSelection(items, target.id)) return false;
  if (target.capacity == null || target.capacity <= 0) return true;
  return target.assigned_count + items.length <= target.capacity;
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
  | 'admin.classDistribution.error.batchTooLarge'
  | 'admin.classDistribution.error.invalidMove'
  | 'admin.classDistribution.error.permission'
  | 'admin.classDistribution.error.generic';

export function distributionErrorMessageKey(error: ApiErrorBody): DistributionErrorMessageKey {
  const codes = distributionErrorCodes(error);
  if (codes.has('CLASS_CAPACITY_EXCEEDED')) return 'admin.classDistribution.error.capacity';
  if (codes.has('ALREADY_ASSIGNED')) return 'admin.classDistribution.error.alreadyAssigned';
  if (codes.has('move_batch_too_large')) return 'admin.classDistribution.error.batchTooLarge';
  if (codes.has('invalid_move') || codes.has('empty_moves') || codes.has('invalid_mode')) {
    return 'admin.classDistribution.error.invalidMove';
  }
  if (
    codes.has('SOURCE_CLASS_MISMATCH') ||
    codes.has('CURRENT_CLASS_MISMATCH') ||
    codes.has('concurrent_move_conflict') ||
    codes.has('concurrent_assignment_conflict') ||
    codes.has('class_distribution_move_invalid') ||
    codes.has('class_distribution_assign_invalid') ||
    codes.has('conflict')
  ) {
    return 'admin.classDistribution.error.concurrent';
  }
  if (
    codes.has('NOT_REGISTERED_FOR_CONTEXT') ||
    codes.has('CONTEXT_MISMATCH') ||
    codes.has('CLASS_YEAR_MISMATCH')
  ) {
    return 'admin.classDistribution.error.context';
  }
  if (
    codes.has('SOURCE_CLASS_NOT_FOUND') ||
    codes.has('CLASS_NOT_FOUND') ||
    codes.has('CLASS_LEVEL_MISMATCH') ||
    codes.has('CLASS_NOT_OPERATIONAL') ||
    codes.has('CLASS_SCHOOL_MISMATCH')
  ) {
    return 'admin.classDistribution.error.class';
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
  const codes = distributionErrorCodes(error);
  return [
    'SOURCE_CLASS_MISMATCH',
    'CURRENT_CLASS_MISMATCH',
    'concurrent_move_conflict',
    'concurrent_assignment_conflict',
    'class_distribution_move_invalid',
    'class_distribution_assign_invalid',
    'CLASS_CAPACITY_EXCEEDED',
    'CLASS_NOT_OPERATIONAL',
    'CLASS_YEAR_MISMATCH',
    'CLASS_LEVEL_MISMATCH',
    'NOT_REGISTERED_FOR_CONTEXT',
    'ALREADY_ASSIGNED',
  ].some((code) => codes.has(code));
}
