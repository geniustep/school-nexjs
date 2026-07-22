/**
 * Academic Context options + Academic Terms — School API v1 contracts.
 * GET /admin|teacher/academic-context/options
 * GET|POST /admin/academic-years/{id}/terms[/initialize]
 * PATCH /admin/academic-setup/terms/{term_id} (draft edit; Odoo d30f67e)
 */

export type AcademicContextScope =
  | 'assignment'
  | 'timetable'
  | 'exam'
  | 'gradebook'
  | 'teaching_planning'
  | 'catalog'
  | string;

export interface AcademicContextOptionRef {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
}

export interface AcademicYearOption {
  id: number;
  name: string;
  code?: string | null;
  date_start?: string | null;
  date_end?: string | null;
  active?: boolean;
  state?: string | null;
}

export interface CycleOption {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number | null;
}

export interface LevelContextOption {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
  academic_code?: string | null;
  cycle?: AcademicContextOptionRef | null;
  supports_tracks?: boolean;
  display_label?: string | null;
}

export interface TrackContextOption {
  id: number;
  name: string;
  code?: string | null;
  level_id?: number | null;
  display_label?: string | null;
}

export interface TeachingLanguageOption {
  id: number;
  name: string;
  code?: string | null;
  locale?: string | null;
  display_label?: string | null;
}

export type EffectiveSubjectSource = 'level' | 'track' | 'class' | 'offering';

export interface EffectiveSubjectOption {
  id: number;
  name: string;
  code?: string | null;
  source?: EffectiveSubjectSource | null;
  level?: AcademicContextOptionRef | null;
  track?: AcademicContextOptionRef | null;
  offering_count?: number | null;
  ambiguous?: boolean;
  display_label?: string | null;
  context_label?: string | null;
}

export interface TeachingOfferingContextOption {
  id: number;
  name: string;
  state?: string | null;
  academic_year?: AcademicContextOptionRef | null;
  cycle?: AcademicContextOptionRef | null;
  level?: AcademicContextOptionRef | null;
  subject?: AcademicContextOptionRef | null;
  track?: AcademicContextOptionRef | null;
  teaching_language?: TeachingLanguageOption | null;
  teaching_reference?: AcademicContextOptionRef | null;
  display_label?: string | null;
  context_fingerprint?: string | null;
  allowed_actions?: Record<string, boolean>;
}

export interface TeachingReferenceContextOption {
  id: number;
  name: string;
  version_label?: string | null;
  subject?: AcademicContextOptionRef | null;
  level?: AcademicContextOptionRef | null;
  track?: AcademicContextOptionRef | null;
  teaching_language?: TeachingLanguageOption | null;
  academic_year?: AcademicContextOptionRef | null;
  offering_id?: number | null;
  display_label?: string | null;
  context_complete?: boolean;
}

export interface AcademicTermOption {
  id: number;
  name: string;
  code?: string | null;
  sequence?: number | null;
  date_start?: string | null;
  date_end?: string | null;
  state?: string | null;
  active?: boolean;
  academic_year?: AcademicContextOptionRef | null;
  academic_year_id?: number | null;
  allowed_actions?: Record<string, boolean>;
  display_label?: string | null;
}

export interface AcademicClassContextOption {
  id: number;
  name: string;
  code?: string | null;
  display_name?: string | null;
  display_alias?: string | null;
  section_name?: string | null;
  academic_code?: string | null;
  recommended_display_code?: string | null;
  code_status?: 'ok' | 'legacy' | string | null;
  level?: AcademicContextOptionRef | null;
  track?: AcademicContextOptionRef | null;
  academic_year?: AcademicContextOptionRef | null;
  display_label?: string | null;
}

export interface SelectedAcademicContext {
  academic_year_id?: number | null;
  cycle_id?: number | null;
  level_id?: number | null;
  track_id?: number | null;
  teaching_language_id?: number | null;
  subject_id?: number | null;
  offering_id?: number | null;
  teaching_offering_id?: number | null;
  reference_id?: number | null;
  term_id?: number | null;
  class_id?: number | null;
  scope?: AcademicContextScope | null;
}

