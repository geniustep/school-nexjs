/**
 * Odoo admissions assessment workflow contract (module 18.0.1.0.185).
 * Backend fields win; legacy state/registration_status used only as fallback.
 */

import type { AdmissionDecision } from '@/types/admission';
import { normalizeAdmissionDecision } from './normalize-admission-decision';

export const REQUIRED_ODOO_ADMISSIONS_MODULE = '18.0.1.0.185';
export const REQUIRED_ODOO_COMMIT = 'd331ccb986df65aa0574cdbe0ec1c81fe553c511';

export const ADMISSION_PROCESSING_STAGES = [
  'new',
  'initial_follow_up',
  'assessment_ready',
  'assessment_in_progress',
  'decision_ready',
] as const;

export type AdmissionProcessingStage = (typeof ADMISSION_PROCESSING_STAGES)[number];

/** Follow-up kanban / drag targets only. */
export const FOLLOW_UP_PROCESSING_STAGES = [
  'new',
  'initial_follow_up',
  'assessment_ready',
] as const;

export type FollowUpProcessingStage = (typeof FOLLOW_UP_PROCESSING_STAGES)[number];

export const AWAITING_DECISION_PROCESSING_STAGES = [
  'assessment_in_progress',
  'decision_ready',
] as const;

export type AwaitingDecisionProcessingStage =
  (typeof AWAITING_DECISION_PROCESSING_STAGES)[number];

export const ADMISSION_ASSESSMENT_PROGRESS = [
  'not_required',
  'not_started',
  'in_progress',
  'additional_required',
  'completed',
  'ready_for_decision',
] as const;

export type AdmissionAssessmentProgress = (typeof ADMISSION_ASSESSMENT_PROGRESS)[number];

export const ADMISSION_ASSESSMENT_TYPES = [
  'written_test',
  'oral_interview',
  'subject_teacher_assessment',
  'administrative_interview',
  'placement_assessment',
  'additional_assessment',
  'other',
] as const;

export type AdmissionAssessmentType = (typeof ADMISSION_ASSESSMENT_TYPES)[number];

export const ADMISSION_ASSESSMENT_STATES = [
  'not_scheduled',
  'scheduled',
  'in_progress',
  'completed',
  'no_show',
  'rescheduled',
  'cancelled',
] as const;

export type AdmissionAssessmentItemState = (typeof ADMISSION_ASSESSMENT_STATES)[number];

export const ADMISSION_ASSESSMENT_RECOMMENDATIONS = [
  'no_result',
  'suitable',
  'suitable_with_conditions',
  'review_required',
  'not_suitable',
] as const;

export type AdmissionAssessmentRecommendation =
  (typeof ADMISSION_ASSESSMENT_RECOMMENDATIONS)[number];

export const ADMISSION_OFFER_STATES_V185 = [
  'not_applicable',
  'not_created',
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
  'withdrawn',
] as const;

export type AdmissionOfferStateV185 = (typeof ADMISSION_OFFER_STATES_V185)[number];

export const ADMISSION_REGISTRATION_READINESS = [
  'not_applicable',
  'blocked',
  'awaiting_offer_creation',
  'awaiting_offer_response',
  'ready',
  'registered',
] as const;

export type AdmissionRegistrationReadiness =
  (typeof ADMISSION_REGISTRATION_READINESS)[number];

export type AdmissionRegistrationRequirementSeverity =
  | 'blocking'
  | 'warning'
  | 'information';

