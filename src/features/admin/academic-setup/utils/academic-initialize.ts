import type {
  AcademicInitializeRequest,
  AcademicInitializeResponse,
  AcademicInitializeSummary,
  InitializeLevelResult,
} from '@/types/academic-initialize';
import type { ReferenceLevelOption, ReferenceTrackOption } from '@/types/academic-levels';
import { referenceLevelBadgeKey, resolveReferenceLevelState } from './level-link-status';
import {
  groupReferenceLevelsByCycle,
  referenceLevelSubtitle,
  sortReferenceTracks,
  selectableReferenceTracks,
} from './level-options';

export type AutoSetupWizardStep = 'levels' | 'tracks' | 'review' | 'execute' | 'complete';

const QA_LEVEL_CODE = /^(QA|TST|TEST)(_|$)/i;

export function isQaTestLevelCode(code: string): boolean {
  return QA_LEVEL_CODE.test(code.trim());
}

export function filterWizardReferenceLevels(
  levels: ReferenceLevelOption[],
): ReferenceLevelOption[] {
  return levels.filter((level) => level.active && !isQaTestLevelCode(level.code));
}

/** Wizard-only — enabled reference levels are never re-selected for initialize. */
export function isLevelSelectable(level: ReferenceLevelOption): boolean {
  if (!level.active || isQaTestLevelCode(level.code)) return false;
  if (level.enabled) return false;
  const state = resolveReferenceLevelState(level);
  return state.canEnable || level.can_enable;
}

export const isInitializeLevelSelectable = isLevelSelectable;

export function isLevelAlreadyEnabled(level: ReferenceLevelOption): boolean {
  return level.enabled || resolveReferenceLevelState(level).linkStatus === 'enabled';
}

export function enabledLevelNeedsCompletion(level: ReferenceLevelOption): boolean {
  if (!isLevelAlreadyEnabled(level)) return false;
  const status = level.readiness_status?.trim();
  return status === 'needs_classes' || status === 'needs_subjects';
}

export function levelSelectionStatusBadgeKey(level: ReferenceLevelOption): string | null {
  if (enabledLevelNeedsCompletion(level)) {
    return 'admin.academicSetup.autoSetup.statusEnabledNeedsCompletion';
  }
  if (isLevelAlreadyEnabled(level)) {
    return 'admin.academicSetup.autoSetup.statusAlreadyEnabled';
  }
  const badgeKey = referenceLevelBadgeKey(resolveReferenceLevelState(level).linkStatus);
  if (badgeKey === 'admin.academicSetup.guided.statusEnabled') {
    return 'admin.academicSetup.autoSetup.statusAlreadyEnabled';
  }
  return badgeKey;
}

export function selectableInitializeLevelIds(levels: ReferenceLevelOption[]): number[] {
  return filterWizardReferenceLevels(levels)
    .filter(isInitializeLevelSelectable)
    .map((level) => level.id);
}

export function selectedLevelsNeedTrackStep(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
): boolean {
  return [...selectedIds].some((id) => {
    const level = levels.find((l) => l.id === id);
    return Boolean(level?.supports_tracks && (level.reference_tracks?.length ?? 0) > 0);
  });
}

export function trackIdsForInitializePayload(
  level: ReferenceLevelOption,
  trackSelections: Map<number, Set<number>>,
): number[] {
  const tracks = selectableReferenceTracks(level);
  const selected = trackSelections.get(level.id) ?? new Set<number>();
  return tracks
    .filter((track) => track.enabled || selected.has(track.id))
    .map((track) => track.id)
    .sort((a, b) => a - b);
}

export function validateInitializeTrackSelections(
  selectedLevelIds: Iterable<number>,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
): { valid: boolean; invalidLevelIds: number[] } {
  const invalidLevelIds: number[] = [];
  for (const id of selectedLevelIds) {
    const level = levels.find((l) => l.id === id);
    if (!level?.supports_tracks) continue;
    if (trackIdsForInitializePayload(level, trackSelections).length === 0) {
      invalidLevelIds.push(id);
    }
  }
  return { valid: invalidLevelIds.length === 0, invalidLevelIds };
}

export function buildAcademicInitializePayload(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
  options: { createFirstClasses: boolean; enableReferenceSubjects: boolean },
): AcademicInitializeRequest {
  const reference_level_ids = [...selectedIds]
    .filter((id) => {
      const level = levels.find((l) => l.id === id);
      return level ? isInitializeLevelSelectable(level) : false;
    })
    .sort((a, b) => a - b);

  const track_selections: Record<string, number[]> = {};
  for (const id of reference_level_ids) {
    const level = levels.find((l) => l.id === id);
    if (!level?.supports_tracks) continue;
    const selected = trackIdsForInitializePayload(level, trackSelections);
    if (selected.length > 0) {
      track_selections[String(id)] = selected;
    }
  }

  return {
    reference_level_ids,
    track_selections,
    create_first_classes: options.createFirstClasses,
    enable_reference_subjects: options.enableReferenceSubjects,
  };
}

export function buildRetryInitializePayload(
  failedLevelId: number,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
  options: { createFirstClasses: boolean; enableReferenceSubjects: boolean },
): AcademicInitializeRequest {
  return buildAcademicInitializePayload([failedLevelId], levels, trackSelections, options);
}