export interface InvalidatedAcademicSelection {
  field: string;
  previous_value?: number | string | null;
  reason?: string | null;
}

export interface AcademicContextReadinessIssue {
  code: string;
  severity?: 'blocker' | 'warning' | 'info' | string;
  message?: string | null;
  field?: string | null;
}

export interface AcademicContextReadiness {
  ready?: boolean;
  blockers?: AcademicContextReadinessIssue[];
  warnings?: AcademicContextReadinessIssue[];
  issues?: AcademicContextReadinessIssue[];
}

export interface AcademicContextWarning {
  code: string;
  message?: string | null;
  severity?: string | null;
  field?: string | null;
}

export interface AcademicContextAppliedFilters {
  academic_year_id?: number | null;
  cycle_id?: number | null;
  level_id?: number | null;
  track_id?: number | null;
  teaching_language_id?: number | null;
  subject_id?: number | null;
  offering_id?: number | null;
  teaching_offering_id?: number | null;
  reference_id?: number | null;
  term_id?: number | null;
  class_id?: number | null;
  scope?: AcademicContextScope | null;
  include_inactive?: boolean;
}

export interface AcademicContextOptionsResponse {
  selected_context?: SelectedAcademicContext | null;
  academic_years: AcademicYearOption[];
  cycles: CycleOption[];
  levels: LevelContextOption[];
  tracks: TrackContextOption[];
  teaching_languages: TeachingLanguageOption[];
  subjects: EffectiveSubjectOption[];
  offerings: TeachingOfferingContextOption[];
  references: TeachingReferenceContextOption[];
  terms: AcademicTermOption[];
  classes?: AcademicClassContextOption[];
  applied_filters?: AcademicContextAppliedFilters | null;
  invalidated_selections: InvalidatedAcademicSelection[];
  readiness?: AcademicContextReadiness | null;
  warnings: AcademicContextWarning[];
  language_contract_complete?: boolean;
}

export interface AcademicContextOptionsQuery {
  academic_year_id?: number | null;
  cycle_id?: number | null;
  level_id?: number | null;
  track_id?: number | null;
  teaching_language_id?: number | null;
  subject_id?: number | null;
  teaching_offering_id?: number | null;
  offering_id?: number | null;
  reference_id?: number | null;
  term_id?: number | null;
  class_id?: number | null;
  scope?: AcademicContextScope | null;
  include_inactive?: boolean;
}

export interface AcademicTermsListResponse {
  academic_year: AcademicYearOption | null;
  terms: AcademicTermOption[];
  readiness?: AcademicContextReadiness | null;
  warnings?: AcademicContextWarning[];
  allowed_actions?: Record<string, boolean>;
}

export interface AcademicTermsInitializePayload {
  term_1_name?: string | null;
  term_1_date_start: string;
  term_1_date_end: string;
  term_2_name?: string | null;
  term_2_date_start: string;
  term_2_date_end: string;
}

export interface AcademicTermsInitializeResult {
  terms: AcademicTermOption[];
  readiness?: AcademicContextReadiness | null;
  warnings?: AcademicContextWarning[];
}

/** Partial PATCH body for draft term edit — only these keys may be sent. */
export type UpdateAcademicTermInput = {
  name?: string;
  code?: string;
  date_start?: string;
  date_end?: string;
};

/** Selection values controlled by the shared Academic Context UI. */
export interface AcademicContextSelection {
  academicYearId: string;
  cycleId: string;
  levelId: string;
  trackId: string;
  teachingLanguageId: string;
  subjectId: string;
  offeringId: string;
  referenceId: string;
  termId: string;
  classId: string;
}

export type AcademicContextField =
  | 'academicYear'
  | 'cycle'
  | 'level'
  | 'track'
  | 'teachingLanguage'
  | 'subject'
  | 'offering'
  | 'reference'
  | 'term'
  | 'class';
