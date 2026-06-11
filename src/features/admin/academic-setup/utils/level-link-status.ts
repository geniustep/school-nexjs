import type { ReferenceLevelOption } from '@/types/academic-levels';
import type { Level } from '@/types/class';

export type LevelLinkStatus =
  | 'not_enabled'
  | 'enabled'
  | 'legacy_unlinked'
  | 'legacy_ambiguous';

export interface ResolvedReferenceLevelState {
  linkStatus: LevelLinkStatus;
  schoolLevelId: number | null;
  canLink: boolean;
  canEnable: boolean;
  canSelect: boolean;
}

function normalizeCode(code?: string | null): string {
  return code?.trim().toUpperCase() ?? '';
}

function findUnlinkedSchoolMatches(level: ReferenceLevelOption, schoolLevels: Level[]): Level[] {
  const code = normalizeCode(level.code);
  if (!code) return [];
  return schoolLevels.filter(
    (sl) => normalizeCode(sl.code) === code && (sl.ref_level_id == null || sl.ref_level_id === 0),
  );
}

/** Prefer API link_status; infer legacy rows when backend has not shipped yet. */
export function resolveReferenceLevelState(
  level: ReferenceLevelOption,
  schoolLevels: Level[],
): ResolvedReferenceLevelState {
  if (level.link_status) {
    const linkStatus = level.link_status;
    return {
      linkStatus,
      schoolLevelId: level.school_level_id ?? null,
      canLink: level.can_link ?? linkStatus === 'legacy_unlinked',
      canEnable: level.can_enable && linkStatus === 'not_enabled',
      canSelect: level.can_enable && linkStatus === 'not_enabled',
    };
  }

  if (level.enabled || level.school_level_id) {
    return {
      linkStatus: 'enabled',
      schoolLevelId: level.school_level_id ?? null,
      canLink: false,
      canEnable: false,
      canSelect: false,
    };
  }

  const matches = findUnlinkedSchoolMatches(level, schoolLevels);
  if (matches.length === 1) {
    return {
      linkStatus: 'legacy_unlinked',
      schoolLevelId: matches[0]!.id,
      canLink: true,
      canEnable: false,
      canSelect: false,
    };
  }

  if (matches.length > 1) {
    return {
      linkStatus: 'legacy_ambiguous',
      schoolLevelId: null,
      canLink: false,
      canEnable: false,
      canSelect: false,
    };
  }

  return {
    linkStatus: 'not_enabled',
    schoolLevelId: null,
    canLink: false,
    canEnable: level.can_enable && level.active,
    canSelect: level.can_enable && level.active,
  };
}

export function referenceLevelBadgeKey(linkStatus: LevelLinkStatus): string | null {
  switch (linkStatus) {
    case 'enabled':
      return 'admin.academicSetup.guided.statusEnabled';
    case 'legacy_unlinked':
      return 'admin.academicSetup.guided.statusLegacyUnlinked';
    case 'legacy_ambiguous':
      return 'admin.academicSetup.guided.statusLegacyAmbiguous';
    case 'not_enabled':
      return 'admin.academicSetup.guided.statusNotEnabled';
    default:
      return null;
  }
}
