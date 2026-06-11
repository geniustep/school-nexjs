import type { ReferenceLevelLinkStatus, ReferenceLevelOption } from '@/types/academic-levels';

export type LevelLinkStatus = ReferenceLevelLinkStatus;

export interface ResolvedReferenceLevelState {
  linkStatus: LevelLinkStatus;
  schoolLevelId: number | null;
  canLink: boolean;
  canEnable: boolean;
  canSelect: boolean;
}

/** Backend-only — uses fields from GET /admin/levels/options. */
export function resolveReferenceLevelState(level: ReferenceLevelOption): ResolvedReferenceLevelState {
  const linkStatus: LevelLinkStatus =
    level.link_status ?? (level.enabled ? 'enabled' : 'not_enabled');

  const canLink =
    linkStatus === 'legacy_unlinked' &&
    level.can_link === true &&
    level.school_level_id != null;

  const canEnable = linkStatus === 'not_enabled' && level.can_enable && level.active;
  const canSelect = canEnable;

  return {
    linkStatus,
    schoolLevelId: level.school_level_id ?? null,
    canLink,
    canEnable,
    canSelect,
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
