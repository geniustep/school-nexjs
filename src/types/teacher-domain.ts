/**
 * Teacher Domain School API types — SSC-API-2026.07.001.
 * Additive contracts for admin Teacher Profile / Academic Profile /
 * Teaching Assignment / Teaching Offering surfaces.
 */

import type { Ref, SchoolRef } from './api';
import type { UserAccountInfo } from './account';
import type { ApiWarning } from './academic-setup';

export const TEACHER_DOMAIN_CONTRACT_VERSION = 'SSC-API-2026.07.001' as const;

export type TeacherDomainContractVersion = typeof TEACHER_DOMAIN_CONTRACT_VERSION;

export type AllowedActionsMap = Partial<Record<string, boolean>>;

export type ApiContractMetadata = {
  contract_name?: string;
  contract_version?: string;
  compatibility?: string;
  backend_module?: string;
  backend_module_version?: string;
  domains?: string[];
  generic_orm_endpoint?: boolean;
  notes?: string;
  teacher_profile_sot?: string;
  academic_profile_boundary?: string;
  assignment_sot?: string;
  offering_sot?: string;
  [key: string]: unknown;
};

export type PaginationMetadata = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  limit?: number;
  pages?: number;
  has_next?: boolean;
};

export type ApiErrorEnvelope = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: Record<string, unknown>;
};

export type TeacherIdentity = {
  display_name?: string | null;
  partner_id?: number | null;
  partner_name?: string | null;
  source?: string | null;
};

export type TeacherAccountSummary = {
  user_id?: number | null;
  has_linked_user?: boolean;
  user_active?: boolean;
  login?: string | null;
  status?: string | null;
};

export type TeacherEmploymentSummary = {
  hire_date?: string | null;
  contract_type?: string | null;
  employment_end_date?: string | null;
  employment_end_reason?: string | null;
  archive_date?: string | null;
  archive_reason?: string | null;
  state?: string | null;
  active?: boolean;
  job_title?: string | null;
};

export type TeacherAcademicProfileSummary = {
  eligible_cycle_count?: number;
  eligible_level_count?: number;
  subject_eligibility_count?: number;
  qualification_count?: number;
  availability_count?: number;
  weekly_hours_target?: number | null;
  weekly_hours_max?: number | null;
};

export type TeacherAssignmentSummaryCounts = {
  total_count?: number;
  active_count?: number;
  operational_count?: number;
  planned_weekly_load?: number | null;
};

export type TeacherAllowedAction =
  | 'view'
  | 'edit'
  | 'archive'
  | 'terminate'
  | 'reactivate'
  | 'manage_account'
  | 'manage_academic_profile'
  | 'manage_availability'
  | 'manage_assignments'
  | (string & {});

/** Lightweight list row — do not load full assignment/qualification payloads for lists. */
export type TeacherSummary = {
  id: number;
  name: string;
  code: string | null;
  phone?: string | null;
  email?: string | null;
  identity?: TeacherIdentity | null;
  account?: TeacherAccountSummary | UserAccountInfo | null;
  school?: (SchoolRef & { code?: string | null }) | null;
  school_id?: number | null;
  status: string;
  active?: boolean;
  specialization?: string | null;
  qualification?: string | null;
  teacher_type?: string | null;
  employment?: TeacherEmploymentSummary | null;
  academic_profile_summary?: TeacherAcademicProfileSummary | null;
  assignment_summary?: TeacherAssignmentSummaryCounts | null;
  subjects?: Ref[];
  classes?: Ref[];
  warnings?: ApiWarning[];
  allowed_actions?: AllowedActionsMap | TeacherAllowedAction[];
  contract?: ApiContractMetadata;
  weekly_hours_target?: number | null;
  weekly_hours_max?: number | null;
};

