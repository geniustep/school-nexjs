// Student 360 — School API v1 admin/students details, guardians, enrollment.

import type { Ref } from './api';
import type { UserAccountInfo } from './account';
import type { StudentFinanceOverviewSummary } from './student-finance';
import type { Gender, ParentLink, StudentNameFields, StudentStatus } from './student';
import type { SiblingLine } from './sibling-line';

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

/** Guardian portal account fields from Odoo guardian payloads — display-only contract. */
export interface GuardianAccountInfo {
  login?: string | null;
  status?: string | null;
  has_user_account?: boolean;
  can_assign_password?: boolean;
  password_was_set?: boolean;
}

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
  external_reference?: string | null;
  residence_address?: string | null;
  previous_school?: string | null;
  admission_notes?: string | null;
  has_siblings?: boolean | null;
  siblings_levels?: string | null;
  siblings_raw_text?: string | null;
  sibling_count?: number | null;
  siblings_summary?: string | null;
  sibling_lines?: SiblingLine[] | null;
  departure_reason?: string | null;
  notes?: string | null;
  active?: boolean | null;
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

export type HealthAlertLevel = 'none' | 'warning' | 'critical';

export interface CriticalHealthItem {
  key?: string;
  label?: string;
  description?: string;
}

export interface StudentHealthProfile {
  student_id?: number;
  blood_type?: string | null;
  has_allergies?: boolean | null;
  allergies_description?: string | null;
  has_chronic_conditions?: boolean | null;
  chronic_conditions_description?: string | null;
  has_regular_medication?: boolean | null;
  regular_medication_description?: string | null;
  has_special_needs?: boolean | null;
  special_needs_description?: string | null;
  has_emergency_instructions?: boolean | null;
  emergency_instructions?: string | null;
  /** @deprecated Legacy text — use has_allergies + allergies_description */
  allergies?: string | null;
  /** @deprecated Legacy text */
  chronic_conditions?: string | null;
  /** @deprecated Legacy text */
  regular_medications?: string | null;
  /** @deprecated Legacy text */
  special_needs?: string | null;
  /** @deprecated Legacy text */
  health_emergency_instructions?: string | null;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  insurance_provider?: string | null;
  insurance_number?: string | null;
  insurance_expiry_date?: string | null;
  notes?: string | null;
  health_alert_level?: HealthAlertLevel;
  has_critical_health_alert?: boolean;
  /** @deprecated Prefer has_critical_health_alert */
  has_critical_alert?: boolean;
  critical_health_items?: CriticalHealthItem[];
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
  has_critical_health_alert?: boolean;
  /** @deprecated Prefer has_critical_health_alert */
  has_critical_alert?: boolean;
  health_alert_level?: HealthAlertLevel;
}

