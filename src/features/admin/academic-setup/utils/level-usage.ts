import type { SchoolLevelUsage } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import type { ApiErrorBody } from '@/types/api';

export function resolveLevelUsage(level: Level): SchoolLevelUsage {
  if (level.usage) return level.usage;
  return {
    classes: level.classes_count ?? 0,
    subjects: level.subjects_count ?? 0,
    tracks: 0,
    students: 0,
    enrollments: 0,
    assignments: 0,
    timetable_slots: 0,
    exams: 0,
  };
}

export function usageFromErrorDetails(
  details?: Record<string, unknown>,
): SchoolLevelUsage | null {
  if (!details || typeof details !== 'object') return null;
  const n = (key: string) => Number(details[key] ?? 0) || 0;
  return {
    classes: n('classes'),
    subjects: n('subjects'),
    tracks: n('tracks'),
    students: n('students'),
    enrollments: n('enrollments'),
    assignments: n('assignments'),
    timetable_slots: n('timetable_slots'),
    exams: n('exams'),
  };
}

export function levelHasOperationalUsage(usage: SchoolLevelUsage): boolean {
  return (
    usage.classes > 0 ||
    usage.subjects > 0 ||
    usage.tracks > 0 ||
    usage.students > 0 ||
    usage.enrollments > 0 ||
    usage.assignments > 0 ||
    usage.timetable_slots > 0 ||
    usage.exams > 0
  );
}

export function resolveLevelRemovalFlags(level: Level): {
  canDelete: boolean | null;
  canDeactivate: boolean | null;
  usage: SchoolLevelUsage;
  blockedByBackend: boolean;
  isHistorical: boolean;
} {
  const usage = resolveLevelUsage(level);
  const hasFlags = level.can_delete != null || level.can_deactivate != null;
  const canDelete = level.can_delete ?? null;
  const canDeactivate = level.can_deactivate ?? null;

  return {
    canDelete,
    canDeactivate,
    usage,
    blockedByBackend: hasFlags && canDelete === false && canDeactivate === false,
    isHistorical: hasFlags && canDeactivate === true && canDelete !== true,
  };
}

export type UsageLine = { key: string; label: string };

export function formatUsageLines(
  usage: SchoolLevelUsage,
  t: (key: string, vars?: Record<string, string | number>) => string,
): UsageLine[] {
  const lines: UsageLine[] = [];
  if (usage.classes > 0) {
    lines.push({
      key: 'classes',
      label: t('admin.academicSetup.guided.usageClasses', { count: usage.classes }),
    });
  }
  if (usage.subjects > 0) {
    lines.push({
      key: 'subjects',
      label: t('admin.academicSetup.guided.usageSubjects', { count: usage.subjects }),
    });
  }
  if (usage.tracks > 0) {
    lines.push({
      key: 'tracks',
      label: t('admin.academicSetup.guided.usageTracks', { count: usage.tracks }),
    });
  }
  if (usage.students > 0) {
    lines.push({
      key: 'students',
      label: t('admin.academicSetup.guided.usageStudents', { count: usage.students }),
    });
  }
  if (usage.enrollments > 0) {
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
  return lines;
}

export function primaryLinkedItemsRoute(
  levelId: number,
  usage: SchoolLevelUsage,
): string | null {
  if (usage.classes > 0) {
    return `/admin/settings/academic-setup/classes?level=${levelId}`;
  }
  if (usage.subjects > 0 || usage.tracks > 0) {
    return `/admin/settings/academic-setup/subjects?level=${levelId}`;
  }
  if (usage.assignments > 0) {
    return `/admin/settings/academic-setup/assignments?level=${levelId}`;
  }
  if (usage.timetable_slots > 0) {
    return '/admin/timetable';
  }
  if (usage.exams > 0) {
    return '/admin/exams';
  }
  if (usage.students > 0 || usage.enrollments > 0) {
    return `/admin/settings/academic-setup/classes?level=${levelId}`;
  }
  return null;
}

export function mergeUsageFromError(
  level: Level,
  error?: ApiErrorBody,
): SchoolLevelUsage {
  const fromError = usageFromErrorDetails(error?.details);
  if (fromError) return fromError;
  return resolveLevelUsage(level);
}
