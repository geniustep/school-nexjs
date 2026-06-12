import type { Locale } from '@/lib/i18n/config';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { formatCountLabel } from '@/lib/i18n/count-plural';
import type { LevelLinkedItems, LinkedTrack, SchoolLevelUsage } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import { setupSectionHref } from './section-routes';

export type UsageLine = { key: string; label: string };

export type LinkedItemsCta = {
  labelKey: string;
  href: string;
};

export type LevelRemoveDialogState = 'blocked' | 'deactivate' | 'delete';

const USAGE_KEYS: Array<{ key: keyof SchoolLevelUsage; entity: Parameters<typeof formatCountLabel>[2] }> = [
  { key: 'tracks', entity: 'track' },
  { key: 'classes', entity: 'class' },
  { key: 'subjects', entity: 'subject' },
  { key: 'students', entity: 'student' },
  { key: 'enrollments', entity: 'enrollment' },
  { key: 'assignments', entity: 'assignment' },
  { key: 'timetable_slots', entity: 'timetableSlot' },
  { key: 'exams', entity: 'exam' },
];

export function nonZeroUsageTypes(usage: SchoolLevelUsage): string[] {
  return USAGE_KEYS.filter(({ key }) => (usage[key] ?? 0) > 0).map(({ key }) => key);
}

export function formatUsageLines(
  usage: SchoolLevelUsage,
  t: TranslateFn,
  locale: Locale,
): UsageLine[] {
  return USAGE_KEYS.flatMap(({ key, entity }) => {
    const count = usage[key] ?? 0;
    if (count <= 0) return [];
    return [{ key, label: formatCountLabel(t, locale, entity, count) }];
  });
}

export function levelRemoveDialogState(
  showBlocked: boolean,
  isHistorical: boolean,
): LevelRemoveDialogState {
  if (showBlocked) return 'blocked';
  if (isHistorical) return 'deactivate';
  return 'delete';
}

export function levelRemoveDialogTitleKey(state: LevelRemoveDialogState): string {
  switch (state) {
    case 'blocked':
      return 'admin.academicSetup.guided.cannotRemoveLevelTitle';
    case 'deactivate':
      return 'admin.academicSetup.guided.deactivateLevelTitle';
    default:
      return 'admin.academicSetup.guided.removeLevelTitle';
  }
}

export function levelRemoveDialogDescriptionKey(state: LevelRemoveDialogState): string {
  switch (state) {
    case 'blocked':
      return 'admin.academicSetup.guided.cannotRemoveLevelDescription';
    case 'deactivate':
      return 'admin.academicSetup.guided.removeLevelHistoricalDesc';
    default:
      return 'admin.academicSetup.guided.removeLevelEmptyDesc';
  }
}

function singleTypeRoute(levelId: number, type: string, usage: SchoolLevelUsage): string | null {
  switch (type) {
    case 'classes':
      return setupSectionHref('classes', { level: levelId });
    case 'tracks':
      return setupSectionHref('tracks', { tab: 'tracks', level_id: levelId });
    case 'subjects':
      return setupSectionHref('subjects', { level_id: levelId });
    case 'assignments':
      return setupSectionHref('assignments', { level_id: levelId });
    case 'students':
    case 'enrollments':
      return setupSectionHref('classes', { level: levelId });
    case 'timetable_slots':
      return '/admin/timetable';
    case 'exams':
      return '/admin/exams';
    default:
      return null;
  }
}

export function primaryLinkedItemsRoute(
  levelId: number,
  usage: SchoolLevelUsage,
): string | null {
  const types = nonZeroUsageTypes(usage);
  if (types.length === 0) return null;
  if (types.length === 1) {
    return singleTypeRoute(levelId, types[0], usage);
  }

  if ((usage.classes ?? 0) > 0) return setupSectionHref('classes', { level: levelId });
  if ((usage.tracks ?? 0) > 0) {
    return setupSectionHref('tracks', { tab: 'tracks', level_id: levelId });
  }
  if ((usage.subjects ?? 0) > 0) return setupSectionHref('subjects', { level_id: levelId });
  if ((usage.assignments ?? 0) > 0) return setupSectionHref('assignments', { level_id: levelId });
  if ((usage.timetable_slots ?? 0) > 0) return '/admin/timetable';
  if ((usage.exams ?? 0) > 0) return '/admin/exams';
  if ((usage.students ?? 0) > 0 || (usage.enrollments ?? 0) > 0) {
    return setupSectionHref('classes', { level: levelId });
  }
  return null;
}

export function linkedItemsCta(
  levelId: number,
  usage: SchoolLevelUsage,
): LinkedItemsCta | null {
  const href = primaryLinkedItemsRoute(levelId, usage);
  if (!href) return null;

  const types = nonZeroUsageTypes(usage);
  if (types.length === 1) {
    if (types[0] === 'tracks') {
      return {
        labelKey:
          (usage.tracks ?? 0) === 1
            ? 'admin.academicSetup.guided.viewLinkedTrack'
            : 'admin.academicSetup.guided.viewLinkedTracks',
        href,
      };
    }
    if (types[0] === 'classes') {
      return { labelKey: 'admin.academicSetup.guided.viewLinkedClasses', href };
    }
  }

  return { labelKey: 'admin.academicSetup.guided.viewLinkedItems', href };
}

export type LinkedTrackNamesPresentation = {
  items: LinkedTrack[];
  overflow: boolean;
};

export function formatLinkedTrackNames(
  linkedItems: LevelLinkedItems | undefined,
  maxVisible = 3,
): LinkedTrackNamesPresentation {
  const tracks = linkedItems?.tracks ?? [];
  if (tracks.length === 0) {
    return { items: [], overflow: false };
  }
  return {
    items: tracks.slice(0, maxVisible),
    overflow: tracks.length > maxVisible,
  };
}

export function hasLinkedTrackNames(level: Pick<Level, 'linked_items'>): boolean {
  return (level.linked_items?.tracks?.length ?? 0) > 0;
}

export function mergeLinkedItems(
  level: Level,
  fetched?: Level | null,
): LevelLinkedItems | undefined {
  return fetched?.linked_items ?? level.linked_items;
}
