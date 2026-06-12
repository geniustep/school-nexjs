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
  link_status: ReferenceLevelLinkStatus;
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

export interface LinkedTrack {
  id: number;
  name: string;
  active?: boolean;
}

export interface LevelLinkedItems {
  tracks?: LinkedTrack[];
}

export interface SchoolLevelUsage {
  classes?: number;
  subjects?: number;
  tracks?: number;
  students?: number;
  enrollments?: number;
  assignments?: number;
  timetable_slots?: number;
  exams?: number;
}

export type LinkReferenceAction = 'linked_existing' | 'already_linked';

export type DeleteLevelAction = 'deleted' | 'deactivated';

export interface SchoolLevelItem extends EnableLevelSchoolLevel {
  ref_level_id?: number | null;
  usage?: SchoolLevelUsage;
  can_delete?: boolean;
  can_deactivate?: boolean;
}

export interface LevelLinkResponse {
  action: LinkReferenceAction;
  item: SchoolLevelItem;
}

export interface LevelRemovalResponse {
  action: DeleteLevelAction;
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

export type FirstClassStatus = 'created' | 'already_exists' | 'skipped' | 'failed';

export interface FirstClassResult {
  status: FirstClassStatus;
  id?: number;
  name?: string;
  code?: string;
  reason?: string;
  error_code?: string;
  message?: string;
}

export interface EnableLevelResult {
  reference_level_id: number;
  code?: string;
  status: EnableLevelResultStatus;
  school_level?: EnableLevelSchoolLevel;
  school_level_id?: number;
  first_class?: FirstClassResult;
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
  classes_created?: number;
  classes_already_exist?: number;
  classes_skipped?: number;
  classes_failed?: number;
}

export interface EnableLevelsResponse {
  results: EnableLevelResult[];
  summary: EnableLevelsSummary;
}
