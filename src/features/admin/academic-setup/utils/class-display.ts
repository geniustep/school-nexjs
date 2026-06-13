import type { Locale } from '@/lib/i18n/config';
import type { TranslateFn } from '@/features/i18n/locale-context';
import { formatCountLabel, pluralForm } from '@/lib/i18n/count-plural';
import type { SchoolClass, Subject } from '@/types/class';
import {
  dedupeClassSubjects,
  resolveClassSubjectsBreakdown,
  resolveEffectiveSubjectsCount,
  resolveMissingTeacherAssignmentsCount,
} from './normalize-class';

function effectiveSubjectsKey(locale: Locale, count: number): string {
  const form = pluralForm(count, locale);
  return `admin.academicSetup.classEffectiveSubjects.${form}`;
}

export function classEffectiveSubjectsLine(
  t: TranslateFn,
  locale: Locale,
  cls: Pick<SchoolClass, 'effective_subjects_count' | 'subjects_count' | 'subjects'>,
): string {
  const count = resolveEffectiveSubjectsCount(cls);
  const key = effectiveSubjectsKey(locale, count);
  if (count === 1 || count === 2) return t(key);
  return t(key, { count });
}

function inheritedLevelLine(t: TranslateFn, locale: Locale, count: number): string {
  const form = pluralForm(count, locale);
  const key = `admin.academicSetup.classSubjectsInheritedLevel.${form}`;
  if (count === 1 || count === 2) return t(key);
  return t(key, { count });
}

function additionalSubjectsLine(t: TranslateFn, locale: Locale, count: number): string {
  const form = pluralForm(count, locale);
  const key = `admin.academicSetup.classSubjectsAdditional.${form}`;
  if (count === 1 || count === 2) return t(key);
  return t(key, { count });
}

function inheritedPlusDirectLine(
  t: TranslateFn,
  locale: Locale,
  inherited: number,
  direct: number,
): string {
  const inheritedLabel =
    inherited === 1 || inherited === 2
      ? t(`admin.academicSetup.classSubjectsInheritedShort.${pluralForm(inherited, locale)}`)
      : t(`admin.academicSetup.classSubjectsInheritedShort.${pluralForm(inherited, locale)}`, {
          count: inherited,
        });
  const directLabel = additionalSubjectsLine(t, locale, direct);
  return t('admin.academicSetup.classSubjectsInheritedPlusDirect', {
    inherited: inheritedLabel,
    direct: directLabel,
  });
}

function levelAndTrackBreakdown(
  t: TranslateFn,
  locale: Locale,
  levelCount: number,
  trackCount: number,
): string {
  const levelPart =
    levelCount === 1 || levelCount === 2
      ? t(`admin.academicSetup.classSubjectsFromLevel.${pluralForm(levelCount, locale)}`)
      : t(`admin.academicSetup.classSubjectsFromLevel.${pluralForm(levelCount, locale)}`, {
          count: levelCount,
        });
  const trackPart =
    trackCount === 1 || trackCount === 2
      ? t(`admin.academicSetup.classSubjectsFromTrack.${pluralForm(trackCount, locale)}`)
      : t(`admin.academicSetup.classSubjectsFromTrack.${pluralForm(trackCount, locale)}`, {
          count: trackCount,
        });
  return t('admin.academicSetup.classSubjectsLevelAndTrackBreakdown', {
    levelPart,
    trackPart,
  });
}