export interface StudentHealthUpdatePayload {
  blood_type?: string;
  has_allergies?: boolean | null;
  allergies_description?: string | null;
  has_chronic_conditions?: boolean | null;
  chronic_conditions_description?: string | null;
  has_regular_medication?: boolean | null;
  regular_medication_description?: string | null;
  has_special_needs?: boolean | null;
  special_needs_description?: string | null;
  has_emergency_instructions?: boolean | null;
  emergency_instructions?: string | null;
  /** @deprecated Legacy fields — sent only when new flags are unavailable */
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
  academicYears: { id: number; name: string; code?: string | null; is_current?: boolean }[];
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

import type { BillingResponsibilityRequest } from '@/types/billing-responsibility';
import type { StudentCreateFinancePayload } from '@/types/student-enrollment-finance';

export interface StudentCreateAcademicBlock {
  school_id: number;
  academic_year_id: number;
  level_id: number;
  class_id?: number;
  enrollment_date: string;
}

export interface StudentCreateGuardianIdentityPayload {
  full_name: string;
  phone?: string;
  secondary_phone?: string;
  email?: string;
  address?: string;
}

/** Optional provisioning flags returned on atomic student create — display only. */
export interface StudentCreateGuardianAccessMetadata {
  access_account_created?: boolean;
  access_account_exists?: boolean;
}

export type StudentCreateGuardianRelationshipItem =
  | ({
      guardian_id: number;
      relationship_type: RelationshipType;
      is_primary_contact?: boolean;
      is_legal_guardian?: boolean;
      is_financial_responsible?: boolean;
      receives_notifications?: boolean;
      is_emergency_contact?: boolean;
      is_authorized_pickup?: boolean;
      /** Request-only: opt-in portal account provisioning (default false). */
      provision_access?: boolean;
    } & StudentCreateGuardianAccessMetadata)
  | ({
      /** Existing res.partner that does not need an existing school.parent profile. */
      person_id: number;
      relationship_type: RelationshipType;
      is_primary_contact?: boolean;
      is_legal_guardian?: boolean;
      is_financial_responsible?: boolean;
      receives_notifications?: boolean;
      is_emergency_contact?: boolean;
      is_authorized_pickup?: boolean;
      provision_access?: boolean;
    } & StudentCreateGuardianAccessMetadata)
  | ({
      guardian: StudentCreateGuardianIdentityPayload;
      relationship_type: RelationshipType;
      is_primary_contact?: boolean;
      is_legal_guardian?: boolean;
      is_financial_responsible?: boolean;
      receives_notifications?: boolean;
      is_emergency_contact?: boolean;
      is_authorized_pickup?: boolean;
      provision_access?: boolean;
    } & StudentCreateGuardianAccessMetadata);

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
  active?: boolean;
  notes?: string;
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
  external_reference?: string;
  residence_address?: string;
  previous_school?: string;
  has_siblings?: boolean;
  siblings_levels?: string;
  siblings_raw_text?: string;
  sibling_lines?: SiblingLine[];
  admission_notes?: string;
  /**
   * Atomic admission conversion context (School API).
   * When set, Backend creates the student and links the admission in one savepoint.
   */
  admission_id?: number;
  class_id?: number;
  enrollment?: StudentEnrollmentBlock;
  academic?: StudentCreateAcademicBlock;
  finance?: StudentCreateFinancePayload;
  guardian_relationships?: StudentCreateGuardianRelationshipItem[];
  billing_responsibility?: BillingResponsibilityRequest;
}

export type StudentUpdatePayload = Partial<StudentCreatePayload>;

export interface StudentCapabilities {
  can_manage: boolean;
  can_manage_guardians: boolean;
  can_view_finance: boolean;
  can_view_payments?: boolean;
  can_collect_payments?: boolean;
  can_assign_fees?: boolean;
  can_manage_discounts?: boolean;
  can_manage_billing_profile?: boolean;
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
  code?: string | null;
  phone?: string | null;
  secondary_phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Alias for national_id document type — prefer identity_document_* for writes. */
  national_id?: string | null;
  identity_document_type?: import('./identity-document').IdentityDocumentType | null;
  identity_document_number?: string | null;
  identity_document_country?: string | null;
  national_id_masked?: string | null;
  identity_document_number_masked?: string | null;
  children_count?: number;
  has_account?: boolean;
  has_user_account?: boolean;
  account?: GuardianAccountInfo | UserAccountInfo | null;
  partner_id?: number;
  person_id?: number;
  guardian_id?: number | null;
  teacher_id?: number | null;
  staff_id?: number | null;
  user_id?: number | null;
  guardian_links_count?: number;
  linked_students_count?: number;
  has_user?: boolean;
  existing_roles?: string[];
  role_labels?: string[];
}

export interface GuardianCandidateWarning {
  code: string;
  message?: string;
  count?: number;
  params?: Record<string, string | number>;
}

/** Unified person search result — GET /admin/guardians/search or guardian-candidates */
export interface PersonSearchResult extends GuardianSummary {
  partner_id: number;
  existing_roles: string[];
  role_labels: string[];
  has_user_account: boolean;
  can_link_as_guardian: boolean;
  /** Why this row matched — e.g. identity_document (SSC-API-2026.07.003). */
  match_basis?: import('./identity-document').GuardianSearchMatchBasis | null;
  warnings?: GuardianCandidateWarning[];
  missing_contact_fields?: string[];
  already_guardian_of_student?: boolean;
  active?: boolean;
  archived?: boolean;
  status?: string;
  archive_reason?: string | null;
  allowed_actions?: GuardianAllowedActions;
  delete_impact?: GuardianDeleteImpact;
}

export interface LinkPersonAccountInfo {
  has_user_account?: boolean;
  user_id?: number;
  needs_new_account?: boolean;
  can_assign_password?: boolean;
  roles_added?: string[];
}

export interface LinkPersonAsGuardianResponse {
  guardian: GuardianSummary;
  account?: LinkPersonAccountInfo;
  person?: {
    existing_roles?: string[];
    role_labels?: string[];
    teacher_id?: number | null;
    staff_id?: number | null;
    guardian_id?: number | null;
    has_user?: boolean;
    has_user_account?: boolean;
    user_id?: number | null;
  };
}

