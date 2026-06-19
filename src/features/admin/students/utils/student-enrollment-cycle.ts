import { normalizeLevelCode } from '@/features/admin/academic-setup/utils/group-and-sort-levels';
import type { LevelCycleOption, ReferenceLevelOption } from '@/types/academic-levels';
import type { StudentLevelOption } from '@/types/student-360';

/**
 * Cycles come from GET /admin/levels/options (`cycles`).
 * School levels from students/options are matched to reference levels by `code`
 * to resolve cycle_id. Prefix inference is a fallback when no reference match exists.
 */

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
  if (code.startsWith('PRE')) return 'preschool';
  if (/^P\d/.test(code) || code === 'P1' || code.startsWith('P')) return 'primary';
  if (code.startsWith('M')) return 'middle_school';
  if (code.startsWith('H')) return 'high_school';
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
