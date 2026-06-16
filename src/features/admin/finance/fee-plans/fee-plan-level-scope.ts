import { groupReferenceLevelsByCycle } from '@/features/admin/academic-setup/utils/level-options';
import type { LevelCycleOption, LevelOptionsPayload, ReferenceLevelOption } from '@/types/academic-levels';

export interface FeePlanLevelRef {
  id: number;
  school_level_id?: number;
  name: string;
  code?: string;
  sequence?: number;
  cycle?: LevelCycleOption;
}

export interface FeePlanLevelScopeSource {
  level_id?: number | null;
  level_ids?: number[] | null;
  levels?: FeePlanLevelRef[] | null;
  level?: { id?: number; name?: string } | null;
}

export interface FeePlanScopeLevel {
  schoolLevelId: number;
  name: string;
  code: string;
  sequence: number;
}

export interface FeePlanScopeCycleGroup {
  cycle: LevelCycleOption;
  levels: FeePlanScopeLevel[];
}

export type FeePlanCycleCheckState = 'none' | 'all' | 'partial';

export const FEE_PLAN_LEVEL_ERROR_CODES = [
  'invalid_school_level',
  'invalid_school_level_identifier',
  'fee_plan_level_out_of_scope',
  'fee_plan_level_scope_mismatch',
  'fee_plan_level_scope_required',
  'invalid_level_ids',
  'student_level_mismatch',
] as const;

export type FeePlanLevelErrorCode = (typeof FEE_PLAN_LEVEL_ERROR_CODES)[number];