export interface GuardianContactPatch {
  phone?: string;
  email?: string;
}

export interface LinkPersonAsGuardianPayload {
  partner_id: number;
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
  contact_patch?: GuardianContactPatch;
}

export type GuardianDuplicateField = 'phone' | 'email' | 'national_id' | 'unknown';

export interface GuardianAllowedActions {
  remove_guardian_relationship?: boolean;
  remove_relationship?: boolean;
  end_relationship?: boolean;
  edit_relationship?: boolean;
  link_as_guardian?: boolean;
  manage_account?: boolean;
  archive_guardian_profile?: boolean;
  restore_guardian_profile?: boolean;
  delete_guardian_profile?: boolean;
  delete_person?: boolean;
}

export interface GuardianDeleteBlocker {
  code: string;
  message?: string;
}

export interface GuardianDeleteImpact {
  active_relationships?: number;
  historical_relationships?: number;
  financial_dependencies?: number;
  other_roles?: string[];
  role_labels?: string[];
  has_user_account?: boolean;
  has_teacher_profile?: boolean;
  has_staff_profile?: boolean;
  has_accounting_history?: boolean;
  blockers?: GuardianDeleteBlocker[];
  will_delete?: string[];
  will_remain?: string[];
  summary?: string[];
  blocker_code?: string;
  blocker_message?: string;
}

export interface GuardianFinancialBlocker {
  code: string;
  message: string;
  agreement_id?: number;
  agreement_name?: string;
  profile_id?: number;
  student_id?: number;
  guardian_id?: number;
  recovery_action?: string;
}

export interface GuardianRemovalBillingEntity {
  type?: string;
  display_name?: string;
  guardian_id?: number;
  partner_id?: number;
  student_id?: number;
  relationship_id?: number;
}

export interface GuardianRemovalEffects {
  was_primary_guardian?: boolean;
  was_financial_responsible?: boolean;
  was_emergency_contact?: boolean;
  new_default_billing_entity?: GuardianRemovalBillingEntity | null;
}

export interface GuardianRemovalImpactAction {
  label: string;
  href?: string;
  action?: string;
}

export interface GuardianRemovalImpact {
  can_remove?: boolean;
  blocked?: boolean;
  blocker_code?: string;
  blocker_message?: string;
  suggested_actions?: GuardianRemovalImpactAction[];
  summary?: string[];
  items?: string[];
  other_children_count?: number;
  linked_students_count?: number;
  other_roles?: string[];
  role_labels?: string[];
  account_preserved?: boolean;
  user_account_preserved?: boolean;
  person_preserved?: boolean;
  professional_profile_preserved?: boolean;
  professional_roles?: string[];
  removes_primary_contact?: boolean;
  removes_financial_responsible?: boolean;
  removes_legal_guardian?: boolean;
  removes_emergency_contact?: boolean;
  billing_party_change?: string | null;
  has_user_account?: boolean;
  needs_new_account?: boolean;
  requires_confirmation?: boolean;
  can_remove_without_confirmation?: boolean;
  multi_role_person?: boolean;
  can_delete_person?: boolean;
  financial_blockers?: GuardianFinancialBlocker[];
  effects?: GuardianRemovalEffects;
}

export interface GuardianRelationshipDetailResponse {
  relationship: GuardianRelationship;
  allowed_actions?: GuardianAllowedActions;
  removal_impact?: GuardianRemovalImpact;
  person?: GuardianSummary;
  account?: {
    has_user_account?: boolean;
    needs_new_account?: boolean;
    can_assign_password?: boolean;
    roles?: string[];
    user_id?: number;
  };
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
  allowed_actions?: GuardianAllowedActions;
  removal_impact?: GuardianRemovalImpact;
  needs_review?: boolean;
}

export interface StudentDetailsData {
  student: StudentSummary;
  current_enrollment: StudentEnrollment | null;
  enrollment_history: StudentEnrollment[];
  guardian_relationships: GuardianRelationship[];
  capabilities: StudentCapabilities;
  document_summary?: StudentDocumentSummary | null;
  health_summary?: StudentHealthSummary | null;
  finance_summary?: StudentFinanceOverviewSummary | null;
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
  identity_document_type?: import('./identity-document').IdentityDocumentType | null;
  identity_document_number?: string | null;
  identity_document_country?: string | null;
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
