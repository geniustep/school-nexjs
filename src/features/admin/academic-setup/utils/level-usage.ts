import type { SchoolLevelUsage } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import type { ApiErrorBody } from '@/types/api';
import { resolveTracksCount } from './normalize-level';
import { nonZeroUsageTypes } from './level-linked-items';

export function resolveLevelUsage(level: Level): Required<SchoolLevelUsage> {
  if (level.usage) {
    return {
      classes: level.usage.classes ?? 0,
      subjects: level.usage.subjects ?? 0,
      tracks: level.usage.tracks ?? 0,
      students: level.usage.students ?? 0,
      enrollments: level.usage.enrollments ?? 0,
      assignments: level.usage.assignments ?? 0,
      timetable_slots: level.usage.timetable_slots ?? 0,
      exams: level.usage.exams ?? 0,
    };
  }

  const tracksCount = resolveTracksCount(level);
  return {
    classes: level.classes_count ?? 0,
    subjects: level.subjects_count ?? 0,
    tracks: tracksCount ?? 0,
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
  return nonZeroUsageTypes(usage).length > 0;
}

export function resolveLevelRemovalFlags(level: Level): {
  canDelete: boolean | null;
  canDeactivate: boolean | null;
  usage: Required<SchoolLevelUsage>;
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

export function mergeUsageFromError(
  level: Level,
  error?: ApiErrorBody,
): Required<SchoolLevelUsage> {
  const fromError = usageFromErrorDetails(error?.details);
  if (fromError) {
    return {
      classes: fromError.classes ?? 0,
      subjects: fromError.subjects ?? 0,
      tracks: fromError.tracks ?? 0,
      students: fromError.students ?? 0,
      enrollments: fromError.enrollments ?? 0,
      assignments: fromError.assignments ?? 0,
      timetable_slots: fromError.timetable_slots ?? 0,
      exams: fromError.exams ?? 0,
    };
  }
  return resolveLevelUsage(level);
}

// Re-export linked-item helpers for backward compatibility in imports.
export {
  formatUsageLines,
  linkedItemsCta,
  primaryLinkedItemsRoute,
  levelRemoveDialogState,
  levelRemoveDialogTitleKey,
  levelRemoveDialogDescriptionKey,
  formatLinkedTrackNames,
  hasLinkedTrackNames,
  mergeLinkedItems,
} from './level-linked-items';
export type { UsageLine, LinkedItemsCta, LevelRemoveDialogState } from './level-linked-items';