export type TeacherDetail = TeacherSummary & {
  gender?: string | null;
  date_of_birth?: string | null;
  user_id?: number | null;
  school_ids?: (SchoolRef & { code?: string | null })[];
  hire_date?: string | null;
  contract_type?: string | null;
  employment_end_date?: string | null;
  employment_end_reason?: string | null;
  archive_date?: string | null;
  archive_reason?: string | null;
  daily_hours_max?: number | null;
  max_continuous_minutes?: number | null;
  prefer_compact_schedule?: boolean;
  eligible_as_head_teacher?: boolean;
  eligible_as_subject_coordinator?: boolean;
  eligible_as_level_coordinator?: boolean;
  eligible_cycles?: Ref[];
  eligible_levels?: Ref[];
  teaching_languages?: Ref[];
  academic_qualifications?: TeacherQualification[];
  availability?: TeacherAvailabilitySlot[];
  assignments?: TeacherAssignmentSummary[];
  academic_link?: TeacherAcademicProfile | null;
  exceptions?: unknown[];
};

export type AcademicProfileAllowedAction =
  | 'view'
  | 'can_view'
  | 'edit_eligibility'
  | 'can_edit_academic_profile'
  | 'edit_limits'
  | 'manage_qualifications'
  | 'can_manage_qualifications'
  | 'manage_availability'
  | 'can_manage_availability'
  | 'verify_qualification'
  | 'manage_assignments'
  | (string & {});

export type EligibilityDimensionMode = 'specified' | 'unspecified';

export type EligibilityDimensionSummary = {
  mode: EligibilityDimensionMode;
  count: number;
  /** Compat alias for `mode`. */
  status?: EligibilityDimensionMode;
};

export type TeacherEligibilityDimensions = {
  subjects?: EligibilityDimensionSummary;
  cycles?: EligibilityDimensionSummary;
  levels?: EligibilityDimensionSummary;
  teaching_languages?: EligibilityDimensionSummary;
};

export type AcademicCompletenessState = 'unconfigured' | 'partial' | 'complete';

export type AcademicCompleteness = {
  state: AcademicCompletenessState;
  subjects_specified?: boolean;
  stage_or_level_specified?: boolean;
  teaching_languages_specified?: boolean;
  weekly_limit_specified?: boolean;
  /** Backend source of truth — currently always false in 238. */
  blocks_assignment: boolean;
};

export type AcademicCompletenessWarning = {
  code: string;
  message?: string;
  completeness_state?: AcademicCompletenessState;
};

export type AssignmentMismatchWarning = {
  assignment_id?: number | null;
  reason_code?: string | null;
  reason_codes?: string[];
  issues?: string[];
  hard_block?: boolean;
  mutates_assignment?: boolean;
  code?: string | null;
  message?: string | null;
};

export type AssignmentMismatchSummary = {
  count: number;
  warnings: AssignmentMismatchWarning[];
  mutates_assignment?: boolean;
  source?: string | null;
};

export type TeacherAcademicProfileAllowedActions = AllowedActionsMap;

export type TeacherQualification = {
  id?: number;
  type?: string | null;
  title?: string | null;
  institution?: string | null;
  specialization?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  verification_state?: string | null;
  attachment_summary?: string | null;
  [key: string]: unknown;
};

export type TeacherAvailabilityType =
  | 'available'
  | 'preferred'
  | 'unavailable'
  | 'mandatory_unavailable'
  | (string & {});

export type TeacherAvailabilitySlot = {
  id?: number;
  day?: string | number | null;
  day_of_week?: string | number | null;
  start?: string | null;
  end?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  availability_type?: TeacherAvailabilityType | null;
  type?: TeacherAvailabilityType | null;
  effective_from?: string | null;
  effective_to?: string | null;
  reason?: string | null;
  priority?: number | null;
  [key: string]: unknown;
};

export type TeacherEligibleSubjectRef = Ref & {
  code?: string | null;
  active?: boolean;
  school_id?: number | null;
  ref_subject?: Ref | null;
};

export type TeacherEligibleLevelRef = Ref & {
  school_id?: number | null;
  active?: boolean;
  ref_level_id?: number | null;
  cycle_id?: number | null;
};

export type TeacherEligibleLanguageRef = Ref & {
  code?: string | null;
};

