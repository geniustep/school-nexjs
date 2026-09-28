import type { ApiErrorBody } from '@/types/api';

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