export function classSubjectsSourceLine(
  t: TranslateFn,
  locale: Locale,
  cls: Pick<
    SchoolClass,
    | 'inherited_level_subjects_count'
    | 'inherited_track_subjects_count'
    | 'direct_class_subjects_count'
    | 'excluded_subjects_count'
    | 'subjects_source'
    | 'effective_subjects_count'
    | 'subjects_count'
    | 'subjects'
  >,
): string | null {
  const breakdown = resolveClassSubjectsBreakdown(cls);
  const { inheritedLevel, inheritedTrack, direct, excluded, effective } = breakdown;
  const inheritedTotal = inheritedLevel + inheritedTrack;

  if (excluded > 0 && inheritedTotal === 0 && direct === 0) {
    const effectiveLabel = classEffectiveSubjectsLine(t, locale, cls);
    const excludedLabel = formatCountLabel(t, locale, 'subject', excluded);
    return t('admin.academicSetup.classSubjectsWithExcluded', {
      effective: effectiveLabel,
      excluded: excludedLabel,
    });
  }

  if (inheritedLevel > 0 && inheritedTrack === 0 && direct === 0 && excluded === 0) {
    return inheritedLevelLine(t, locale, inheritedLevel);
  }

  if (inheritedTrack > 0 && inheritedLevel === 0 && direct === 0 && excluded === 0) {
    return t('admin.academicSetup.classSubjectsInheritedTrackOnly');
  }

  if (inheritedLevel > 0 && inheritedTrack > 0 && direct === 0 && excluded === 0) {
    return levelAndTrackBreakdown(t, locale, inheritedLevel, inheritedTrack);
  }

  if (direct > 0 && inheritedTotal === 0 && excluded === 0) {
    return t('admin.academicSetup.classSubjectsDirectOnly');
  }

  if (direct > 0 && inheritedTotal > 0) {
    const line = inheritedPlusDirectLine(t, locale, inheritedTotal, direct);
    if (excluded > 0) {
      const excludedLabel = formatCountLabel(t, locale, 'subject', excluded);
      return t('admin.academicSetup.classSubjectsMixWithExcluded', { line, excluded: excludedLabel });
    }
    return line;
  }

  if (excluded > 0 && effective > 0) {
    const effectiveLabel = classEffectiveSubjectsLine(t, locale, cls);
    const excludedLabel = formatCountLabel(t, locale, 'subject', excluded);
    return t('admin.academicSetup.classSubjectsWithExcluded', {
      effective: effectiveLabel,
      excluded: excludedLabel,
    });
  }

  if (breakdown.subjectsSource === 'inherited' && inheritedTotal === 0 && effective > 0) {
    return t('admin.academicSetup.classSubjectsInheritedLevelAndTrack');
  }

  return null;
}

export function classStudentCountLine(
  t: TranslateFn,
  locale: Locale,
  studentCount: number,
): string {
  if (studentCount === 0) {
    return t('admin.academicSetup.countPlural.student.zero');
  }
  return formatCountLabel(t, locale, 'student', studentCount);
}

export function classReadinessBadge(
  t: TranslateFn,
  locale: Locale,
  cls: Pick<SchoolClass, 'missing_teacher_assignments_count' | 'subjects'>,
  variant: 'short' | 'long' = 'long',
): string | null {
  const missing = resolveMissingTeacherAssignmentsCount(cls);
  if (missing <= 0) return null;

  if (variant === 'short') {
    const form = pluralForm(missing, locale);
    const key = `admin.academicSetup.classMissingAssignmentsShort.${form}`;
    if (missing === 1 || missing === 2) return t(key);
    return t(key, { count: missing });
  }

  const form = pluralForm(missing, locale);
  const key = `admin.academicSetup.classNeedsTeacherAssignments.${form}`;
  if (missing === 1 || missing === 2) return t(key);
  return t(key, { count: missing });
}

export function classReadinessDetail(
  t: TranslateFn,
  cls: Pick<SchoolClass, 'missing_teacher_assignments_count' | 'subjects'>,
): string | null {
  const missing = resolveMissingTeacherAssignmentsCount(cls);
  if (missing <= 0) return null;
  return t('admin.academicSetup.classSubjectsReadyNeedsTeachers');
}

export function classSubjectSourceLabel(t: TranslateFn, source: Subject['source']): string | null {
  switch (source) {
    case 'level':
      return t('admin.academicSetup.classSubjectSourceLevel');
    case 'track':
      return t('admin.academicSetup.classSubjectSourceTrack');
    case 'class':
      return t('admin.academicSetup.classSubjectSourceClass');
    default:
      return null;
  }
}

export function classDetailSubjects(cls: Pick<SchoolClass, 'subjects'>): Subject[] {
  return dedupeClassSubjects(cls.subjects);
}
