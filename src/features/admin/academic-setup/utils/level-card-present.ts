import type { Locale } from '@/lib/i18n/config';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { formatCountLabel } from '@/lib/i18n/count-plural';
import type { Level } from '@/types/class';
import { resolveTracksCount } from './normalize-level';

export type LevelPrimaryCtaKey = 'createFirstClass' | 'addClasses';

export function levelPrimaryCtaKey(classCount: number): LevelPrimaryCtaKey {
  return classCount > 0 ? 'addClasses' : 'createFirstClass';
}

export function levelCtaI18nKey(classCount: number): string {
  return `admin.academicSetup.${levelPrimaryCtaKey(classCount)}`;
}

export function shouldShowDuplicateLevelCtas(classCount: number): boolean {
  return false;
}

export function buildLevelStatsSummary(
  t: TranslateFn,
  locale: Locale,
  params: {
    classes: number;
    students: number;
    subjects: number;
    tracks: number | null;
  },
): string {
  const parts = [
    formatCountLabel(t, locale, 'class', params.classes),
    formatCountLabel(t, locale, 'student', params.students),
    formatCountLabel(t, locale, 'subject', params.subjects),
  ].filter(Boolean);

  if (params.tracks != null && params.tracks > 0) {
    parts.push(formatCountLabel(t, locale, 'track', params.tracks, 'linked'));
  }

  return parts.join(' · ');
}

export function levelCardStatsInput(
  level: Level & { studentCount?: number },
  subjectCount: number,
): {
  classes: number;
  students: number;
  subjects: number;
  tracks: number | null;
} {
  return {
    classes: level.classes_count ?? 0,
    students: level.studentCount ?? level.usage?.students ?? 0,
    subjects: level.subjects_count ?? subjectCount,
    tracks: resolveTracksCount(level),
  };
}

export function levelCardEmptyHintKey(tracksCount: number | null): string {
  if (tracksCount != null && tracksCount > 0) {
    return 'admin.academicSetup.levelNeedsClassesWithTracksHint';
  }
  return 'admin.academicSetup.noClassesInLevel';
}
