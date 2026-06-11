import type { Level } from '@/types/class';
import type { LevelUsage } from '@/types/academic-levels';

export function resolveLevelUsage(level: Level): LevelUsage {
  if (level.usage) return level.usage;
  return {
    classes: level.classes_count ?? 0,
    subjects: level.subjects_count ?? 0,
    tracks: 0,
    students: 0,
    assignments: 0,
  };
}

export function levelHasOperationalUsage(usage: LevelUsage): boolean {
  return (
    usage.classes > 0 ||
    usage.subjects > 0 ||
    usage.tracks > 0 ||
    usage.students > 0 ||
    usage.assignments > 0
  );
}

export function resolveLevelRemovalFlags(level: Level): {
  canDelete: boolean;
  canDeactivate: boolean;
  usage: LevelUsage;
} {
  const usage = resolveLevelUsage(level);
  const inUse = levelHasOperationalUsage(usage);

  if (level.can_delete != null || level.can_deactivate != null) {
    return {
      canDelete: level.can_delete ?? false,
      canDeactivate: level.can_deactivate ?? false,
      usage,
    };
  }

  return {
    canDelete: !inUse,
    canDeactivate: inUse,
    usage,
  };
}