export type TeacherAcademicEligibility = {
  subjects?: TeacherEligibleSubjectRef[];
  eligible_subjects?: TeacherEligibleSubjectRef[];
  subjects_status?: EligibilityDimensionMode | string | null;
  subjects_role?: string | null;
  specialization?: string | null;
  cycles?: Ref[];
  cycles_status?: EligibilityDimensionMode | string | null;
  levels?: TeacherEligibleLevelRef[];
  levels_status?: EligibilityDimensionMode | string | null;
  teaching_languages?: TeacherEligibleLanguageRef[];
  teaching_languages_status?: EligibilityDimensionMode | string | null;
  teacher_type?: string | null;
  eligible_as_head_teacher?: boolean;
  eligible_as_subject_coordinator?: boolean;
  eligible_as_level_coordinator?: boolean;
  eligibility_dimensions?: TeacherEligibilityDimensions;
  empty_list_means?: string | null;
  unspecified_means_ineligible?: boolean;
};

export type TeacherWorkloadLimits = {
  kind?: string;
  weekly_hours_target?: number | null;
  weekly_hours_max?: number | null;
  daily_hours_max?: number | null;
  max_continuous_minutes?: number | null;
  prefer_compact_schedule?: boolean;
  weekly_limit_status?: EligibilityDimensionMode | string | null;
  daily_limit_status?: EligibilityDimensionMode | string | null;
  continuous_limit_status?: EligibilityDimensionMode | string | null;
  is_assignment_volume?: boolean;
  is_timetable_capacity?: boolean;
  is_current_load?: boolean;
};

export type TeacherOperationalDerived = {
  kind?: string;
  source?: string;
  writable?: boolean;
  is_academic_eligibility?: boolean;
  current_assignments?: TeacherAssignmentSummary[];
  derived_workload?: Record<string, unknown>;
};

export type TeacherAcademicProfile = {
  is_teacher?: boolean;
  teacher_id: number;
  /** Top-level additive fields (238) — also mirrored under eligibility when present. */
  specialization?: string | null;
  teacher_type?: string | null;
  contract?: ApiContractMetadata & {
    model?: string;
    parallel_academic_profile_model?: boolean;
    academic_eligibility_ne_assignment?: boolean;
    academic_eligibility_ne_timetable?: boolean;
    assignment_source_of_truth?: string;
    answers?: string[];
    does_not_answer?: string[];
  };
  eligibility?: TeacherAcademicEligibility;
  eligibility_dimensions?: TeacherEligibilityDimensions;
  academic_completeness?: AcademicCompleteness | null;
  completeness_warnings?: AcademicCompletenessWarning[];
  limits?: TeacherWorkloadLimits;
  availability?: TeacherAvailabilitySlot[];
  availability_summary?: Record<string, unknown>;
  qualifications?: TeacherQualification[];
  qualifications_summary?: Record<string, unknown>;
  /** Read-only operational context — never submitted as academic writes. */
  current_assignments?: TeacherAssignmentSummary[];
  derived_workload?: Record<string, unknown>;
  operational_derived?: TeacherOperationalDerived;
  assignment_mismatch_summary?: AssignmentMismatchSummary | null;
  eligibility_warnings?: ApiWarning[];
  availability_conflicts?: ApiWarning[];
  allowed_actions?: TeacherAcademicProfileAllowedActions | AcademicProfileAllowedAction[];
  warnings?: ApiWarning[];
};

export type TeacherAssignmentAllowedAction =
  | 'view'
  | 'edit'
  | 'activate'
  | 'suspend'
  | 'resume'
  | 'end'
  | 'cancel'
  | 'archive'
  | (string & {});

export type TeacherAssignmentSummary = {
  id: number;
  teacher?: { id: number; name: string; teacher_type?: string | null } | null;
  class?: { id: number; name: string; level_id?: number | null; level_name?: string | null } | null;
  subject?: { id: number; name: string; code?: string | null } | null;
  teaching_offering_id?: number | null;
  teaching_offering?: { id: number; display_name?: string; name?: string; state?: string } | null;
  academic_year?: Ref | null;
  level?: Ref | null;
  role?: string | null;
  state?: string;
  active?: boolean;
  is_operationally_active?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  planned_weekly_load?: number | null;
  weekly_hours?: number | null;
  warnings?: ApiWarning[];
  structured_warnings?: ApiWarning[];
  eligibility_warnings?: ApiWarning[];
  allowed_actions?: AllowedActionsMap | TeacherAssignmentAllowedAction[];
  contract?: ApiContractMetadata;
  effective_period?: { from?: string | null; to?: string | null } | null;
  school?: SchoolRef | null;
  is_primary?: boolean;
  notes?: string | null;
};

