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

export interface StudentDocumentTypeOption {
  id: number;
  code: string;
  name: string;
  is_required?: boolean;
}

export interface StudentDocumentAttachment {
  id: number;
  name: string;
  mimetype?: string | null;
  size?: number | null;
}

export interface StudentDocument {
  id: number;
  document_type: StudentDocumentTypeOption | string | null;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  state: string;
  notes?: string | null;
  attachment: StudentDocumentAttachment | null;
  active?: boolean;
  create_date?: string | null;
  write_date?: string | null;
}

export interface StudentDocumentSummary {
  total: number;
  valid: number;
  expired: number;
  missing_required: number;
}

export interface StudentDocumentCapabilities {
  can_view: boolean;
  can_manage: boolean;
}

export interface StudentDocumentsData {
  items: StudentDocument[];
  summary: StudentDocumentSummary;
  capabilities: StudentDocumentCapabilities;
}

export interface StudentDocumentCreateFields {
  document_type?: string;
  document_type_id?: number;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
}

export interface StudentDocumentUpdatePayload {
  document_type?: string;
  document_type_id?: number;
  document_number?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
  state?: string;
}

export interface StudentHealthProfile {
  student_id?: number;
  blood_type?: string | null;
  allergies?: string | null;
  chronic_conditions?: string | null;
  regular_medications?: string | null;
  special_needs?: string | null;
  health_emergency_instructions?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  insurance_provider?: string | null;
  insurance_number?: string | null;
  insurance_expiry_date?: string | null;
  notes?: string | null;
  has_critical_alert?: boolean;
  write_date?: string | null;
}

export interface StudentHealthCapabilities {
  can_view: boolean;
  can_manage: boolean;
}

export interface StudentHealthData {
  profile: StudentHealthProfile | null;
  capabilities: StudentHealthCapabilities;
}

export interface StudentHealthSummary {
  has_profile: boolean;
  has_critical_alert?: boolean;
}

export interface StudentHealthUpdatePayload {
  blood_type?: string;
  allergies?: string;
  chronic_conditions?: string;
  regular_medications?: string;
  special_needs?: string;
  health_emergency_instructions?: string;
  doctor_name?: string;
  doctor_phone?: string;
  insurance_provider?: string;
  insurance_number?: string;
  insurance_expiry_date?: string;
  notes?: string;
}

export interface StudentOptionsPayload {
  gender?: StudentRefOption[];
  student_status?: StudentRefOption[];
  registration_types?: StudentRefOption[];
  emergency_relationships?: StudentRefOption[];
  document_types?: StudentDocumentTypeOption[];
  document_states?: StudentRefOption[];
  blood_types?: StudentRefOption[];
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
  documentTypes: StudentDocumentTypeOption[];
  documentStates: StudentRefOption[];
  bloodTypes: StudentRefOption[];
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
  can_view_documents?: boolean;
  can_manage_documents?: boolean;
  can_view_health?: boolean;
  can_manage_health?: boolean;
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
  document_summary?: StudentDocumentSummary | null;
  health_summary?: StudentHealthSummary | null;
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
