import type { SchoolClassUsage } from '@/types/class';
import type { SchoolClass } from '@/types/class';
import type { ApiErrorBody } from '@/types/api';

export function resolveClassUsage(cls: SchoolClass): SchoolClassUsage {
  if (cls.usage) return cls.usage;
  return {
    students: cls.student_count ?? 0,
    enrollments: cls.student_count ?? 0,
    assignments: cls.subjects?.length ?? 0,
    timetable_slots: 0,
    exams: 0,
    homeworks: 0,
    attendance_records: 0,
  };
}

export function usageFromClassErrorDetails(
  details?: Record<string, unknown>,
): SchoolClassUsage | null {
  if (!details || typeof details !== 'object') return null;
  const n = (key: string) => Number(details[key] ?? 0) || 0;
  return {
    students: n('students'),
    enrollments: n('enrollments'),
    assignments: n('assignments'),
    timetable_slots: n('timetable_slots'),
    exams: n('exams'),
    homeworks: n('homeworks'),
    attendance_records: n('attendance_records'),
  };
}

export function classHasOperationalUsage(usage: SchoolClassUsage): boolean {
  return (
    usage.students > 0 ||
    usage.enrollments > 0 ||
    usage.assignments > 0 ||
    usage.timetable_slots > 0 ||
    usage.exams > 0 ||
    (usage.homeworks ?? 0) > 0 ||
    (usage.attendance_records ?? 0) > 0
  );
}

export function resolveClassRemovalFlags(cls: SchoolClass): {
  canDelete: boolean | null;
  canDeactivate: boolean | null;
  usage: SchoolClassUsage;
  blockedByBackend: boolean;
  isHistorical: boolean;
} {
  const usage = resolveClassUsage(cls);
  const hasFlags = cls.can_delete != null || cls.can_deactivate != null;
  const canDelete = cls.can_delete ?? null;
  const canDeactivate = cls.can_deactivate ?? null;

  return {
    canDelete,
    canDeactivate,
    usage,
    blockedByBackend: hasFlags && canDelete === false && canDeactivate === false,
    isHistorical: hasFlags && canDeactivate === true && canDelete !== true,
  };
}

export type ClassUsageLine = { key: string; label: string };

export function formatClassUsageLines(
  usage: SchoolClassUsage,
  t: (key: string, vars?: Record<string, string | number>) => string,
): ClassUsageLine[] {
  const lines: ClassUsageLine[] = [];
  if (usage.students > 0) {
    lines.push({
      key: 'students',
      label: t('admin.academicSetup.guided.usageStudents', { count: usage.students }),
    });
  }
  if (usage.enrollments > 0 && usage.enrollments !== usage.students) {
    lines.push({
      key: 'enrollments',
      label: t('admin.academicSetup.guided.usageEnrollments', { count: usage.enrollments }),
    });
  } else if (usage.enrollments > 0 && usage.students === 0) {
    lines.push({
      key: 'enrollments',
      label: t('admin.academicSetup.guided.usageEnrollments', { count: usage.enrollments }),
    });
  }
  if (usage.assignments > 0) {
    lines.push({
      key: 'assignments',
      label: t('admin.academicSetup.guided.usageAssignments', { count: usage.assignments }),
    });
  }
  if (usage.timetable_slots > 0) {
    lines.push({
      key: 'timetable_slots',
      label: t('admin.academicSetup.guided.usageTimetableSlots', { count: usage.timetable_slots }),
    });
  }
  if (usage.exams > 0) {
    lines.push({
      key: 'exams',
      label: t('admin.academicSetup.guided.usageExams', { count: usage.exams }),
    });
  }
  if ((usage.homeworks ?? 0) > 0) {
    lines.push({
      key: 'homeworks',
      label: t('admin.academicSetup.guided.usageHomeworks', { count: usage.homeworks! }),
    });
  }
  if ((usage.attendance_records ?? 0) > 0) {
    lines.push({
      key: 'attendance_records',
      label: t('admin.academicSetup.guided.usageAttendanceRecords', {
        count: usage.attendance_records!,
      }),
    });
  }
  return lines;
}

export function mergeClassUsageFromError(
  cls: SchoolClass,
  error?: ApiErrorBody,
): SchoolClassUsage {
  const fromError = usageFromClassErrorDetails(error?.details);
  if (fromError) return fromError;
  return resolveClassUsage(cls);
}
