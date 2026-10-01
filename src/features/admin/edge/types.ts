import type { ApiErrorBody } from '@/types/api';

export interface EdgeAttendanceSourceDevice {
  id: number; source_device_id: string; vendor: string; name: string; active: boolean;
  edge_device_id?: number | null; persons_count?: number; mapped_count?: number; unmapped_count?: number;
}
export interface EdgeAttendanceStaffRef {
  staff_relationship_id: number; display_name: string; relationship_category?: string | null;
  professional_number?: string | null; state?: string | null; active?: boolean;
}
export interface EdgeAttendanceDevicePerson {
  external_person_id: string; display_label: string | null; device_person_label?: string | null;
  present_on_device: boolean | null; device_user_active?: boolean | null;
  directory_last_observed_at?: string | null; mapping_status: 'mapped' | 'pending_mapping' | 'inactive_mapping';
  mapping_id?: number | null; staff_relationship_id?: number | null; staff?: EdgeAttendanceStaffRef | null;
  pending_event_count?: number; total_event_count?: number; first_event_at?: string | null; last_event_at?: string | null;
  directory_only?: boolean; event_only?: boolean; stale_directory?: boolean;
}
export interface EdgeAttendanceMappingData {
  mapping_id: number; external_person_id: string; staff_relationship_id: number;
  staff?: EdgeAttendanceStaffRef | null; mapping_status: 'mapped';
  reconciled_event_count?: number; remaining_pending_count?: number;
}
export interface EdgeStaffCandidate {
  id:number; name:string; name_ar?:string|null; name_fr?:string|null; role_display_name?:string|null;
  job_title?:string|null; active:boolean; status?:string|null;
}

export type EdgeWeekday = '0' | '1' | '2' | '3' | '4' | '5' | '6';

export interface EdgeSchoolSummary {
  id: number;
  name: string;
  timezone: string;
}

export interface EdgeAudioAssetRef {
  asset_uid: string;
  name: string;
  version: string | null;
}

export interface EdgeBellEvent {
  id: number;
  event_uid: string;
  weekday: EdgeWeekday;
  local_time: string;
  label: string;
  active: boolean;
  priority: number;
  late_tolerance_seconds: number;
  audio_asset: EdgeAudioAssetRef;
}

export interface EdgeBellSchedule {
  id: number;
  name: string;
  code: string;
  active: boolean;
  events: EdgeBellEvent[];
}

export interface EdgeActiveScheduleVersion {
  version_uid: string;
  schedule_id: number;
  timezone: string;
  valid_from: string;
  valid_until: string;
  generated_at: string | null;
  status: string;
}

export interface EdgeBellScheduleData {
  school: EdgeSchoolSummary;
  schedule: EdgeBellSchedule | null;
  active_version: EdgeActiveScheduleVersion | null;
}

export type EdgeAudioCategory =
  | 'entry'
  | 'class_start'
  | 'break'
  | 'return'
  | 'exit'
  | 'general';

export interface EdgeAudioAssetVersion {
  version: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  duration_ms: number;
  sha256: string;
}

export interface EdgeAudioAsset {
  asset_uid: string;
  name: string;
  category: EdgeAudioCategory;
  source: 'school' | 'raqeem_library';
  library_source_uid: string | null;
  active: boolean;
  current_version: EdgeAudioAssetVersion | null;
}

export interface EdgeAudioAssetsData {
  assets: EdgeAudioAsset[];
}

export interface EdgeAudioLibraryAsset {
  library_uid: string;
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  category: EdgeAudioCategory;
  active: boolean;
  current_version: EdgeAudioAssetVersion | null;
}

export interface EdgeAudioLibraryData {
  assets: EdgeAudioLibraryAsset[];
}

export interface EdgeAudioAssetMutationData {
  asset: EdgeAudioAsset;
  adopted?: boolean;
}

export interface EdgeDevice {
  device_uid: string;
  name: string;
  hostname: string;
  platform: string;
  agent_version: string;
  active: boolean;
  revoked_at: string | null;
  last_seen_at: string | null;
}

export interface EdgeDevicesData {
  devices: EdgeDevice[];
}

export interface EdgePairingGrantData {
  pairing_code: string;
  expires_at: string;
  contract_version: string;
}

export interface EdgePairingHandoffData extends EdgePairingGrantData {
  cloud_base_url: string;
}

export type EdgeOnboardingState =
  | 'idle'
  | 'creating_grant'
  | 'contacting_agent'
  | 'waiting_for_device'
  | 'connected'
  | 'agent_unreachable'
  | 'expired'
  | 'error';

export interface EdgeBellEventPutInput {
  id: number | null;
  weekday: EdgeWeekday;
  local_time: string;
  label: string;
  audio_asset_uid: string;
  active: boolean;
}

export interface EdgeBellSchedulePutInput {
  schedule_id: number | null;
  name: string;
  range_start: string;
  range_end: string;
  events: EdgeBellEventPutInput[];
}

export interface BellEventDraft extends EdgeBellEventPutInput {
  client_key: string;
}

export interface BellScheduleDraft {
  schedule_id: number | null;
  name: string;
  range_start: string;
  range_end: string;
  events: BellEventDraft[];
}

export type BellValidationCode =
  | 'name_required'
  | 'range_required'
  | 'range_order'
  | 'time_required'
  | 'time_invalid'
  | 'audio_required'
  | 'duplicate_time';

export interface BellScheduleValidation {
  valid: boolean;
  form?: BellValidationCode;
  rows: Record<string, BellValidationCode>;
  days: Partial<Record<EdgeWeekday, BellValidationCode>>;
}

export type EdgePageLoadState =
  | { status: 'loading' }
  | { status: 'error'; error: ApiErrorBody }
  | { status: 'ready' };
