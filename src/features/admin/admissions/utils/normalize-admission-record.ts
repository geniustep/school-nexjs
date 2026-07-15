import type {
  AdmissionDetail,
  AdmissionListItem,
  AdmissionNextAction,
  AdmissionRegistrationRequirement,
  FamilyBatchApplicationSummary,
  FamilyBatchDetail,
} from '@/types/admission';
import { normalizeAdmissionAllowedActions } from './admission-allowed-actions';
import {
  asAdmissionWorkflowFields,
  normalizeAdmissionAssessmentSummary,
  normalizeAdmissionNextAction,
  normalizeAdmissionOfferSummary,
  normalizeAdmissionRegistrationRequirements,
  parseAdmissionAssessmentProgress,
  parseAdmissionProcessingStage,
  parseAdmissionRegistrationReadiness,
  parseOfferRequired,
  resolveAssessmentProgress,
  resolveOfferRequired,
  resolveProcessingStage,
  resolveRegistrationReadiness,
} from './admission-assessment-workflow-contract';
import {
  normalizeStatusWarnings,
  resolveIsSchoolRejected,
  resolveRegistrationStatus,
} from './admission-status-display';
import { normalizeAdmissionDecision } from './normalize-admission-decision';
import { resolveAdmissionStudentId } from './admission-registration';
import {
  normalizeAllowedReturnTargets,
  normalizeAllowedStatusTargets,
  normalizeModernAllowedActions,
} from './admission-modern-actions';
import {
  normalizeAdmissionRequestedServices,
  normalizeHasRequestedServices,
  normalizeRequestedServiceIds,
} from './admission-requested-services';

