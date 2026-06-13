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

export type ReferenceTrackMappingStatus = 'fully_mapped' | 'level_only_verified';

export interface ReferenceTrackSubjectPreview {
  name: string;
  code?: string;
}

export interface ReferenceTrackOption {
  id: number;
  code: string;
  name: string;
  sequence: number;
  enabled: boolean;
  school_track_id: number | null;
  can_enable: boolean;
  mapping_status?: ReferenceTrackMappingStatus;
  track_specific_subjects?: ReferenceTrackSubjectPreview[];
  track_specific_subjects_count?: number;
}

export interface ReferenceLevelOption {
  id: number;
  code: string;
  name: string;
  display_name?: string;
  moroccan_display_alias?: string | null;
  sequence: number;
  active: boolean;
  supports_tracks: boolean;
  reference_tracks?: ReferenceTrackOption[];
  reference_tracks_count?: number;
  shared_subjects_count?: number;
  readiness_status?: string;
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
  features?: import('./academic-initialize').AcademicSetupFeatures;
  setup_capabilities?: string[];
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

export type TrackFirstClassResult = FirstClassResult;

export type EnabledTrackResultStatus =
  | 'enabled'
  | 'already_enabled'
  | 'reactivated'
  | 'skipped'
  | 'failed';

export interface EnabledTrackResult {
  reference_track_id: number;
  status: EnabledTrackResultStatus;
  school_track_id?: number;
  school_track?: {
    id: number;
    name: string;
    code: string;
  };
  first_class?: TrackFirstClassResult;
  reason?: string;
  message?: string;
}

export interface EnableLevelResult {
  reference_level_id: number;
  code?: string;
  status: EnableLevelResultStatus;
  school_level?: EnableLevelSchoolLevel;
  school_level_id?: number;
  first_class?: FirstClassResult;
  tracks?: EnabledTrackResult[];
  error?: {
    code: string;
    message: string;
  };
}

export interface EnableLevelsRequest {
  reference_level_ids: number[];
  create_first_class: boolean;
  enable_reference_tracks: boolean;
  create_first_class_per_track: boolean;
  track_selections: Record<string, number[]>;
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