export type AdmissionRegistrationRequirement = {
  code?: string | null;
  key?: string | null;
  severity?: AdmissionRegistrationRequirementSeverity | string | null;
  level?: AdmissionRegistrationRequirementSeverity | string | null;
  message?: string | null;
  label?: string | null;
  title?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdmissionAssessmentSummaryItem = {
  id?: number | null;
  assessment_type?: string | null;
  assessment_type_label?: string | null;
  state?: string | null;
  subject?: string | { name?: string | null } | null;
  subject_label?: string | null;
  evaluator?: string | { name?: string | null } | null;
  scheduled_at?: string | null;
  assessment_date?: string | null;
  required?: boolean | null;
  recommendation?: string | null;
  recommendation_label?: string | null;
  next_action?: string | null;
  notes?: string | null;
  [key: string]: unknown;
};

export type AdmissionAssessmentSummary = {
  progress?: AdmissionAssessmentProgress | string | null;
  required_count?: number | null;
  completed_count?: number | null;
  open_count?: number | null;
  optional_count?: number | null;
  next_assessment?: AdmissionAssessmentSummaryItem | null;
  blocking_assessments?: AdmissionAssessmentSummaryItem[] | null;
  assessments?: AdmissionAssessmentSummaryItem[] | null;
  [key: string]: unknown;
};

export type AdmissionOfferSummary = {
  required?: boolean | null;
  offer_required?: boolean | null;
  state?: string | null;
  offer_state?: string | null;
  offer_id?: number | null;
  sent_at?: string | null;
  deadline_date?: string | null;
  expires_at?: string | null;
  policy_note?: string | null;
  reason?: string | null;
  [key: string]: unknown;
};

export type AdmissionNextActionObject = {
  code?: string | null;
  key?: string | null;
  action?: string | null;
  label?: string | null;
  message?: string | null;
  description?: string | null;
  [key: string]: unknown;
};

export type AdmissionNextAction = string | AdmissionNextActionObject | null;

/** Legacy state → processing_stage mapping for URL / stale payloads. */
export const LEGACY_STATE_TO_PROCESSING_STAGE: Record<string, AdmissionProcessingStage> = {
  new: 'new',
  contacted: 'initial_follow_up',
  qualified: 'assessment_ready',
  visit_pending: 'initial_follow_up',
  under_review: 'decision_ready',
};

export function isAdmissionProcessingStage(
  value: string | null | undefined,
): value is AdmissionProcessingStage {
  return ADMISSION_PROCESSING_STAGES.includes(
    String(value ?? '') as AdmissionProcessingStage,
  );
}

export function isFollowUpProcessingStage(
  value: string | null | undefined,
): value is FollowUpProcessingStage {
  return FOLLOW_UP_PROCESSING_STAGES.includes(
    String(value ?? '') as FollowUpProcessingStage,
  );
}

export function isAwaitingDecisionProcessingStage(
  value: string | null | undefined,
): value is AwaitingDecisionProcessingStage {
  return AWAITING_DECISION_PROCESSING_STAGES.includes(
    String(value ?? '') as AwaitingDecisionProcessingStage,
  );
}

export function parseAdmissionProcessingStage(
  value: unknown,
): AdmissionProcessingStage | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (isAdmissionProcessingStage(raw)) return raw;
  return LEGACY_STATE_TO_PROCESSING_STAGE[raw] ?? null;
}

export function parseAdmissionAssessmentProgress(
  value: unknown,
): AdmissionAssessmentProgress | null {
  const raw = String(value ?? '').trim();
  if (
    ADMISSION_ASSESSMENT_PROGRESS.includes(raw as AdmissionAssessmentProgress)
  ) {
    return raw as AdmissionAssessmentProgress;
  }
  return null;
}

export function parseAdmissionOfferStateV185(
  value: unknown,
): AdmissionOfferStateV185 | string | null {
  if (value === false || value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw === 'pending') return 'sent';
  if (raw === 'cancelled') return 'withdrawn';
  if (raw === 'rejected') return 'declined';
  return raw;
}

export function parseAdmissionRegistrationReadiness(
  value: unknown,
): AdmissionRegistrationReadiness | null {
  const raw = String(value ?? '').trim();
  if (
    ADMISSION_REGISTRATION_READINESS.includes(
      raw as AdmissionRegistrationReadiness,
    )
  ) {
    return raw as AdmissionRegistrationReadiness;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function normalizeAdmissionAssessmentSummary(
  value: unknown,
): AdmissionAssessmentSummary | null {
  const obj = asRecord(value);
  if (!obj) return null;
  return {
    ...obj,
    progress: parseAdmissionAssessmentProgress(obj.progress) ?? (obj.progress as string | null) ?? null,
    required_count:
      typeof obj.required_count === 'number' ? obj.required_count : Number(obj.required_count) || null,
    completed_count:
      typeof obj.completed_count === 'number'
        ? obj.completed_count
        : Number(obj.completed_count) || null,
    open_count:
      typeof obj.open_count === 'number' ? obj.open_count : Number(obj.open_count) || null,
  };
}

export function normalizeAdmissionOfferSummary(
  value: unknown,
): AdmissionOfferSummary | null {
  const obj = asRecord(value);
  if (!obj) return null;
  return {
    ...obj,
    state: parseAdmissionOfferStateV185(obj.state ?? obj.offer_state),
    offer_state: parseAdmissionOfferStateV185(obj.offer_state ?? obj.state),
  };
}

export function normalizeAdmissionRegistrationRequirements(
  value: unknown,
): AdmissionRegistrationRequirement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === 'string') {
        return { message: item, severity: 'warning' as const };
      }
      const obj = asRecord(item);
      if (!obj) return null;
      const severityRaw = String(obj.severity ?? obj.level ?? 'information').toLowerCase();
      let severity: AdmissionRegistrationRequirementSeverity = 'information';
      if (severityRaw === 'blocking' || severityRaw === 'block' || severityRaw === 'error') {
        severity = 'blocking';
      } else if (severityRaw === 'warning' || severityRaw === 'warn') {
        severity = 'warning';
      }
      return {
        ...obj,
        severity,
        message:
          (typeof obj.message === 'string' && obj.message) ||
          (typeof obj.label === 'string' && obj.label) ||
          (typeof obj.title === 'string' && obj.title) ||
          (typeof obj.description === 'string' && obj.description) ||
          null,
      } satisfies AdmissionRegistrationRequirement;
    })
    .filter(Boolean) as AdmissionRegistrationRequirement[];
}

