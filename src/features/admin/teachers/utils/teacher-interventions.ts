/**
 * Director P0 interventions — derived only from TeacherSummary list fields.
 * No academic-profile / timetable / progress fetches.
 */

import type { TeacherSummary } from '@/types/teacher-domain';
import { teacherEmploymentState } from './teacher-domain-present';

export const TEACHER_INTERVENTION_CODES = [
  'NO_OPERATIONAL_ASSIGNMENT',
  'ACCOUNT_INACTIVE_OR_MISSING',
  'ACADEMIC_PROFILE_INCOMPLETE',
  'HAS_ROW_WARNINGS',
] as const;

export type TeacherInterventionCode = (typeof TEACHER_INTERVENTION_CODES)[number];

export type TeacherInterventionPriority = 'P1' | 'P2' | 'P3';

export type TeacherOperationalPreset =
  | 'all'
  | 'needs_intervention'
  | 'no_assignment'
  | 'inactive_account'
  | 'incomplete_academic_profile';

export type TeacherIntervention = {
  code: TeacherInterventionCode;
  priority: TeacherInterventionPriority;
  /** Stable sort key within the same priority (lower first). */
  rank: number;
  targetPath: string;
  warningCode?: string;
  warningMessage?: string;
};

const PRIORITY_ORDER: Record<TeacherInterventionPriority, number> = {
  P1: 0,
  P2: 1,
  P3: 2,
};

const INCOMPLETE_ACADEMIC = new Set(['unconfigured', 'partial']);

function accountInfo(teacher: Pick<TeacherSummary, 'account'>): {
  hasLinked: boolean | undefined;
  userActive: boolean | undefined;
} {
  const account = teacher.account as
    | {
        has_linked_user?: boolean;
        user_active?: boolean;
      }
    | null
    | undefined;
  if (!account) return { hasLinked: undefined, userActive: undefined };
  return {
    hasLinked: account.has_linked_user,
    userActive: account.user_active,
  };
}

/** Professionally active for operational P0 rules (explicit, non-guessing). */
export function teacherIsOperationallyActive(
  teacher: Pick<TeacherSummary, 'employment' | 'status' | 'active'>,
): boolean {
  if (teacher.active === false) return false;
  const state = teacherEmploymentState(teacher);
  return state === 'active';
}

export function teacherHasOperationalAssignment(
  teacher: Pick<TeacherSummary, 'assignment_summary'>,
): boolean | null {
  const count = teacher.assignment_summary?.operational_count;
  if (count == null || Number.isNaN(Number(count))) return null;
  return Number(count) > 0;
}

function academicCompleteness(
  teacher: Pick<TeacherSummary, 'academic_profile_summary'>,
): string | null {
  const raw = teacher.academic_profile_summary?.academic_completeness;
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim();
}

export function teacherAccountNeedsAttention(
  teacher: Pick<TeacherSummary, 'account'>,
): boolean {
  if (teacher.account == null) return true;
  const { hasLinked, userActive } = accountInfo(teacher);
  if (hasLinked !== true) return true;
  if (userActive === false) return true;
  return false;
}

export function teacherAcademicProfileIncomplete(
  teacher: Pick<TeacherSummary, 'academic_profile_summary'>,
): boolean {
  const state = academicCompleteness(teacher);
  if (!state) return false;
  return INCOMPLETE_ACADEMIC.has(state);
}

function compareInterventions(a: TeacherIntervention, b: TeacherIntervention): number {
  const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (byPriority !== 0) return byPriority;
  if (a.rank !== b.rank) return a.rank - b.rank;
  return a.code.localeCompare(b.code);
}

export function deriveTeacherInterventions(teacher: TeacherSummary): TeacherIntervention[] {
  const items: TeacherIntervention[] = [];
  const id = teacher.id;

  const hasOp = teacherHasOperationalAssignment(teacher);
  if (teacherIsOperationallyActive(teacher) && hasOp === false) {
    items.push({
      code: 'NO_OPERATIONAL_ASSIGNMENT',
      priority: 'P1',
      rank: 10,
      targetPath: `/admin/teaching-assignments?teacher_id=${id}`,
    });
  }

  if (teacherAccountNeedsAttention(teacher)) {
    items.push({
      code: 'ACCOUNT_INACTIVE_OR_MISSING',
      priority: 'P1',
      rank: 20,
      targetPath: `/admin/teachers/${id}?tab=account`,
    });
  }

  if (teacherAcademicProfileIncomplete(teacher)) {
    items.push({
      code: 'ACADEMIC_PROFILE_INCOMPLETE',
      priority: 'P2',
      rank: 10,
      targetPath: `/admin/teachers/${id}?tab=academic`,
    });
  }

  const warnings = Array.isArray(teacher.warnings) ? teacher.warnings : [];
  if (warnings.length > 0) {
    const first = warnings[0];
    const warningCode = typeof first?.code === 'string' ? first.code : undefined;
    const warningMessage =
      typeof first?.message === 'string' && first.message.trim()
        ? first.message.trim()
        : undefined;
    items.push({
      code: 'HAS_ROW_WARNINGS',
      priority: 'P2',
      rank: 20,
      targetPath: `/admin/teachers/${id}`,
      warningCode,
      warningMessage,
    });
  }

  // EMPLOYMENT_NOT_ACTIVE deferred: cannot detect "unexpected operational presence"
  // from list fields without guessing.

  const byCode = new Map<TeacherInterventionCode, TeacherIntervention>();
  for (const item of items) {
    if (!byCode.has(item.code)) byCode.set(item.code, item);
  }

  return Array.from(byCode.values()).sort(compareInterventions);
}

