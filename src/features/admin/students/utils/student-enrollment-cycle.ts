import { normalizeLevelCode } from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import type { LevelCycleOption, ReferenceLevelOption } from '@/types/academic-levels';
import type { StudentLevelOption } from '@/types/student-360';

/**
 * Cycles come from GET /admin/levels/options (`cycles`).
 * School levels from students/options are matched to reference levels by `code`
 * to resolve cycle_id. Explicit code mapping runs before any prefix fallback.
 */

/** Moroccan school codes (nibras / MEN) and reference codes — checked before loose prefix rules. */
const PRESCHOOL_LEVEL_CODES = new Set(['PS', 'MS', 'GS', 'PRE1', 'PRE2', 'PRE3']);
const HIGH_SCHOOL_LEVEL_CODES = new Set(['TC', '1BAC', '2BAC', 'H_TC', 'H1', 'H2']);
const PRIMARY_AEP_PATTERN = /^[1-6]AEP$/;
const MIDDLE_ASC_PATTERN = /^[1-3]ASC$/;
const REFERENCE_PRIMARY_PATTERN = /^P[1-6]$/;
const REFERENCE_MIDDLE_PATTERN = /^M[1-3]$/;

export function buildReferenceLevelCycleMap(
  referenceLevels: ReferenceLevelOption[],
): Map<string, LevelCycleOption> {
  const map = new Map<string, LevelCycleOption>();
  for (const ref of referenceLevels) {
    const code = normalizeLevelCode(ref.code);
    if (code && ref.cycle) {
      map.set(code, ref.cycle);
    }
  }
  return map;
}

export function inferCycleCodeFromLevelCode(levelCode: string): string | null {
  const code = normalizeLevelCode(levelCode);
  if (!code) return null;
  if (PRESCHOOL_LEVEL_CODES.has(code)) return 'preschool';
  if (PRIMARY_AEP_PATTERN.test(code)) return 'primary';
  if (MIDDLE_ASC_PATTERN.test(code)) return 'middle_school';
  if (HIGH_SCHOOL_LEVEL_CODES.has(code)) return 'high_school';
  if (REFERENCE_PRIMARY_PATTERN.test(code)) return 'primary';
  if (REFERENCE_MIDDLE_PATTERN.test(code)) return 'middle_school';
  if (code.startsWith('PRE')) return 'preschool';
  return null;
}

export function resolveStudentLevelCycleId(
  level: StudentLevelOption,
  cycleByCode: Map<string, LevelCycleOption>,
  cycles: LevelCycleOption[],
): number | null {
  const code = normalizeLevelCode(level.code);
  const fromRef = code ? cycleByCode.get(code) : undefined;
  if (fromRef) return fromRef.id;

  const inferredCode = inferCycleCodeFromLevelCode(code);
  if (!inferredCode) return null;
  return cycles.find((cycle) => cycle.code === inferredCode)?.id ?? null;
}

export function filterLevelsByCycleId(
  levels: StudentLevelOption[],
  cycleId: string,
  referenceLevels: ReferenceLevelOption[],
  cycles: LevelCycleOption[],
): StudentLevelOption[] {
  if (!cycleId.trim()) return [];
  const target = Number(cycleId);
  if (!Number.isFinite(target)) return [];

  const cycleByCode = buildReferenceLevelCycleMap(referenceLevels);
  return levels.filter(
    (level) => resolveStudentLevelCycleId(level, cycleByCode, cycles) === target,
  );
}

export function buildEnrollmentCycleOptions(
  levels: StudentLevelOption[],
  referenceLevels: ReferenceLevelOption[],
  cycles: LevelCycleOption[],
): LevelCycleOption[] {
  const cycleByCode = buildReferenceLevelCycleMap(referenceLevels);
  const present = new Set<number>();
  for (const level of levels) {
    const cycleId = resolveStudentLevelCycleId(level, cycleByCode, cycles);
    if (cycleId != null) present.add(cycleId);
  }
  return cycles
    .filter((cycle) => present.has(cycle.id))
    .sort((a, b) => a.sequence - b.sequence || a.name.localeCompare(b.name));
}

export function levelBelongsToCycle(
  levelId: string,
  cycleId: string,
  levels: StudentLevelOption[],
  referenceLevels: ReferenceLevelOption[],
  cycles: LevelCycleOption[],
): boolean {
  if (!levelId || !cycleId) return false;
  const level = levels.find((item) => String(item.id) === levelId);
  if (!level) return false;
  const cycleByCode = buildReferenceLevelCycleMap(referenceLevels);
  return resolveStudentLevelCycleId(level, cycleByCode, cycles) === Number(cycleId);
}