function isPositiveInt(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

/** level_ids first, else [level_id], else ids from levels[], else []. */
export function normalizeFeePlanLevelIds(source: FeePlanLevelScopeSource | null | undefined): number[] {
  if (!source) return [];
  if (Array.isArray(source.level_ids) && source.level_ids.length > 0) {
    return dedupeLevelIds(source.level_ids);
  }
  if (isPositiveInt(source.level_id)) {
    return [Number(source.level_id)];
  }
  if (Array.isArray(source.levels) && source.levels.length > 0) {
    const fromLevels = source.levels
      .map((row) => row.school_level_id ?? row.id)
      .filter(isPositiveInt)
      .map(Number);
    if (fromLevels.length > 0) return dedupeLevelIds(fromLevels);
  }
  return [];
}

export function dedupeLevelIds(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of ids) {
    const id = Number(raw);
    if (!isPositiveInt(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export function buildEnabledFeePlanScopeLevels(
  payload: LevelOptionsPayload | null | undefined,
): FeePlanScopeLevel[] {
  if (!payload) return [];
  const levels = Array.isArray(payload.reference_levels) ? payload.reference_levels : [];
  return levels
    .filter((level) => level.enabled && isPositiveInt(level.school_level_id))
    .map((level) => ({
      schoolLevelId: Number(level.school_level_id),
      name: level.name,
      code: level.code,
      sequence: Number(level.sequence ?? 0),
    }))
    .sort((a, b) => a.sequence - b.sequence);
}

export function buildFeePlanScopeGroups(
  payload: LevelOptionsPayload | null | undefined,
): FeePlanScopeCycleGroup[] {
  if (!payload) return [];
  const enabled = (payload.reference_levels ?? []).filter(
    (level) => level.enabled && isPositiveInt(level.school_level_id),
  ) as ReferenceLevelOption[];
  const grouped = groupReferenceLevelsByCycle(enabled, payload.cycles ?? []);
  return grouped.map((group) => ({
    cycle: group.cycle,
    levels: group.levels.map((level) => ({
      schoolLevelId: Number(level.school_level_id),
      name: level.name,
      code: level.code,
      sequence: Number(level.sequence ?? 0),
    })),
  }));
}

export function allSchoolLevelIdsInGroups(groups: FeePlanScopeCycleGroup[]): number[] {
  const ids: number[] = [];
  for (const group of groups) {
    for (const level of group.levels) {
      ids.push(level.schoolLevelId);
    }
  }
  return ids;
}

export function sortLevelIdsByGroups(levelIds: number[], groups: FeePlanScopeCycleGroup[]): number[] {
  const order = allSchoolLevelIdsInGroups(groups);
  const rank = new Map(order.map((id, index) => [id, index]));
  const selected = dedupeLevelIds(levelIds).filter((id) => rank.has(id));
  return selected.sort((a, b) => (rank.get(a) ?? 0) - (rank.get(b) ?? 0));
}

export function reconcileLevelIdsWithGroups(
  levelIds: number[],
  groups: FeePlanScopeCycleGroup[],
): number[] {
  const allowed = new Set(allSchoolLevelIdsInGroups(groups));
  return sortLevelIdsByGroups(levelIds.filter((id) => allowed.has(id)), groups);
}

export function getCycleCheckState(
  group: FeePlanScopeCycleGroup,
  selectedIds: number[],
): FeePlanCycleCheckState {
  const ids = group.levels.map((l) => l.schoolLevelId);
  if (!ids.length) return 'none';
  const selectedCount = ids.filter((id) => selectedIds.includes(id)).length;
  if (selectedCount === 0) return 'none';
  if (selectedCount === ids.length) return 'all';
  return 'partial';
}

export function toggleCycleSelection(
  group: FeePlanScopeCycleGroup,
  selectedIds: number[],
): number[] {
  const state = getCycleCheckState(group, selectedIds);
  const cycleIds = group.levels.map((l) => l.schoolLevelId);
  if (state === 'all') {
    return selectedIds.filter((id) => !cycleIds.includes(id));
  }
  const merged = new Set(selectedIds);
  for (const id of cycleIds) merged.add(id);
  return Array.from(merged);
}

export function toggleLevelSelection(levelId: number, selectedIds: number[]): number[] {
  if (selectedIds.includes(levelId)) {
    return selectedIds.filter((id) => id !== levelId);
  }
  return [...selectedIds, levelId];
}

export function filterScopeGroupsBySearch(
  groups: FeePlanScopeCycleGroup[],
  search: string,
): FeePlanScopeCycleGroup[] {
  const q = search.trim().toLowerCase();
  if (!q) return groups;
  return groups
    .map((group) => {
      const cycleMatch =
        group.cycle.name.toLowerCase().includes(q) || group.cycle.code.toLowerCase().includes(q);
      const levels = group.levels.filter(
        (level) =>
          cycleMatch ||
          level.name.toLowerCase().includes(q) ||
          level.code.toLowerCase().includes(q),
      );
      return levels.length ? { cycle: group.cycle, levels } : null;
    })
    .filter((group): group is FeePlanScopeCycleGroup => group !== null);
}

export interface FeePlanLevelScopeSummaryLabels {
  selectLevels: string;
  allInCycle: (cycleName: string) => string;
  compact: (cycles: number, count: number) => string;
  noScope: string;
}

export function formatFeePlanLevelScopeSummary(
  groups: FeePlanScopeCycleGroup[],
  selectedIds: number[],
  labels: FeePlanLevelScopeSummaryLabels,
): string {
  if (!selectedIds.length) return labels.selectLevels;

  const selectedSet = new Set(selectedIds);
  const parts: string[] = [];
  let cycleCount = 0;

  for (const group of groups) {
    const groupIds = group.levels.map((l) => l.schoolLevelId);
    const selectedInGroup = groupIds.filter((id) => selectedSet.has(id));
    if (!selectedInGroup.length) continue;
    cycleCount += 1;
    if (selectedInGroup.length === groupIds.length) {
      parts.push(labels.allInCycle(group.cycle.name));
    } else {
      const names = group.levels
        .filter((l) => selectedSet.has(l.schoolLevelId))
        .map((l) => l.name);
      parts.push(`${group.cycle.name}: ${names.join(', ')}`);
    }
  }

  if (!parts.length) return labels.noScope;
  if (parts.length <= 2) return parts.join(' + ');
  return labels.compact(cycleCount, selectedIds.length);
}

export function feePlanLevelScopeSummaryFromPlan(
  plan: FeePlanLevelScopeSource,
  groups: FeePlanScopeCycleGroup[],
  labels: FeePlanLevelScopeSummaryLabels,
): string {
  const ids = normalizeFeePlanLevelIds(plan);
  if (!ids.length) return labels.noScope;

  if (groups.length > 0) {
    return formatFeePlanLevelScopeSummary(groups, ids, labels);
  }

  if (Array.isArray(plan.levels) && plan.levels.length > 0) {
    const byCycle = new Map<string, FeePlanLevelRef[]>();
    for (const level of plan.levels) {
      const cycleName = level.cycle?.name ?? '';
      const list = byCycle.get(cycleName) ?? [];
      list.push(level);
      byCycle.set(cycleName, list);
    }
    const parts: string[] = [];
    for (const [cycleName, levels] of byCycle) {
      const names = levels.map((l) => l.name).join(', ');
      parts.push(cycleName ? `${cycleName}: ${names}` : names);
    }
    if (parts.length <= 2) return parts.join(' + ');
    return labels.compact(parts.length, ids.length);
  }

  if (plan.level?.name) return plan.level.name;
  return labels.compact(1, ids.length);
}

export function resolveFeePlanLevelErrorCode(code: string | undefined): FeePlanLevelErrorCode | null {
  if (!code) return null;
  return (FEE_PLAN_LEVEL_ERROR_CODES as readonly string[]).includes(code)
    ? (code as FeePlanLevelErrorCode)
    : null;
}

export function feePlanLevelErrorMessageKey(code: FeePlanLevelErrorCode): string {
  return `admin.finance.feePlansWorkspace.errors.levelScope.${code}`;
}
