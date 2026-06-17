import { planLevelIdsForFilter } from '@/features/admin/finance/fee-plan-assign-validation';
import type { FeePlan, FinanceStudentSearchResult } from '@/types/finance';

export type StudentPlanEligibility =
  | 'eligible'
  | 'already_assigned'
  | 'level_out_of_scope'
  | 'no_active_year';

export interface StudentEligibilityRow {
  student: FinanceStudentSearchResult;
  status: StudentPlanEligibility;
  selectable: boolean;
}

export function studentMatchesPlanLevels(
  student: FinanceStudentSearchResult,
  planLevelIds: number[],
): boolean {
  if (!planLevelIds.length) return true;
  const levelId = student.level?.id;
  if (!levelId) return false;
  return planLevelIds.includes(levelId);
}

export function assessStudentEligibility(
  student: FinanceStudentSearchResult,
  plan: FeePlan,
  assignedStudentIds: ReadonlySet<number> = new Set(),
): StudentEligibilityRow {
  const planLevelIds = planLevelIdsForFilter(plan);

  if (assignedStudentIds.has(student.id)) {
    return { student, status: 'already_assigned', selectable: false };
  }

  if (!studentMatchesPlanLevels(student, planLevelIds)) {
    return { student, status: 'level_out_of_scope', selectable: false };
  }

  return { student, status: 'eligible', selectable: true };
}

export function filterEligibilityRows(
  rows: StudentEligibilityRow[],
  filters: {
    search: string;
    levelId: string;
    classId: string;
    statusFilter: '' | StudentPlanEligibility | 'not_eligible';
  },
): StudentEligibilityRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.levelId && String(row.student.level?.id ?? '') !== filters.levelId) return false;
    if (filters.classId && String(row.student.class?.id ?? '') !== filters.classId) return false;

    if (filters.statusFilter === 'eligible' && row.status !== 'eligible') return false;
    if (filters.statusFilter === 'already_assigned' && row.status !== 'already_assigned') return false;
    if (filters.statusFilter === 'level_out_of_scope' && row.status !== 'level_out_of_scope') return false;
    if (filters.statusFilter === 'not_eligible' && row.selectable) return false;

    if (!search) return true;
    const name = (row.student.full_name ?? row.student.name ?? '').toLowerCase();
    const code = (row.student.code ?? '').toLowerCase();
    return name.includes(search) || code.includes(search);
  });
}