export type TeacherAssignmentDetail = TeacherAssignmentSummary & {
  identity?: Record<string, unknown>;
  scope?: Record<string, unknown>;
  termination_reason?: string | null;
  source?: string | null;
  ended_by?: Ref | { id: number; name?: string } | null;
  ended_at?: string | null;
  audit?: Record<string, unknown>;
};

export type TeachingOfferingAllowedAction =
  | 'view'
  | 'edit'
  | 'submit'
  | 'submit_for_review'
  | 'approve'
  | 'activate'
  | 'archive'
  | 'reset_to_draft'
  | 'duplicate'
  | 'delete'
  | 'link_assignments'
  | (string & {});

export type TeachingOfferingSummary = {
  id: number;
  display_name?: string;
  name?: string;
  subject?: Ref | null;
  level?: Ref | null;
  academic_year?: Ref | null;
  teaching_language?: { id: number; code?: string; name: string } | null;
  track?: Ref | null;
  reference?: { id: number; name?: string; display_name?: string } | null;
  state?: string;
  active?: boolean;
  effective_from?: string | null;
  effective_to?: string | null;
  assignment_count?: number;
  class_count?: number;
  teacher_count?: number;
  warnings?: ApiWarning[];
  allowed_actions?: AllowedActionsMap | TeachingOfferingAllowedAction[];
  contract?: ApiContractMetadata;
  operational_status?: string | null;
  has_active_distribution?: boolean;
};

export type TeachingOfferingDetail = TeachingOfferingSummary & {
  notes?: string | null;
  assignments?: TeacherAssignmentSummary[];
  readiness?: Record<string, unknown>;
  activation_blockers?: string[];
};

export type TeacherListFilters = {
  page?: number;
  page_size?: number;
  search?: string;
  state?: string;
  active?: string | boolean;
  has_assignments?: string | boolean;
  assignment_state?: string;
  academic_year_id?: number | string;
  level_id?: number | string;
  ordering?: string;
};

export type AssignmentListFilters = {
  page?: number;
  page_size?: number;
  teacher_id?: number | string;
  class_id?: number | string;
  subject_id?: number | string;
  teaching_offering_id?: number | string;
  academic_year_id?: number | string;
  level_id?: number | string;
  state?: string;
  operationally_active?: string | boolean;
  is_operationally_active?: string | boolean;
  effective_date?: string;
  ordering?: string;
  search?: string;
};

export type OfferingListFilters = {
  page?: number;
  page_size?: number;
  academic_year_id?: number | string;
  level_id?: number | string;
  subject_id?: number | string;
  teaching_language_id?: number | string;
  track_id?: number | string;
  state?: string;
  operationally_active?: string | boolean;
  effective_date?: string;
  ordering?: string;
  search?: string;
};

/** Academic write whitelist — never includes assignment/timetable fields. */
export type TeacherAcademicProfileWritePayload = {
  specialization?: string | null;
  teacher_type?: string | null;
  eligible_subject_ids?: number[];
  eligible_level_ids?: number[];
  eligible_cycle_ids?: number[];
  teaching_language_ids?: number[];
  eligible_as_head_teacher?: boolean;
  eligible_as_subject_coordinator?: boolean;
  eligible_as_level_coordinator?: boolean;
  weekly_hours_target?: number | null;
  weekly_hours_max?: number | null;
  daily_hours_max?: number | null;
  max_continuous_minutes?: number | null;
  prefer_compact_schedule?: boolean;
  qualifications?: TeacherQualification[];
  availability?: TeacherAvailabilitySlot[];
};

export type TeacherTerminatePayload = {
  reason: string;
  employment_end_date?: string;
};

export type TeacherArchivePayload = {
  reason: string;
};

export type AssignmentEndPayload = {
  reason: string;
  effective_to?: string;
};

export type AssignmentCancelPayload = {
  reason: string;
};