export function normalizeAdmissionNextAction(value: unknown): AdmissionNextAction {
  if (value == null || value === false) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  const obj = asRecord(value);
  if (!obj) return null;
  return obj as AdmissionNextActionObject;
}

export function admissionNextActionLabel(value: AdmissionNextAction): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  const label =
    (typeof value.label === 'string' && value.label) ||
    (typeof value.message === 'string' && value.message) ||
    (typeof value.description === 'string' && value.description) ||
    (typeof value.code === 'string' && value.code) ||
    (typeof value.key === 'string' && value.key) ||
    null;
  return label;
}

export function admissionNextActionCode(value: AdmissionNextAction): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  return (
    (typeof value.code === 'string' && value.code) ||
    (typeof value.key === 'string' && value.key) ||
    (typeof value.action === 'string' && value.action) ||
    null
  );
}

export function parseOfferRequired(value: unknown, offerState?: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1) return true;
  if (value === 'false' || value === 0) return false;
  const state = parseAdmissionOfferStateV185(offerState);
  if (state === 'not_applicable') return false;
  if (state != null && state !== 'not_applicable') return true;
  return null;
}

export type AdmissionWorkflowFieldsSource = {
  processing_stage?: string | null;
  assessment_progress?: string | null;
  assessment_summary?: AdmissionAssessmentSummary | null;
  offer_required?: boolean | null;
  offer_state?: string | false | null;
  offer_summary?: AdmissionOfferSummary | null;
  registration_readiness?: string | null;
  registration_requirements?: AdmissionRegistrationRequirement[] | null;
  next_action?: AdmissionNextAction;
  state?: string | null;
  registration_status?: string | null;
  readiness?: Record<string, unknown> | null;
  decision?: AdmissionDecision | string | false | null;
  student_id?: number | false | null;
  [key: string]: unknown;
};

/**
 * Resolve processing_stage with Backend priority and legacy fallback.
 * Does not invent assessment_in_progress from local heuristics beyond legacy map.
 */
export function resolveProcessingStage(
  source: AdmissionWorkflowFieldsSource,
): AdmissionProcessingStage | null {
  const fromBackend = parseAdmissionProcessingStage(source.processing_stage);
  if (fromBackend) return fromBackend;
  return parseAdmissionProcessingStage(source.state);
}

export function resolveAssessmentProgress(
  source: AdmissionWorkflowFieldsSource,
): AdmissionAssessmentProgress | null {
  const fromBackend = parseAdmissionAssessmentProgress(source.assessment_progress);
  if (fromBackend) return fromBackend;
  const summaryProgress = parseAdmissionAssessmentProgress(
    source.assessment_summary?.progress,
  );
  if (summaryProgress) return summaryProgress;
  return null;
}

