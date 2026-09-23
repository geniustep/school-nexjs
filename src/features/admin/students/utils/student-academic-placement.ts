import {
  canManageStudentsFull,
  hasUserCapability,
} from '@/lib/permissions/academic-capabilities';
import type { CurrentUser } from '@/types/user';
import type {
  AcademicLevelOption,
  StudentEnrollment,
  StudentLevelOption,
} from '@/types/student-360';

const CYCLE_ORDER = ['preschool', 'primary', 'middle_school', 'high_school'] as const;

export function academicPlacementCycleCode(
  level: AcademicLevelOption | null | undefined,
): string {
  return level?.cycle?.code?.trim() ?? '';
}

export function buildAcademicPlacementCycles(levels: StudentLevelOption[]): string[] {
  const present = new Set<string>();
  for (const level of levels) {
    const code = academicPlacementCycleCode(level);
    if (code) present.add(code);
  }

  const rank = new Map<string, number>(CYCLE_ORDER.map((code, index) => [code, index]));
  return [...present].sort((a, b) => {
    const aRank = rank.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bRank = rank.get(b) ?? Number.MAX_SAFE_INTEGER;
    return aRank - bRank || a.localeCompare(b);
  });
}

export function filterAcademicPlacementLevels(
  levels: StudentLevelOption[],
  cycleCode: string,
): StudentLevelOption[] {
  const target = cycleCode.trim();
  if (!target) return [];
  return levels.filter((level) => academicPlacementCycleCode(level) === target);
}

export function levelBelongsToAcademicPlacementCycle(
  levelId: string,
  cycleCode: string,
  levels: StudentLevelOption[],
): boolean {
  if (!levelId.trim() || !cycleCode.trim()) return false;
  const level = levels.find((item) => String(item.id) === levelId.trim());
  return academicPlacementCycleCode(level) === cycleCode.trim();
}

export function academicPlacementWillUnassign(
  enrollment: StudentEnrollment | null | undefined,
  targetLevelId: string | number,
): boolean {
  if (!enrollment?.class) return false;
  const target = Number(targetLevelId);
  if (!Number.isFinite(target) || target <= 0) return false;
  const current = enrollment.level?.id;
  if (current == null) return true;
  return current !== target;
}

export function canManageStudentAcademicPlacement(
  user: CurrentUser | null | undefined,
): boolean {
  if (canManageStudentsFull(user)) return true;
  return (
    hasUserCapability(user, 'students.update_limited') &&
    hasUserCapability(user, 'students.manage_registration_data')
  );
}

function financeReviewReasons(details: unknown): string[] {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return [];
  const raw = (details as Record<string, unknown>).finance_review_reasons;
  if (!Array.isArray(raw)) return [];
  return raw.filter((reason): reason is string => typeof reason === 'string');
}

export function academicPlacementErrorMessageKey(
  code: string | null | undefined,
  details?: unknown,
): string {
  switch (code) {
    case 'finance_review_required':
      if (financeReviewReasons(details).includes('target_level_not_covered_by_fee_plan')) {
        return 'admin.student360.editPage.academicPlacement.errors.targetLevelNotCoveredByFeePlan';
      }
      return 'admin.student360.editPage.academicPlacement.errors.financeReviewRequired';
    case 'registration_data_permission_required':
    case 'permission_denied':
    case 'forbidden':
      return 'admin.student360.editPage.academicPlacement.errors.permissionDenied';
    case 'no_active_enrollment':
      return 'admin.student360.editPage.academicPlacement.errors.noActiveEnrollment';
    case 'level_not_found':
    case 'level_school_mismatch':
    case 'level_out_of_admin_scope':
    case 'academic_context_constraint':
      return 'admin.student360.editPage.academicPlacement.errors.levelInvalid';
    case 'level_id_required':
    case 'validation_error':
      return 'admin.student360.editPage.academicPlacement.errors.validation';
    case 'class_unassign_failed':
      return 'admin.student360.editPage.academicPlacement.errors.classUnassignFailed';
    default:
      return 'admin.student360.editPage.academicPlacement.errors.generic';
  }
}