function cleanOptionalText(value: unknown): string | null {
  if (value === false || value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function cleanOfferState(value: unknown): string | null {
  return cleanOptionalText(value);
}

function normalizeRequestedServicesFields(raw: Record<string, unknown>): {
  requested_services: ReturnType<typeof normalizeAdmissionRequestedServices>;
  requested_service_ids: number[];
  has_requested_services: boolean;
} {
  const requested_services = normalizeAdmissionRequestedServices(raw.requested_services);
  let requested_service_ids = normalizeRequestedServiceIds(raw.requested_service_ids);
  if (requested_service_ids.length === 0 && requested_services.length > 0) {
    requested_service_ids = requested_services.map((service) => service.id);
  }
  const has_requested_services = normalizeHasRequestedServices(
    raw.has_requested_services,
    requested_services,
    requested_service_ids,
  );
  return { requested_services, requested_service_ids, has_requested_services };
}

/** Shared outcome field normalization for list/detail/family child payloads. */
export function normalizeAdmissionOutcomeFields<T extends Record<string, unknown>>(
  raw: T,
): T & {
  decision: ReturnType<typeof normalizeAdmissionDecision>;
  registration_status: string;
  is_school_rejected: boolean;
  status_warnings: string[];
  offer_state: string | null;
  converted_at: string | null;
  processing_stage: string | null;
  assessment_progress: string | null;
  assessment_summary: ReturnType<typeof normalizeAdmissionAssessmentSummary>;
  offer_required: boolean | null;
  offer_summary: ReturnType<typeof normalizeAdmissionOfferSummary>;
  registration_readiness: string | null;
  registration_requirements: AdmissionRegistrationRequirement[];
  next_action: AdmissionNextAction;
  modern_allowed_actions: ReturnType<typeof normalizeModernAllowedActions>;
  exception_actions: ReturnType<typeof normalizeModernAllowedActions>;
  allowed_return_targets: string[];
  allowed_status_targets: string[];
} {
  const decision = normalizeAdmissionDecision(raw);
  const status_warnings = normalizeStatusWarnings(raw.status_warnings);
  const is_school_rejected =
    raw.is_school_rejected === true ||
    resolveIsSchoolRejected({
      ...raw,
      decision: decision ?? (raw.decision as never),
      rejection: raw.rejection as { is_rejected?: boolean } | null,
    });

  const registration = resolveRegistrationStatus({
    ...raw,
    decision: decision ?? (raw.decision as never),
    is_school_rejected,
    rejection: raw.rejection as { is_rejected?: boolean } | null,
  });

  const assessment_summary = normalizeAdmissionAssessmentSummary(raw.assessment_summary);
  const offer_summary = normalizeAdmissionOfferSummary(raw.offer_summary);
  const registration_requirements = normalizeAdmissionRegistrationRequirements(
    raw.registration_requirements,
  );
  const next_action = normalizeAdmissionNextAction(raw.next_action);
  const modern_allowed_actions = normalizeModernAllowedActions(raw.modern_allowed_actions);
  const exception_actions = normalizeModernAllowedActions(raw.exception_actions);
  const allowed_return_targets = normalizeAllowedReturnTargets(raw.allowed_return_targets);
  const allowed_status_targets = normalizeAllowedStatusTargets(raw.allowed_status_targets);

  const workflowSource = asAdmissionWorkflowFields({
    ...raw,
    assessment_summary,
    offer_summary,
    registration_status: registration.status,
    student_id: raw.student_id,
  });

  const processing_stage =
    parseAdmissionProcessingStage(raw.processing_stage) ??
    resolveProcessingStage(workflowSource);
  const assessment_progress =
    parseAdmissionAssessmentProgress(raw.assessment_progress) ??
    resolveAssessmentProgress(workflowSource);
  const registration_readiness =
    parseAdmissionRegistrationReadiness(raw.registration_readiness) ??
    resolveRegistrationReadiness(workflowSource);
  const offer_required =
    parseOfferRequired(raw.offer_required, raw.offer_state) ??
    resolveOfferRequired(workflowSource);

  return {
    ...raw,
    decision,
    decision_date: decision?.decision_date ?? cleanOptionalText(raw.decision_date),
    decision_notes: decision?.decision_notes ?? cleanOptionalText(raw.decision_notes),
    decision_user: decision?.decision_user ?? (raw.decision_user === false ? null : raw.decision_user),
    registration_status: registration.status,
    is_school_rejected,
    status_warnings,
    offer_state: cleanOfferState(raw.offer_state),
    converted_at: cleanOptionalText(raw.converted_at),
    student_id:
      resolveAdmissionStudentId(raw.student_id) ??
      (raw.student_id === false ? false : raw.student_id),
    processing_stage,
    assessment_progress,
    assessment_summary,
    offer_required,
    offer_summary,
    registration_readiness,
    registration_requirements,
    next_action,
    application_status: cleanOptionalText(raw.application_status),
    last_action: raw.last_action && typeof raw.last_action === 'object' ? raw.last_action : null,
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    primary_next_action: raw.primary_next_action ?? null,
    modern_allowed_actions,
    exception_actions,
    allowed_return_targets,
    allowed_status_targets,
    navigation: raw.navigation && typeof raw.navigation === 'object' ? raw.navigation : null,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : [],
    blocking_reasons: Array.isArray(raw.blocking_reasons) ? raw.blocking_reasons : [],
  };
}

export function normalizeAdmissionListItem(item: AdmissionListItem): AdmissionListItem {
  const raw = item as AdmissionListItem & Record<string, unknown>;
  const normalized = normalizeAdmissionOutcomeFields(raw);
  const requested = normalizeRequestedServicesFields(raw);
  return {
    ...item,
    ...normalized,
    admission_workspace:
      typeof (item as { admission_workspace?: unknown }).admission_workspace === 'string'
        ? (item as { admission_workspace: string }).admission_workspace
        : (item as { admission_workspace?: string | null }).admission_workspace ?? null,
    decision: normalized.decision,
    registration_status: normalized.registration_status as AdmissionListItem['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
    processing_stage: normalized.processing_stage,
    assessment_progress: normalized.assessment_progress,
    assessment_summary: normalized.assessment_summary,
    offer_required: normalized.offer_required,
    offer_summary: normalized.offer_summary,
    registration_readiness: normalized.registration_readiness,
    registration_requirements: normalized.registration_requirements,
    next_action: normalized.next_action,
    application_status: normalized.application_status,
    last_action: normalized.last_action as AdmissionListItem['last_action'],
    timeline: normalized.timeline as AdmissionListItem['timeline'],
    primary_next_action: normalized.primary_next_action as AdmissionListItem['primary_next_action'],
    modern_allowed_actions: normalized.modern_allowed_actions,
    exception_actions: normalized.exception_actions,
    allowed_return_targets: normalized.allowed_return_targets,
    allowed_status_targets: normalized.allowed_status_targets,
    navigation: normalized.navigation as AdmissionListItem['navigation'],
    warnings: normalized.warnings as AdmissionListItem['warnings'],
    blocking_reasons: normalized.blocking_reasons as AdmissionListItem['blocking_reasons'],
    requested_services: requested.requested_services,
    requested_service_ids: requested.requested_service_ids,
    has_requested_services: requested.has_requested_services,
  };
}

export function normalizeAdmissionListItems(items: AdmissionListItem[]): AdmissionListItem[] {
  return items.map(normalizeAdmissionListItem);
}

/** Full detail normalize: decision flattening + allowed_actions map. */
export function normalizeAdmissionDetail(detail: AdmissionDetail): AdmissionDetail {
  const raw = detail as AdmissionDetail & Record<string, unknown>;
  const normalized = normalizeAdmissionOutcomeFields(raw);
  const requested = normalizeRequestedServicesFields(raw);
  return {
    ...detail,
    ...normalized,
    decision: normalized.decision,
    registration_status: normalized.registration_status as AdmissionDetail['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
    processing_stage: normalized.processing_stage,
    assessment_progress: normalized.assessment_progress,
    assessment_summary: normalized.assessment_summary,
    offer_required: normalized.offer_required,
    offer_summary: normalized.offer_summary,
    registration_readiness: normalized.registration_readiness,
    registration_requirements: normalized.registration_requirements,
    next_action: normalized.next_action,
    application_status: normalized.application_status,
    last_action: normalized.last_action as AdmissionDetail['last_action'],
    timeline: normalized.timeline as AdmissionDetail['timeline'],
    primary_next_action: normalized.primary_next_action as AdmissionDetail['primary_next_action'],
    modern_allowed_actions: normalized.modern_allowed_actions,
    exception_actions: normalized.exception_actions,
    allowed_return_targets: normalized.allowed_return_targets,
    allowed_status_targets: normalized.allowed_status_targets,
    navigation: normalized.navigation as AdmissionDetail['navigation'],
    warnings: normalized.warnings as AdmissionDetail['warnings'],
    blocking_reasons: normalized.blocking_reasons as AdmissionDetail['blocking_reasons'],
    requested_services: requested.requested_services,
    requested_service_ids: requested.requested_service_ids,
    has_requested_services: requested.has_requested_services,
    allowed_actions: normalizeAdmissionAllowedActions(
      detail.allowed_actions as Parameters<typeof normalizeAdmissionAllowedActions>[0],
    ),
  };
}

export function normalizeFamilyBatchApplication(
  app: FamilyBatchApplicationSummary,
): FamilyBatchApplicationSummary {
  const normalized = normalizeAdmissionOutcomeFields(
    app as FamilyBatchApplicationSummary & Record<string, unknown>,
  );
  return {
    ...app,
    ...normalized,
    decision: normalized.decision,
    registration_status:
      normalized.registration_status as FamilyBatchApplicationSummary['registration_status'],
    is_school_rejected: normalized.is_school_rejected,
    status_warnings: normalized.status_warnings,
    offer_state: normalized.offer_state,
    converted_at: normalized.converted_at,
    processing_stage: normalized.processing_stage,
    assessment_progress: normalized.assessment_progress,
    assessment_summary: normalized.assessment_summary,
    offer_required: normalized.offer_required,
    offer_summary: normalized.offer_summary,
    registration_readiness: normalized.registration_readiness,
    registration_requirements: normalized.registration_requirements,
    next_action: normalized.next_action,
  };
}

export function normalizeFamilyBatchDetail(detail: FamilyBatchDetail): FamilyBatchDetail {
  return {
    ...detail,
    applications: (detail.applications ?? []).map(normalizeFamilyBatchApplication),
  };
}
