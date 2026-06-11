// Reference level activation — School API v1 admin/levels/options + enable.

export interface LevelCycleOption {
  id: number;
  code: string;
  name: string;
  sequence: number;
}

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
}

export interface LevelOptionsPermissions {
  can_enable: boolean;
}

export interface LevelOptionsPayload {
  reference_levels: ReferenceLevelOption[];
  cycles: LevelCycleOption[];
  permissions: LevelOptionsPermissions;
}

export type EnableLevelResultStatus = 'enabled' | 'already_enabled' | 'failed';

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
