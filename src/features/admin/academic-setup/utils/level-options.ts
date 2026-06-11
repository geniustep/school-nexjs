import type {
  EnableLevelResult,
  EnableLevelsResponse,
  EnableLevelsSummary,
  LevelCycleOption,
  ReferenceLevelOption,
} from '@/types/academic-levels';

export type LevelFilterMode = 'all' | 'available' | 'enabled';

export interface GroupedReferenceLevels {
  cycle: LevelCycleOption;
  levels: ReferenceLevelOption[];
}

export function sortCycles(cycles: LevelCycleOption[]): LevelCycleOption[] {
  return [...cycles].sort(
    (a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code),
  );
}

export function sortReferenceLevels(levels: ReferenceLevelOption[]): ReferenceLevelOption[] {
  return [...levels].sort(
    (a, b) =>
      a.cycle.sequence - b.cycle.sequence ||
      a.sequence - b.sequence ||
      a.code.localeCompare(b.code),
  );
}

export function groupReferenceLevelsByCycle(
  levels: ReferenceLevelOption[],
  cycles: LevelCycleOption[],
): GroupedReferenceLevels[] {
  const sorted = sortReferenceLevels(levels);
  const cycleOrder = sortCycles(cycles);
  const cycleMap = new Map<number, ReferenceLevelOption[]>();

  for (const level of sorted) {
    const list = cycleMap.get(level.cycle.id) ?? [];
    list.push(level);
    cycleMap.set(level.cycle.id, list);
  }

  const seen = new Set<number>();
  const groups: GroupedReferenceLevels[] = [];

  for (const cycle of cycleOrder) {
    const list = cycleMap.get(cycle.id);
    if (list?.length) {
      groups.push({ cycle, levels: list });
      seen.add(cycle.id);
    }
  }

  for (const [cycleId, list] of cycleMap) {
    if (seen.has(cycleId)) continue;
    groups.push({ cycle: list[0]!.cycle, levels: list });
  }

  return groups;
}

export function filterReferenceLevels(
  levels: ReferenceLevelOption[],
  {
    search = '',
    cycleId = null,
    mode = 'all',
  }: {
    search?: string;
    cycleId?: number | null;
    mode?: LevelFilterMode;
  },
): ReferenceLevelOption[] {
  const q = search.trim().toLowerCase();
  return levels.filter((level) => {
    if (cycleId != null && level.cycle.id !== cycleId) return false;
    if (mode === 'available' && level.enabled) return false;
    if (mode === 'enabled' && !level.enabled) return false;
    if (!q) return true;
    const haystack = [
      level.name,
      level.display_name,
      level.moroccan_display_alias ?? '',
      level.code,
      level.cycle.name,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function isReferenceLevelSelectable(level: ReferenceLevelOption): boolean {
  return !level.enabled && level.can_enable && level.active;
}

export function buildEnablePayload(selectedIds: Iterable<number>, levels: ReferenceLevelOption[]): number[] {
  const enabledIds = new Set(
    levels.filter((l) => l.enabled).map((l) => l.id),
  );
  return [...selectedIds].filter((id) => {
    const level = levels.find((l) => l.id === id);
    return level ? isReferenceLevelSelectable(level) && !enabledIds.has(id) : false;
  });
}

export function parseEnableLevelsResponse(data: EnableLevelsResponse | null | undefined): {
  results: EnableLevelResult[];
  summary: EnableLevelsSummary;
} {
  const results = data?.results ?? [];
  const summary = data?.summary ?? {
    requested: results.length,
    enabled: 0,
    already_enabled: 0,
    failed: 0,
  };
  return { results, summary };
}

export type EnableOutcome = {
  fullSuccess: boolean;
  partialSuccess: boolean;
  enabledCount: number;
  alreadyEnabledCount: number;
  failedCount: number;
  failedIds: number[];
  newSchoolLevelIds: number[];
  errorsByRefId: Map<number, string>;
};

export function aggregateEnableResults(results: EnableLevelResult[]): EnableOutcome {
  let enabledCount = 0;
  let alreadyEnabledCount = 0;
  let failedCount = 0;
  const failedIds: number[] = [];
  const newSchoolLevelIds: number[] = [];
  const errorsByRefId = new Map<number, string>();

  for (const r of results) {
    if (r.status === 'enabled') {
      enabledCount += 1;
      if (r.school_level?.id) newSchoolLevelIds.push(r.school_level.id);
    } else if (r.status === 'already_enabled') {
      alreadyEnabledCount += 1;
    } else {
      failedCount += 1;
      failedIds.push(r.reference_level_id);
      if (r.error?.message || r.error?.code) {
        errorsByRefId.set(
          r.reference_level_id,
          r.error.message || r.error.code,
        );
      }
    }
  }

  const fullSuccess = failedCount === 0 && (enabledCount > 0 || alreadyEnabledCount > 0);
  const partialSuccess = enabledCount > 0 && failedCount > 0;

  return {
    fullSuccess,
    partialSuccess,
    enabledCount,
    alreadyEnabledCount,
    failedCount,
    failedIds,
    newSchoolLevelIds,
    errorsByRefId,
  };
}

export function selectableIdsInCycle(
  levels: ReferenceLevelOption[],
  cycleId: number,
): number[] {
  return levels
    .filter((l) => l.cycle.id === cycleId && isReferenceLevelSelectable(l))
    .map((l) => l.id);
}

export function referenceLevelSubtitle(level: ReferenceLevelOption): string {
  const parts = [level.code];
  const alias = level.moroccan_display_alias?.trim();
  const display = level.display_name?.trim();
  if (alias && alias !== level.name) parts.push(alias);
  else if (display && display !== level.name && display !== level.code) parts.push(display);
  return parts.join(' · ');
}
