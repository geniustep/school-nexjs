import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';

/** Keep only plans tied to the selected academic year when year metadata is present. */
export function filterFeePlansForAcademicYear(
  plans: FeePlan[],
  academicYearId: number,
): FeePlan[] {
  return plans.filter((plan) => {
    const year = academicYearFromSource(plan);
    return year ? year.id === academicYearId : plan.academic_year_id === academicYearId;
  });
}

export function canSubmitFeePlanAssignment(options: {
  academicYearId: string;
  feePlanId: string;
  plansLoading: boolean;
  plansError: boolean;
  submitting: boolean;
}): boolean {
  if (options.submitting || options.plansLoading || options.plansError) return false;
  if (!options.academicYearId || !options.feePlanId) return false;
  return Number(options.feePlanId) > 0;
}