export function getTeacherPrimaryIntervention(
  teacher: TeacherSummary,
): TeacherIntervention | null {
  return deriveTeacherInterventions(teacher)[0] ?? null;
}

export function teacherNeedsIntervention(teacher: TeacherSummary): boolean {
  return deriveTeacherInterventions(teacher).length > 0;
}

export function teacherMatchesOperationalPreset(
  teacher: TeacherSummary,
  preset: TeacherOperationalPreset,
): boolean {
  if (preset === 'all') return true;
  const codes = new Set(deriveTeacherInterventions(teacher).map((item) => item.code));
  switch (preset) {
    case 'needs_intervention':
      return codes.size > 0;
    case 'no_assignment':
      return codes.has('NO_OPERATIONAL_ASSIGNMENT');
    case 'inactive_account':
      return codes.has('ACCOUNT_INACTIVE_OR_MISSING');
    case 'incomplete_academic_profile':
      return codes.has('ACADEMIC_PROFILE_INCOMPLETE');
    default:
      return true;
  }
}

export function filterTeachersByOperationalPreset(
  teachers: TeacherSummary[],
  preset: TeacherOperationalPreset,
): TeacherSummary[] {
  if (preset === 'all') return teachers;
  return teachers.filter((teacher) => teacherMatchesOperationalPreset(teacher, preset));
}

export type TeacherInterventionCounts = {
  noAssignment: number;
  inactiveAccount: number;
  incompleteAcademic: number;
  needsIntervention: number;
};

/** Counts teachers (not intervention rows). Each teacher counted at most once per bucket. */
export function countTeacherInterventions(
  teachers: TeacherSummary[],
): TeacherInterventionCounts {
  let noAssignment = 0;
  let inactiveAccount = 0;
  let incompleteAcademic = 0;
  let needsIntervention = 0;

  for (const teacher of teachers) {
    const codes = new Set(deriveTeacherInterventions(teacher).map((item) => item.code));
    if (codes.size > 0) needsIntervention += 1;
    if (codes.has('NO_OPERATIONAL_ASSIGNMENT')) noAssignment += 1;
    if (codes.has('ACCOUNT_INACTIVE_OR_MISSING')) inactiveAccount += 1;
    if (codes.has('ACADEMIC_PROFILE_INCOMPLETE')) incompleteAcademic += 1;
  }

  return { noAssignment, inactiveAccount, incompleteAcademic, needsIntervention };
}

export function interventionTitleKey(code: TeacherInterventionCode): string {
  switch (code) {
    case 'NO_OPERATIONAL_ASSIGNMENT':
      return 'admin.teacherDomain.interventions.noAssignment';
    case 'ACCOUNT_INACTIVE_OR_MISSING':
      return 'admin.teacherDomain.interventions.inactiveAccount';
    case 'ACADEMIC_PROFILE_INCOMPLETE':
      return 'admin.teacherDomain.interventions.incompleteAcademic';
    case 'HAS_ROW_WARNINGS':
      return 'admin.teacherDomain.interventions.rowWarnings';
    default:
      return 'admin.teacherDomain.interventions.rowWarnings';
  }
}

export function interventionActionKey(code: TeacherInterventionCode): string {
  switch (code) {
    case 'NO_OPERATIONAL_ASSIGNMENT':
      return 'admin.teacherDomain.interventions.actions.openAssignments';
    case 'ACCOUNT_INACTIVE_OR_MISSING':
      return 'admin.teacherDomain.interventions.actions.setupAccount';
    case 'ACADEMIC_PROFILE_INCOMPLETE':
      return 'admin.teacherDomain.interventions.actions.completeProfile';
    case 'HAS_ROW_WARNINGS':
      return 'admin.teacherDomain.interventions.actions.viewDetails';
    default:
      return 'admin.teacherDomain.interventions.actions.viewDetails';
  }
}

export function interventionPriorityLabelKey(priority: TeacherInterventionPriority): string {
  return `admin.teacherDomain.interventions.priority.${priority}`;
}

export function presetFromSummaryCard(
  card: 'total' | 'no_assignment' | 'inactive_account' | 'incomplete_academic' | 'needs_intervention',
): TeacherOperationalPreset {
  switch (card) {
    case 'total':
      return 'all';
    case 'no_assignment':
      return 'no_assignment';
    case 'inactive_account':
      return 'inactive_account';
    case 'incomplete_academic':
      return 'incomplete_academic_profile';
    case 'needs_intervention':
      return 'needs_intervention';
    default:
      return 'all';
  }
}