export interface ReviewLevelPlan {
  referenceLevelId: number;
  levelName: string;
  levelCode: string;
  supportsTracks: boolean;
  alreadyEnabled: boolean;
  createFirstClass: boolean;
  enableSubjects: boolean;
  sharedSubjectsCount: number | null;
  tracks: Array<{
    id: number;
    name: string;
    code: string;
    mappingStatus?: ReferenceTrackOption['mapping_status'];
    trackSpecificCount: number | null;
  }>;
}

export function buildReviewPlans(
  selectedIds: Iterable<number>,
  levels: ReferenceLevelOption[],
  trackSelections: Map<number, Set<number>>,
  options: { createFirstClasses: boolean; enableReferenceSubjects: boolean },
): ReviewLevelPlan[] {
  return [...selectedIds]
    .map((id) => levels.find((l) => l.id === id))
    .filter((level): level is ReferenceLevelOption => Boolean(level))
    .sort(
      (a, b) =>
        a.cycle.sequence - b.cycle.sequence ||
        a.sequence - b.sequence ||
        a.code.localeCompare(b.code),
    )
    .map((level) => {
      const trackIds = trackIdsForInitializePayload(level, trackSelections);
      const tracks = selectableReferenceTracks(level)
        .filter((track) => trackIds.includes(track.id))
        .map((track) => ({
          id: track.id,
          name: track.name,
          code: track.code,
          mappingStatus: track.mapping_status,
          trackSpecificCount:
            track.track_specific_subjects_count ??
            track.track_specific_subjects?.length ??
            null,
        }));

      return {
        referenceLevelId: level.id,
        levelName: level.name,
        levelCode: level.code,
        supportsTracks: level.supports_tracks,
        alreadyEnabled: level.enabled,
        createFirstClass: options.createFirstClasses && (!level.supports_tracks || tracks.length > 0),
        enableSubjects: options.enableReferenceSubjects,
        sharedSubjectsCount: level.shared_subjects_count ?? null,
        tracks,
      };
    });
}

export type InitializeOutcome = {
  fullSuccess: boolean;
  partialSuccess: boolean;
  failedLevelIds: number[];
  hasAnyProgress: boolean;
};

export function aggregateInitializeResults(
  results: InitializeLevelResult[],
  summary?: AcademicInitializeSummary,
): InitializeOutcome {
  const failedLevelIds = results
    .filter((result) => result.status === 'failed')
    .map((result) => result.reference_level_id);
  const hasSuccess = results.some(
    (result) =>
      result.status === 'enabled' ||
      result.status === 'already_enabled' ||
      result.status === 'linked_existing',
  );
  const partialSuccess =
    Boolean(summary?.partial_failure) ||
    (hasSuccess && failedLevelIds.length > 0) ||
    results.some((result) =>
      (result.tracks ?? []).some((track) => track.status === 'failed'),
    );
  const fullSuccess =
    failedLevelIds.length === 0 &&
    results.length > 0 &&
    results.every((result) => result.status !== 'failed');
  return {
    fullSuccess,
    partialSuccess,
    failedLevelIds,
    hasAnyProgress: hasSuccess || results.some((r) => r.status === 'already_enabled'),
  };
}

export function parseInitializeResponse(
  data: AcademicInitializeResponse | null | undefined,
): { results: InitializeLevelResult[]; summary: AcademicInitializeSummary } {
  const results = data?.results ?? [];
  const summary = data?.summary ?? {
    requested: results.length,
    enabled: 0,
    already_enabled: 0,
    failed: 0,
  };
  return { results, summary };
}

export function isIdempotentSuccessStatus(status: string): boolean {
  return status === 'already_enabled' || status === 'already_exists' || status === 'subjects_already_enabled';
}

export function mapTrackMappingPresentation(
  mappingStatus: ReferenceTrackOption['mapping_status'],
): { key: string; tone: 'green' | 'blue' } | null {
  switch (mappingStatus) {
    case 'fully_mapped':
      return { key: 'admin.academicSetup.autoSetup.trackFullyMapped', tone: 'green' };
    case 'level_only_verified':
      return { key: 'admin.academicSetup.autoSetup.trackLevelOnly', tone: 'blue' };
    default:
      return null;
  }
}

export const AUTO_SETUP_WIZARD_STEPS: AutoSetupWizardStep[] = [
  'levels',
  'tracks',
  'review',
  'execute',
  'complete',
];

export function wizardStepsForSelection(): AutoSetupWizardStep[] {
  return AUTO_SETUP_WIZARD_STEPS;
}

export function levelReadinessBadgeKey(level: ReferenceLevelOption): string | null {
  const status = level.readiness_status?.trim();
  if (!status) return null;
  const known = new Set(['ready', 'needs_classes', 'needs_subjects']);
  if (!known.has(status)) return null;
  return `admin.academicSetup.autoSetup.levelReadiness.${status}`;
}

export { groupReferenceLevelsByCycle, referenceLevelSubtitle, sortReferenceTracks };

export const ASSIGNMENTS_CTA_HREF = '/admin/settings/academic-setup/assignments?status=assignment_missing';
export const CLASSES_SUBJECTS_HREF = '/admin/settings/academic-setup/classes';
