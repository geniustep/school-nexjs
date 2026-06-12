import type {
  EnableLevelResult,
  EnableLevelsResponse,
  EnableLevelsSummary,
  FirstClassResult,
  LevelCycleOption,
  ReferenceLevelOption,
} from '@/types/academic-levels';
import { resolveReferenceLevelState } from './level-link-status';

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
  return resolveReferenceLevelState(level).canSelect;
}

export function isLegacyUnlinkedLevel(level: ReferenceLevelOption): boolean {
  return resolveReferenceLevelState(level).linkStatus === 'legacy_unlinked';
}

export function buildEnablePayload(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
): number[] {
  return [...selectedIds].filter((id) => {
    const level = levels.find((l) => l.id === id);
    return level ? isReferenceLevelSelectable(level) : false;
  });
}

export function buildEnableSummary(
  results: EnableLevelResult[],
  requested: number,
): EnableLevelsSummary {
  let enabled = 0;
  let already_enabled = 0;
  let failed = 0;
  let classes_created = 0;
  let classes_already_exist = 0;
  let classes_skipped = 0;
  let classes_failed = 0;
  for (const r of results) {
    if (r.status === 'enabled' || r.status === 'linked_existing') enabled += 1;
    else if (r.status === 'already_enabled') already_enabled += 1;
    else failed += 1;

    const fc = r.first_class;
    if (fc?.status === 'created') classes_created += 1;
    else if (fc?.status === 'already_exists') classes_already_exist += 1;
    else if (fc?.status === 'skipped') classes_skipped += 1;
    else if (fc?.status === 'failed') classes_failed += 1;
  }
  return {
    requested,
    enabled,
    already_enabled,
    failed,
    classes_created,
    classes_already_exist,
    classes_skipped,
    classes_failed,
  };
}

export function resolveSchoolLevelId(result: EnableLevelResult): number | null {
  return result.school_level_id ?? result.school_level?.id ?? null;
}

export type EnableFirstClassRow = {
  referenceLevelId: number;
  levelName: string;
  levelStatus: EnableLevelResult['status'];
  schoolLevelId: number | null;
  schoolLevelName: string;
  schoolLevelCode?: string | null;
  firstClass: FirstClassResult | null;
};

