// Student 360 — School API v1 admin/students details, guardians, enrollment.

import type { Ref } from './api';
import type { UserAccountInfo } from './account';
import type { Gender, ParentLink, StudentNameFields, StudentStatus } from './student';

export type RelationshipType =
  | 'father'
  | 'mother'
  | 'legal_guardian'
  | 'grandfather'
  | 'grandmother'
  | 'brother'
  | 'sister'
  | 'uncle'
  | 'aunt'
  | 'other'
  | string;

export type GuardianRelationshipState = 'active' | 'ended' | string;

export interface AcademicLevelOption {
  id: number;
  name: string;
  code?: string | null;
  display_alias?: string | null;
  display_name?: string | null;
}

export interface AcademicClassOption {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
}

export interface StudentSummary extends StudentNameFields {
  id: number;
  code?: string | null;
  school_number?: string | null;
  massar_code?: string | null;
  matricule?: string | null;
  name_ar?: string | null;
  name_latin?: string | null;
  birth_place?: string | null;
  nationality?: StudentNationalityOption | null;
  nationality_id?: number | null;
  image_url?: string | null;
  level?: AcademicLevelOption | null;
  class?: AcademicClassOption | null;
  school?: Ref | null;
  status: StudentStatus | string;
  gender?: Gender | null;
  date_of_birth?: string | null;
  admission_date?: string | null;
  departure_reason?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  zip?: string | null;
  country?: Ref | string | null;
  state?: Ref | string | null;
  emergency_contact_name?: string | null;
  emergency_relationship?: string | null;
  emergency_phone?: string | null;
  emergency_phone_alt?: string | null;
  emergency_notes?: string | null;
  login?: string | null;
  user_id?: number | null;
  account?: UserAccountInfo | null;
  create_date?: string | null;
  write_date?: string | null;
  /** Legacy read-only */
  parents?: ParentLink[];
}

export interface StudentNationalityOption {
  id: number;
  name: string;
  code?: string | null;
}

export interface StudentRefOption {
  value: string;
  label: string;
}

export interface StudentLevelOption extends AcademicLevelOption {
  school_id?: number | null;
  academic_year_id?: number | null;
}

export interface StudentClassOption extends AcademicClassOption {
  level?: AcademicLevelOption | null;
  school_id?: number | null;
  academic_year_id?: number | null;
}

export interface StudentOptionsPayload {
  gender?: StudentRefOption[];
  student_status?: StudentRefOption[];
  registration_types?: StudentRefOption[];
  emergency_relationships?: StudentRefOption[];
  nationalities?: StudentNationalityOption[];
  schools?: { id: number; name: string }[];
  academic_years?: { id: number; name: string; code?: string | null }[];
  levels?: StudentLevelOption[];
  classes?: StudentClassOption[];
}

export interface StudentOptions {
  genders: StudentRefOption[];
  studentStatuses: StudentRefOption[];
  registrationTypes: StudentRefOption[];
  emergencyRelationships: StudentRefOption[];
  nationalities: StudentNationalityOption[];
  schools: { id: number; name: string }[];
  academicYears: { id: number; name: string; code?: string | null }[];
  levels: StudentLevelOption[];
  classes: StudentClassOption[];
}

export interface StudentEnrollmentBlock {
  registration_type?: string | null;
  previous_school?: string | null;
  is_repeating?: boolean;
  actual_join_date?: string | null;
  registration_notes?: string | null;
  departure_reason?: string | null;
}

export interface StudentCreatePayload {
  first_name: string;
  last_name: string;
  name_ar?: string;
  name_latin?: string;
  code?: string;
  school_number?: string;
  massar_code?: string;
  gender?: string;
  date_of_birth?: string;
  birth_place?: string;
  nationality_id?: number;
  status?: string;
  admission_date?: string;
  departure_reason?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  street?: string;
  district?: string;
  city?: string;
  zip?: string;
  emergency_contact_name?: string;
  emergency_relationship?: string;
  emergency_phone?: string;
  emergency_phone_alt?: string;
  emergency_notes?: string;
  class_id?: number;
  enrollment?: StudentEnrollmentBlock;
}

export type StudentUpdatePayload = Partial<StudentCreatePayload>;

export interface StudentCapabilities {
  can_manage: boolean;
  can_manage_guardians: boolean;
  can_view_finance: boolean;
}

export interface StudentEnrollment {
  id: number;
  state: string;
  is_current?: boolean;
  date_start?: string | null;
  date_end?: string | null;
  actual_join_date?: string | null;
  registration_type?: string | null;
  previous_school?: string | null;
  is_repeating?: boolean;
  registration_notes?: string | null;
  departure_reason?: string | null;
  school?: Ref | null;
  academic_year?: Ref | string | null;
  level?: AcademicLevelOption | null;
  class?: AcademicClassOption | null;
  track?: Ref | null;
}

export interface GuardianSummary {
  id: number;
  name: string;
  phone?: string | null;
  secondary_phone?: string | null;
  email?: string | null;
  address?: string | null;
  children_count?: number;
  account?: UserAccountInfo | null;
}

export interface GuardianRelationship {
  relationship_id: number;
  guardian: GuardianSummary;
  relationship_type: RelationshipType;
  is_primary_contact: boolean;
  is_legal_guardian: boolean;
  is_financial_responsible: boolean;
  receives_notifications: boolean;
  is_emergency_contact: boolean;
  is_authorized_pickup: boolean;
  contact_priority?: number | null;
  date_start?: string | null;
  date_end?: string | null;
  state: GuardianRelationshipState;
  active?: boolean;
  notes?: string | null;
}

export interface StudentDetailsData {
  student: StudentSummary;
  current_enrollment: StudentEnrollment | null;
  enrollment_history: StudentEnrollment[];
  guardian_relationships: GuardianRelationship[];
  capabilities: StudentCapabilities;
  /** Legacy flat fields — read only */
  parents?: ParentLink[];
  parent_ids?: number[];
}

export interface GuardianQuickCreatePayload {
  name: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
}

export interface GuardianQuickCreateResponse {
  guardian: GuardianSummary;
}

export interface GuardianDuplicateMatch extends GuardianSummary {
  match_score?: number;
}

export interface GuardianRelationshipCreatePayload {
  guardian_id: number;
  relationship_type: RelationshipType;
  is_primary_contact?: boolean;
  is_legal_guardian?: boolean;
  is_financial_responsible?: boolean;
  receives_notifications?: boolean;
  is_emergency_contact?: boolean;
  is_authorized_pickup?: boolean;
  contact_priority?: number;
  date_start?: string;
  notes?: string;
}

export interface GuardianRelationshipUpdatePayload {
  relationship_type?: RelationshipType;
  is_primary_contact?: boolean;
  is_legal_guardian?: boolean;
  is_financial_responsible?: boolean;
  receives_notifications?: boolean;
  is_emergency_contact?: boolean;
  is_authorized_pickup?: boolean;
  contact_priority?: number;
  date_start?: string;
  notes?: string;
}

export interface GuardianRelationshipEndPayload {
  date_end?: string;
  notes?: string;
}
