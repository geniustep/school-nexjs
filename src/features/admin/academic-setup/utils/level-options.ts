import type {
  EnableLevelResult,
  EnableLevelsRequest,
  EnableLevelsResponse,
  EnableLevelsSummary,
  EnabledTrackResult,
  FirstClassResult,
  LevelCycleOption,
  ReferenceLevelOption,
  ReferenceTrackOption,
  TrackFirstClassResult,
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

export function sortReferenceTracks(tracks: ReferenceTrackOption[]): ReferenceTrackOption[] {
  return [...tracks].sort(
    (a, b) => a.sequence - b.sequence || a.code.localeCompare(b.code),
  );
}

export function selectableReferenceTracks(level: ReferenceLevelOption): ReferenceTrackOption[] {
  return sortReferenceTracks(level.reference_tracks ?? []);
}

export function selectableTrackIdsForLevel(level: ReferenceLevelOption): number[] {
  return selectableReferenceTracks(level)
    .filter((track) => track.can_enable && !track.enabled)
    .map((track) => track.id);
}

export function countSelectedTracks(
  level: ReferenceLevelOption,
  trackSelections: Map<number, Set<number>>,
): { selected: number; total: number } {
  const selectable = selectableTrackIdsForLevel(level);
  const selected = [...(trackSelections.get(level.id) ?? [])].filter((id) =>
    selectable.includes(id),
  ).length;
  return { selected, total: selectable.length };
}

export function selectedLevelsIncludeTracks(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
): boolean {
  return [...selectedIds].some((id) => {
    const level = levels.find((l) => l.id === id);
    return Boolean(level?.supports_tracks);
  });
}

export function selectedLevelsIncludeNormal(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
): boolean {
  return [...selectedIds].some((id) => {
    const level = levels.find((l) => l.id === id);
    return level ? !level.supports_tracks : false;
  });
}

export function validateTrackSelections(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
): { valid: boolean; invalidLevelIds: number[] } {
  const invalidLevelIds: number[] = [];
  for (const id of selectedIds) {
    const level = levels.find((l) => l.id === id);
    if (!level?.supports_tracks || !isReferenceLevelSelectable(level)) continue;
    const selected = [...(trackSelections.get(id) ?? [])].filter((trackId) =>
      selectableTrackIdsForLevel(level).includes(trackId),
    );
    if (selected.length === 0) invalidLevelIds.push(id);
  }
  return { valid: invalidLevelIds.length === 0, invalidLevelIds };
}

export function buildEnableLevelsWithTracksPayload(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
  options: { createFirstClass: boolean; createFirstClassPerTrack: boolean },
): EnableLevelsRequest {
  const reference_level_ids = buildEnablePayload(selectedIds, levels);
  let hasNormalLevels = false;
  let hasTrackSelections = false;
  const track_selections: Record<string, number[]> = {};

  for (const id of reference_level_ids) {
    const level = levels.find((l) => l.id === id);
    if (!level) continue;
    if (level.supports_tracks) {
      const selected = [...(trackSelections.get(id) ?? [])].filter((trackId) =>
        selectableTrackIdsForLevel(level).includes(trackId),
      );
      if (selected.length > 0) {
        hasTrackSelections = true;
        track_selections[String(id)] = selected;
      }
    } else {
      hasNormalLevels = true;
    }
  }

  return {
    reference_level_ids,
    create_first_class: hasNormalLevels && options.createFirstClass,
    enable_reference_tracks: hasTrackSelections,
    create_first_class_per_track: hasTrackSelections && options.createFirstClassPerTrack,
    track_selections,
  };
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

    const firstClasses: Array<TrackFirstClassResult | FirstClassResult | undefined> = [
      r.first_class,
      ...(r.tracks ?? []).map((track) => track.first_class),
    ];
    for (const fc of firstClasses) {
      if (fc?.status === 'created') classes_created += 1;
      else if (fc?.status === 'already_exists') classes_already_exist += 1;
      else if (fc?.status === 'skipped') classes_skipped += 1;
      else if (fc?.status === 'failed') classes_failed += 1;
    }
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
  tracksEnabled: number;
  tracksFailed: number;
  errorsByRefId: Map<number, string>;
};

type EnableAggregateCounters = {
  classesCreated: number;
  classesAlreadyExist: number;
  classesSkipped: number;
  classesFailed: number;
  firstClassFailedCount: number;
  tracksEnabled: number;
  tracksFailed: number;
};

function accumulateFirstClassCounts(
  fc: TrackFirstClassResult | FirstClassResult | undefined,
  counters: EnableAggregateCounters,
): void {
  if (fc?.status === 'created') counters.classesCreated += 1;
  else if (fc?.status === 'already_exists') counters.classesAlreadyExist += 1;
  else if (fc?.status === 'skipped') counters.classesSkipped += 1;
  else if (fc?.status === 'failed') {
    counters.classesFailed += 1;
    counters.firstClassFailedCount += 1;
  }
}

function accumulateTrackResults(
  tracks: EnabledTrackResult[] | undefined,
  counters: EnableAggregateCounters,
): void {
  for (const track of tracks ?? []) {
    if (track.status === 'failed') counters.tracksFailed += 1;
    else if (
      track.status === 'enabled' ||
      track.status === 'already_enabled' ||
      track.status === 'reactivated'
    ) {
      counters.tracksEnabled += 1;
    }
    accumulateFirstClassCounts(track.first_class, counters);
  }
}

export function aggregateEnableResults(results: EnableLevelResult[]): EnableOutcome {
  let enabledCount = 0;
  let alreadyEnabledCount = 0;
  let failedCount = 0;
  const counters: EnableAggregateCounters = {
    classesCreated: 0,
    classesAlreadyExist: 0,
    classesSkipped: 0,
    classesFailed: 0,
    firstClassFailedCount: 0,
    tracksEnabled: 0,
    tracksFailed: 0,
  };
  const failedIds: number[] = [];
  const newSchoolLevelIds: number[] = [];
  const errorsByRefId = new Map<number, string>();

  for (const r of results) {
    if (r.status === 'enabled' || r.status === 'linked_existing') {
      enabledCount += 1;
      const sid = resolveSchoolLevelId(r);
      if (sid) newSchoolLevelIds.push(sid);
      accumulateFirstClassCounts(r.first_class, counters);
      accumulateTrackResults(r.tracks, counters);
    } else if (r.status === 'already_enabled') {
      alreadyEnabledCount += 1;
      accumulateFirstClassCounts(r.first_class, counters);
      accumulateTrackResults(r.tracks, counters);
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
    counters.tracksFailed === 0 &&
    counters.classesFailed === 0 &&
    (enabledCount > 0 || alreadyEnabledCount > 0);
  const partialSuccess =
    (enabledCount > 0 && failedCount > 0) ||
    (enabledCount > 0 && counters.classesFailed > 0) ||
    (enabledCount > 0 && counters.tracksFailed > 0);

  return {
    fullSuccess,
    partialSuccess,
    enabledCount,
    alreadyEnabledCount,
    failedCount,
    failedIds,
    newSchoolLevelIds,
    classesCreated: counters.classesCreated,
    classesAlreadyExist: counters.classesAlreadyExist,
    classesSkipped: counters.classesSkipped,
    classesFailed: counters.classesFailed,
    firstClassFailedCount: counters.firstClassFailedCount,
    tracksEnabled: counters.tracksEnabled,
    tracksFailed: counters.tracksFailed,
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
  track_not_selected: 'admin.academicSetup.guided.selectAtLeastOneTrack',
  level_does_not_support_tracks: 'admin.academicSetup.errors.levelNoTracks',
  reference_track_mismatch: 'admin.academicSetup.errors.referenceTrackMismatch',
  track_already_enabled: 'admin.academicSetup.guided.trackAlreadyEnabled',
  class_already_exists: 'admin.academicSetup.guided.trackClassAlreadyExists',
  academic_context_missing: 'admin.academicSetup.errors.academicContextMissing',
  class_creation_failed: 'admin.academicSetup.errors.classCreationFailed',
  track_classes_created: 'admin.academicSetup.guided.trackClassCreated',
};

const TRACK_STATUS_MESSAGE_KEYS: Record<EnabledTrackResult['status'], string> = {
  enabled: 'admin.academicSetup.guided.trackEnabled',
  already_enabled: 'admin.academicSetup.guided.trackAlreadyEnabled',
  reactivated: 'admin.academicSetup.guided.trackReactivated',
  skipped: 'admin.academicSetup.guided.trackSkipped',
  failed: 'admin.academicSetup.guided.trackFailed',
};

const TRACK_FIRST_CLASS_MESSAGE_KEYS: Record<FirstClassResult['status'], string> = {
  created: 'admin.academicSetup.guided.trackClassCreated',
  already_exists: 'admin.academicSetup.guided.trackClassAlreadyExists',
  skipped: 'admin.academicSetup.guided.firstClassSkipped',
  failed: 'admin.academicSetup.guided.trackClassFailed',
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

export type EnableOutcomeTrackLine = {
  referenceTrackId: number;
  trackName: string;
  status: EnabledTrackResult['status'];
  messageKey: string;
  messageVars?: Record<string, string | number>;
  firstClassMessageKey?: string;
  firstClassMessageVars?: Record<string, string | number>;
  canCreateClass?: boolean;
  schoolLevelId?: number | null;
  schoolTrackId?: number | null;
};

export type EnableOutcomeSection = {
  referenceLevelId: number;
  levelName: string;
  levelMessageKey: string;
  levelMessageVars?: Record<string, string | number>;
  tracks: EnableOutcomeTrackLine[];
  canCreateClass?: boolean;
  schoolLevelId?: number | null;
};

export function resolveTrackDisplayName(
  trackResult: EnabledTrackResult,
  referenceTracks: ReferenceTrackOption[],
): string {
  const ref = referenceTracks.find((track) => track.id === trackResult.reference_track_id);
  return trackResult.school_track?.name ?? ref?.name ?? String(trackResult.reference_track_id);
}

export function mapTrackFirstClassMessage(
  firstClass: TrackFirstClassResult,
): { key: string; vars?: Record<string, string | number> } {
  const reasonKey = firstClass.reason ? mapFirstClassSkippedReason(firstClass.reason) : null;
  if (firstClass.status === 'skipped' && reasonKey) {
    return { key: reasonKey };
  }
  const key = TRACK_FIRST_CLASS_MESSAGE_KEYS[firstClass.status];
  if (firstClass.status === 'created' && firstClass.name) {
    return { key, vars: { className: firstClass.name } };
  }
  return { key };
}

export function buildEnableOutcomeSections(
  results: EnableLevelResult[],
  referenceLevels: ReferenceLevelOption[],
  options: { createFirstClass: boolean; createFirstClassPerTrack: boolean },
): EnableOutcomeSection[] {
  return results.map((result) => {
    const ref = referenceLevels.find((level) => level.id === result.reference_level_id);
    const levelName =
      ref?.name ?? result.school_level?.name ?? result.code ?? String(result.reference_level_id);
    const schoolLevelId = resolveSchoolLevelId(result);
    const referenceTracks = ref?.reference_tracks ?? [];

    let levelMessageKey = 'admin.academicSetup.guided.enableLevelOutcomeLevelAdded';
    let levelMessageVars: Record<string, string | number> | undefined = { level: levelName };
    let canCreateClass = false;

    if (result.status === 'failed') {
      levelMessageKey = 'admin.academicSetup.guided.enableLevelOutcomeLevelFailed';
    } else if (
      options.createFirstClass &&
      !ref?.supports_tracks &&
      result.first_class?.status === 'created' &&
      result.first_class.name
    ) {
      levelMessageKey = 'admin.academicSetup.guided.enableLevelOutcomeCreated';
      levelMessageVars = { level: levelName, className: result.first_class.name };
    } else if (
      options.createFirstClass &&
      !ref?.supports_tracks &&
      result.first_class?.status === 'failed'
    ) {
      levelMessageKey = 'admin.academicSetup.guided.enableLevelOutcomeClassFailed';
      canCreateClass = true;
    } else if (
      options.createFirstClass &&
      !ref?.supports_tracks &&
      result.first_class?.status === 'already_exists'
    ) {
      levelMessageKey = 'admin.academicSetup.guided.enableLevelOutcomeClassExists';
    }

    const tracks: EnableOutcomeTrackLine[] = (result.tracks ?? []).map((trackResult) => {
      const trackName = resolveTrackDisplayName(trackResult, referenceTracks);
      const firstClassMessage = trackResult.first_class
        ? mapTrackFirstClassMessage(trackResult.first_class)
        : undefined;
      const schoolTrackId = trackResult.school_track_id ?? trackResult.school_track?.id ?? null;
      return {
        referenceTrackId: trackResult.reference_track_id,
        trackName,
        status: trackResult.status,
        messageKey: TRACK_STATUS_MESSAGE_KEYS[trackResult.status],
        messageVars: { track: trackName },
        firstClassMessageKey: firstClassMessage?.key,
        firstClassMessageVars: firstClassMessage?.vars,
        canCreateClass:
          options.createFirstClassPerTrack && trackResult.first_class?.status === 'failed',
        schoolLevelId,
        schoolTrackId,
      };
    });

    return {
      referenceLevelId: result.reference_level_id,
      levelName,
      levelMessageKey,
      levelMessageVars,
      tracks,
      canCreateClass,
      schoolLevelId,
    };
  });
}