export function resolveRegistrationReadiness(
  source: AdmissionWorkflowFieldsSource,
): AdmissionRegistrationReadiness | null {
  const fromBackend = parseAdmissionRegistrationReadiness(
    source.registration_readiness,
  );
  if (fromBackend) return fromBackend;

  // Temporary legacy fallback only when Backend omits the field.
  const studentId =
    typeof source.student_id === 'number' && source.student_id > 0
      ? source.student_id
      : null;
  if (studentId != null || source.registration_status === 'registered') {
    return 'registered';
  }
  if (source.registration_status === 'awaiting_registration') {
    const state = String(source.state ?? '');
    // Legacy confirmed = registration-ready after offer acceptance.
    if (state === 'confirmed') return 'ready';
    const offerRequired = parseOfferRequired(source.offer_required, source.offer_state);
    const offer = resolveOfferStateV185(source);
    if (offerRequired === false || offer === 'not_applicable' || offer === 'accepted') {
      return 'ready';
    }
    if (offer === 'sent' || offer === 'pending') {
      return 'awaiting_offer_response';
    }
    if (offer === 'draft') {
      return 'awaiting_offer_creation';
    }
    if (offerRequired === true || offer === 'not_created' || !offer) {
      return 'awaiting_offer_creation';
    }
    return 'ready';
  }
  if (source.registration_status === 'not_applicable') {
    return 'not_applicable';
  }
  return null;
}

export function resolveOfferRequired(source: AdmissionWorkflowFieldsSource): boolean | null {
  const fromField = parseOfferRequired(source.offer_required, source.offer_state);
  if (fromField != null) return fromField;
  const summary = source.offer_summary;
  if (summary) {
    const fromSummary = parseOfferRequired(
      summary.offer_required ?? summary.required,
      summary.offer_state ?? summary.state,
    );
    if (fromSummary != null) return fromSummary;
  }
  return null;
}

export function resolveOfferStateV185(
  source: AdmissionWorkflowFieldsSource,
): string | null {
  const summaryState = parseAdmissionOfferStateV185(
    source.offer_summary?.offer_state ?? source.offer_summary?.state,
  );
  if (summaryState) return summaryState;
  return parseAdmissionOfferStateV185(source.offer_state);
}

export function partitionRegistrationRequirements(
  requirements: AdmissionRegistrationRequirement[] | null | undefined,
): {
  blocking: AdmissionRegistrationRequirement[];
  warning: AdmissionRegistrationRequirement[];
  information: AdmissionRegistrationRequirement[];
} {
  const blocking: AdmissionRegistrationRequirement[] = [];
  const warning: AdmissionRegistrationRequirement[] = [];
  const information: AdmissionRegistrationRequirement[] = [];
  for (const req of requirements ?? []) {
    if (req.severity === 'blocking') blocking.push(req);
    else if (req.severity === 'warning') warning.push(req);
    else information.push(req);
  }
  return { blocking, warning, information };
}

export function processingStageLabelKey(stage: string): string {
  return `admin.admissions.processingStages.${stage}`;
}

export function assessmentProgressLabelKey(progress: string): string {
  return `admin.admissions.assessmentProgress.${progress}`;
}

export function assessmentTypeLabelKey(type: string): string {
  return `admin.admissions.assessmentTypes.${type}`;
}

export function assessmentRecommendationLabelKey(value: string): string {
  return `admin.admissions.assessmentRecommendations.${value}`;
}

export function offerStateV185LabelKey(state: string): string {
  return `admin.admissions.offerStates.${state}`;
}

export function registrationReadinessLabelKey(value: string): string {
  return `admin.admissions.registrationReadiness.${value}`;
}

export function decisionValueOf(
  decision: AdmissionDecision | string | false | null | undefined,
): string | null {
  return normalizeAdmissionDecision(
    typeof decision === 'object' && decision !== null
      ? { decision }
      : { decision },
  )?.decision ?? (typeof decision === 'string' ? decision : null);
}

/** Map legacy list URL state=… into workspace + processing_stage without loops. */
export function mapLegacyListStateParam(state: string | null | undefined): {
  workspace?: 'follow_up' | 'awaiting_decision';
  processingStage?: FollowUpProcessingStage | '';
  clearLegacyState: boolean;
} {
  const raw = String(state ?? '').trim();
  if (!raw) return { clearLegacyState: false };

  if (raw === 'under_review') {
    return { workspace: 'awaiting_decision', clearLegacyState: true };
  }

  const mapped = LEGACY_STATE_TO_PROCESSING_STAGE[raw];
  if (mapped && isFollowUpProcessingStage(mapped)) {
    return {
      workspace: 'follow_up',
      processingStage: mapped,
      clearLegacyState: true,
    };
  }

  if (isFollowUpProcessingStage(raw)) {
    return {
      workspace: 'follow_up',
      processingStage: raw,
      clearLegacyState: true,
    };
  }

  if (isAwaitingDecisionProcessingStage(raw)) {
    return { workspace: 'awaiting_decision', clearLegacyState: true };
  }

  return { clearLegacyState: false };
}
