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
  id:number; staff_relationship_id:number|null; n¶»§q«^