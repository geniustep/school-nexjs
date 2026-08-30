import type { SchoolClass } from '@/types/class';

type ClassListItemWithCanonicalCount = SchoolClass & {
  assigned_count?: number | null;
};

/**
 * `/admin/classes` now exposes canonical enrollment occupancy as `assigned_count`.
 * Legacy `student_count` can reflect the operational current-class pointer and may
 * disagree with annual enrollment history, so class-list UI must prefer the
 * canonical count whenever the backend provides it.
 */
export function canonicalClassStudentCount(cls: SchoolClass): number {
  const assigned = (cls as ClassListItemWithCanonicalCount).assigned_count;
  if (typeof assigned === 'number' && Number.isFinite(assigned) && assigned >= 0) {
    return assigned;
  }
  return cls.student_count ?? 0;
}

export function canonicalizeClassStudentCounts(classes: SchoolClass[]): SchoolClass[] {
  return classes.map((cls) => {
    const canonical = canonicalClassStudentCount(cls);
    return canonical === cls.student_count ? cls : { ...cls, student_count: canonical };
  });
}
