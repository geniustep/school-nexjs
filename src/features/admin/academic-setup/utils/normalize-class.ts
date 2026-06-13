import type { SchoolClass, Subject } from '@/types/class';

function finiteCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.max(0, Math.trunc(value));
}

/** Effective subjects count — prefers API contract fields, safe legacy fallback. */
export function resolveEffectiveSubjectsCount(
  cls: Pick<SchoolClass, 'effective_subjects_count' | 'subjects_count' | 'subjects'>,
): number {
  const effective = finiteCount(cls.effective_subjects_count);
  if (effective != null) return effective;

  const subjectsCount = finiteCount(cls.subjects_count);
  if (subjectsCount != null) return subjectsCount;

  return cls.subjects?.length ?? 0;
}

export function resolveClassSubjectsBreakdown(
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
): {
  effective: number;
  inheritedLevel: number;
  inheritedTrack: number;
  direct: number;
  excluded: number;
  subjectsSource?: SchoolClass['subjects_source'];
} {
  const effective = resolveEffectiveSubjectsCount(cls);
  const inheritedLevel = finiteCount(cls.inherited_level_subjects_count) ?? 0;
  const inheritedTrack = finiteCount(cls.inherited_track_subjects_count) ?? 0;
  const direct = finiteCount(cls.direct_class_subjects_count) ?? 0;
  const excluded = finiteCount(cls.excluded_subjects_count) ?? 0;

  return {
    effective,
    inheritedLevel,
    inheritedTrack,
    direct,
    excluded,
    subjectsSource: cls.subjects_source,
  };
}

export function resolveMissingTeacherAssignmentsCount(
  cls: Pick<SchoolClass, 'missing_teacher_assignments_count' | 'subjects'>,
): number {
  const fromApi = finiteCount(cls.missing_teacher_assignments_count);
  if (fromApi != null) return fromApi;
  return 0;
}

/** Deduplicate effective subjects by id (API may list a subject once). */
export function dedupeClassSubjects(subjects: Subject[] | undefined): Subject[] {
  if (!subjects?.length) return [];
  const seen = new Set<number>();
  const result: Subject[] = [];
  for (const subject of subjects) {
    if (seen.has(subject.id)) continue;
    seen.add(subject.id);
    result.push(subject);
  }
  return result;
}

export function normalizeSchoolClass(raw: SchoolClass): SchoolClass {
  const subjects = dedupeClassSubjects(raw.subjects);
  const effective_subjects_count = resolveEffectiveSubjectsCount({ ...raw, subjects });

  return {
    ...raw,
    subjects,
    effective_subjects_count,
    subjects_count: finiteCount(raw.subjects_count) ?? effective_subjects_count,
    inherited_level_subjects_count: finiteCount(raw.inherited_level_subjects_count),
    inherited_track_subjects_count: finiteCount(raw.inherited_track_subjects_count),
    direct_class_subjects_count: finiteCount(raw.direct_class_subjects_count),
    excluded_subjects_count: finiteCount(raw.excluded_subjects_count),
    missing_teacher_assignments_count: finiteCount(raw.missing_teacher_assignments_count),
  };
}
