// Reference level activation — School API v1 admin/levels/options + enable.

export interface LevelCycleOption {
  id: number;
  code: string;
  name: string;
  sequence: number;
}

export type ReferenceLevelLinkStatus =
  | 'not_enabled'
  | 'enabled'
  | 'legacy_unlinked'
  | 'legacy_ambiguous';

export interface ReferenceLevelOption {
  id: number;
  code: string;
  name: string;
  display_name: string;
  moroccan_display_alias?: string | null;
  sequence: number;
  active: boolean;
  supports_tracks: boolean;
  cycle: LevelCycleOption;
  enabled: boolean;
  school_level_id?: number | null;
  can_enable: boolean;
  link_status?: ReferenceLevelLinkStatus;
  can_link?: boolean;
}

export interface LevelOptionsPermissions {
  can_enable: boolean;
}

export interface LevelOptionsPayload {
  reference_levels: ReferenceLevelOption[];
  cycles: LevelCycleOption[];
  permissions: LevelOptionsPermissions;
}

export type EnableLevelResultStatus =
  | 'enabled'
  | 'already_enabled'
  | 'linked_existing'
  | 'failed';

export interface LevelUsage {
  classes: number;
  subjects: number;
  tracks: number;
  students: number;
  assignments: number;
}

export interface LevelLinkResponse {
  action: 'linked_existing';
  item: EnableLevelSchoolLevel & { ref_level_id?: number | null };
}

export type LevelRemovalAction = 'deleted' | 'deactivated' | 'blocked';

export interface LevelRemovalResponse {
  action: LevelRemovalAction;
  id: number;
  reason?: string;
}

export interface EnableLevelSchoolLevel {
  id: number;
  name: string;
  code: string;
  supports_tracks: boolean;
  active?: boolean;
}

export interface EnableLevelResult {
  reference_level_id: number;
  code?: string;
  status: EnableLevelResultStatus;
  school_level?: EnableLevelSchoolLevel;
  error?: {
    code: string;
    message: string;
  };
}

export interface EnableLevelsSummary {
  requested: number;
  enabled: number;
  already_enabled: number;
  failed: number;
}

export interface EnableLevelsResponse {
  results: EnableLevelResult[];
  summary: EnableLevelsSummary;
}