export function buildFirstClassRows(
  results: EnableLevelResult[],
  referenceLevels: ReferenceLevelOption[],
): EnableFirstClassRow[] {
  return results
    .filter((r) => r.status === 'enabled' || r.status === 'linked_existing')
    .map((r) => {
      const ref = referenceLevels.find((l) => l.id === r.reference_level_id);
      const schoolLevelId = resolveSchoolLevelId(r);
      return {
        referenceLevelId: r.reference_level_id,
        levelName: ref?.name ?? r.code ?? String(r.reference_level_id),
        levelStatus: r.status,
        schoolLevelId,
        schoolLevelName: r.school_level?.name ?? ref?.name ?? '',
        schoolLevelCode: r.school_level?.code ?? ref?.code ?? null,
        firstClass: r.first_class ?? null,
      };
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
  classesCreated: number;
  classesAlreadyExist: number;
  classesSkipped: number;
  classesFailed: number;
  firstClassFailedCount: number;
  errorsByRefId: Map<number, string>;
};

export function aggregateEnableResults(results: EnableLevelResult[]): EnableOutcome {
  let enabledCount = 0;
  let alreadyEnabledCount = 0;
  let failedCount = 0;
  let classesCreated = 0;
  let classesAlreadyExist = 0;
  let classesSkipped = 0;
  let classesFailed = 0;
  let firstClassFailedCount = 0;
  const failedIds: number[] = [];
  const newSchoolLevelIds: number[] = [];
  const errorsByRefId = new Map<number, string>();

  for (const r of results) {
    if (r.status === 'enabled' || r.status === 'linked_existing') {
      enabledCount += 1;
      const sid = resolveSchoolLevelId(r);
      if (sid) newSchoolLevelIds.push(sid);
      if (r.first_class?.status === 'created') classesCreated += 1;
      else if (r.first_class?.status === 'already_exists') classesAlreadyExist += 1;
      else if (r.first_class?.status === 'skipped') classesSkipped += 1;
      else if (r.first_class?.status === 'failed') {
        classesFailed += 1;
        firstClassFailedCount += 1;
      }
    } else if (r.status === 'already_enabled') {
      alreadyEnabledCount += 1;
      if (r.first_class?.status === 'skipped') classesSkipped += 1;
      else if (r.first_class?.status === 'already_exists') classesAlreadyExist += 1;
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

  const fullSuccess =
    failedCount === 0 &&
    classesFailed === 0 &&
    (enabledCount > 0 || alreadyEnabledCount > 0);
  const partialSuccess =
    (enabledCount > 0 && failedCount > 0) ||
    (enabledCount > 0 && classesFailed > 0);

  return {
    fullSuccess,
    partialSuccess,
    enabledCount,
    alreadyEnabledCount,
    failedCount,
    failedIds,
    newSchoolLevelIds,
    classesCreated,
    classesAlreadyExist,
    classesSkipped,
    classesFailed,
    firstClassFailedCount,
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

export type LevelEnableOutcomeLine = {
  referenceLevelId: number;
  levelLabel: string;
  messageKey: string;
  messageVars?: Record<string, string | number>;
  canCreateClass?: boolean;
  schoolLevelId?: number | null;
};

const SKIPPED_REASON_KEYS: Record<string, string> = {
  level_already_enabled: 'admin.academicSetup.guided.firstClassSkippedAlreadyEnabled',
  create_first_class_disabled: 'admin.academicSetup.guided.firstClassSkippedNoOption',
  option_disabled: 'admin.academicSetup.guided.firstClassSkippedNoOption',
};

export function mapFirstClassSkippedReason(reason?: string): string | null {
  if (!reason?.trim()) return null;
  return SKIPPED_REASON_KEYS[reason.trim()] ?? 'admin.academicSetup.guided.firstClassSkipped';
}

export function buildLevelEnableOutcomeLines(
  results: EnableLevelResult[],
  referenceLevels: ReferenceLevelOption[],
  createFirstClassRequested: boolean,
): LevelEnableOutcomeLine[] {
  return results.map((r) => {
    const ref = referenceLevels.find((l) => l.id === r.reference_level_id);
    const levelLabel = ref?.name ?? r.school_level?.name ?? r.code ?? String(r.reference_level_id);
    const schoolLevelId = resolveSchoolLevelId(r);

    if (r.status === 'failed') {
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: 'admin.academicSetup.guided.enableLevelOutcomeLevelFailed',
        messageVars: { level: levelLabel } as Record<string, string | number>,
      };
    }

    const fc = r.first_class;
    if (
      createFirstClassRequested &&
      fc?.status === 'created' &&
      fc.name
    ) {
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: 'admin.academicSetup.guided.enableLevelOutcomeCreated',
        messageVars: { level: levelLabel, className: fc.name } as Record<string, string | number>,
      };
    }

    if (createFirstClassRequested && fc?.status === 'failed') {
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: 'admin.academicSetup.guided.enableLevelOutcomeClassFailed',
        messageVars: { level: levelLabel } as Record<string, string | number>,
        canCreateClass: true,
        schoolLevelId,
      };
    }

    if (createFirstClassRequested && fc?.status === 'already_exists') {
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: 'admin.academicSetup.guided.enableLevelOutcomeClassExists',
        messageVars: { level: levelLabel } as Record<string, string | number>,
      };
    }

    if (createFirstClassRequested && fc?.status === 'skipped') {
      const reasonKey = mapFirstClassSkippedReason(fc.reason);
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: reasonKey ?? 'admin.academicSetup.guided.enableLevelOutcomeLevelAdded',
        messageVars: { level: levelLabel } as Record<string, string | number>,
      };
    }

    if (r.status === 'enabled' || r.status === 'linked_existing' || r.status === 'already_enabled') {
      return {
        referenceLevelId: r.reference_level_id,
        levelLabel,
        messageKey: 'admin.academicSetup.guided.enableLevelOutcomeLevelAdded',
        messageVars: { level: levelLabel } as Record<string, string | number>,
      };
    }

    return {
      referenceLevelId: r.reference_level_id,
      levelLabel,
      messageKey: 'admin.academicSetup.guided.enableLevelOutcomeLevelFailed',
      messageVars: { level: levelLabel } as Record<string, string | number>,
    };
  });
}
