import type { SchoolClass } from '@/types/class';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';

type ContextClass = AcademicContextOptionsResponse['classes'][number];

type AssignmentClassOption = Pick<SchoolClass, 'id' | 'name' | 'display_name' | 'display_alias'> & {
  academic_year_id?: number | null;
  level?: {
    id: number;
    cycle?: { id: number } | null;
  } | null;
};

function matchesGuidedContext(
  item: AssignmentClassOption,
  levelId: number,
  cycleId?: number,
  academicYearId?: number,
) {
  if (!levelId || item.level?.id !== levelId) return false;
  if (cycleId && item.level?.cycle?.id != null && item.level.cycle.id !== cycleId) return false;
  if (
    academicYearId &&
    item.academic_year_id != null &&
    item.academic_year_id !== academicYearId
  ) {
    return false;
  }
  return true;
}

export function resolveGuidedAssignmentClasses(
  classes: SchoolClass[],
  contextClasses: ContextClass[],
  selection: { levelId: string; cycleId: string },
  academicYearId?: number,
): AssignmentClassOption[] {
  const levelId = Number(selection.levelId || 0);
  const cycleId = Number(selection.cycleId || 0) || undefined;
  if (!levelId) return [];

  const canonicalMatches = classes.filter((item) =>
    matchesGuidedContext(item, levelId, cycleId, academicYearId),
  );
  if (canonicalMatches.length) return canonicalMatches;

  return contextClasses.filter((item) =>
    matchesGuidedContext(item, levelId, cycleId, academicYearId),
  );
}
