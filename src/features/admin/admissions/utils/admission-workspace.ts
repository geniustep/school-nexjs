/**
 * Central admissions list workspace → server query mapping.
 * Uses Odoo GET /admin/admissions?workspace=<value> (server queue before pagination).
 */

import {
  FOLLOW_UP_PROCESSING_STAGES,
  isFollowUpProcessingStage,
  mapLegacyListStateParam,
  type FollowUpProcessingStage,
} from './admission-assessment-workflow-contract';
import { admissionKanbanFetchStages } from './admission-kanban-presentation';

export type AdmissionWorkspace =
  | 'follow_up'
  | 'awaiting_decision'
  | 'post_acceptance'
  | 'closed';

export const ADMISSION_WORKSPACES: AdmissionWorkspace[] = [
  'follow_up',
  'awaiting_decision',
  'post_acceptance',
  'closed',
];

export const ADMISSION_WORKSPACE_COUNT_KEYS = {
  follow_up: 'follow_up_workspace_count',
  awaiting_decision: 'awaiting_decision_workspace_count',
  post_acceptance: 'post_acceptance_workspace_count',
  closed: 'closed_workspace_count',
} as const satisfies Record<AdmissionWorkspace, string>;

/**
 * Follow-up kanban columns / optional AND filter (processing_stage).
 * Legacy aliases contacted/qualified/visit_pending remain accepted via URL mapping.
 */
export const FOLLOW_UP_WORKSPACE_STATES = FOLLOW_UP_PROCESSING_STAGES;

export type FollowUpWorkspaceState = FollowUpProcessingStage;

/** @deprecated Prefer FOLLOW_UP_WORKSPACE_STATES (processing stages). */
export const FOLLOW_UP_LEGACY_STATES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
] as const;

export type PostAcceptanceSubfilter = 'awaiting' | 'ready' | 'registered';

export type ClosedSubfilter = 'rejected' | 'lost' | 'cancelled' | 'duplicate';

/** Empty string = full awaiting_decision queue (no extra AND filter). */
export type AwaitingDecisionSubfilter =
  | ''
  | 'assessment_in_progress'
  | 'decision_ready'
  | 'under_review'
  | 'needs_reassessment'
  | 'waitlisted';

export type AdmissionListViewMode = 'kanban' | 'table';

export type AdmissionWorkspaceListState = {
  workspace: AdmissionWorkspace;
  /** Optional AND processing_stage inside follow_up — never a workspace default. */
  followStage: FollowUpWorkspaceState | '';
  /** Optional AND filter inside awaiting_decision — never defaults to under_review. */
  awaitingSub: AwaitingDecisionSubfilter;
  postSub: PostAcceptanceSubfilter;
  closedSub: ClosedSubfilter;
  /** Advanced filters — only applied when allowed by workspace. */
  stage?: string;
  decision?: string;
  offerState?: string;
  offerRequired?: string;
  assessmentProgress?: string;
  registrationReadiness?: string;
  registrationStatus?: string;
  search?: string;
  academicYearId?: string;
  /**
   * Academic cycle / track code from admissions options (`cycles[].code`).
   * Cascades level options; sent as `requested_cycle_code` when set.
   */
  cycleCode?: string;
  levelId?: string;
  sourceId?: string;
  /**
   * Default true: hide applications already converted to a student.
   * Cleared automatically while postSub=registered.
   */
  hideConverted: boolean;
  page: number;
  view: AdmissionListViewMode;
  /**
   * Ephemeral: view to restore when clearing an operational KPI shortcut.
   * Not synced to the URL.
   */
  resumeView?: AdmissionListViewMode;
};

export type AdmissionWorkspaceQuery = Record<string, string | number>;

export type AdmissionWorkspacePreset = {
  workspace: AdmissionWorkspace;
  query: AdmissionWorkspaceQuery;
  /** Kanban raw state columns (empty → table-only). */
  kanbanColumns: string[];
  kanbanAllowed: boolean;
  defaultView: AdmissionListViewMode;
  serverExpressible: true;
};

export function parseAdmissionWorkspace(
  value: string | null | undefined,
): AdmissionWorkspace {
  if (value && ADMISSION_WORKSPACES.includes(value as AdmissionWorkspace)) {
    return value as AdmissionWorkspace;
  }
  return 'follow_up';
}

export function isValidAdmissionWorkspace(
  value: string | null | undefined,
): value is AdmissionWorkspace {
  return Boolean(value && ADMISSION_WORKSPACES.includes(value as AdmissionWorkspace));
}

export function parseFollowUpWorkspaceState(
  value: string | null | undefined,
): FollowUpWorkspaceState | '' {
  if (!value) return '';
  if (isFollowUpProcessingStage(value)) return value;
  // Legacy URL aliases → processing stages
  if (value === 'contacted' || value === 'visit_pending') return 'initial_follow_up';
  if (value === 'qualified') return 'assessment_ready';
  if (value === 'new') return 'new';
  return '';
}

export function parsePostAcceptanceSubfilter(
  value: string | null | undefined,
): PostAcceptanceSubfilter {
  if (value === 'ready' || value === 'registered' || value === 'awaiting') {
    return value;
  }
  return 'awaiting';
}

export function parseClosedSubfilter(
  value: string | null | undefined,
): ClosedSubfilter {
  if (
    value === 'lost' ||
    value === 'cancelled' ||
    value === 'duplicate' ||
    value === 'rejected'
  ) {
    return value;
  }
  return 'rejected';
}

export function parseAwaitingDecisionSubfilter(
  value: string | null | undefined,
): AwaitingDecisionSubfilter {
  if (
    value === 'assessment_in_progress' ||
    value === 'decision_ready' ||
    value === 'under_review' ||
    value === 'needs_reassessment' ||
    value === 'waitlisted'
  ) {
    return value;
  }
  return '';
}

export function workspaceAllowsKanban(workspace: AdmissionWorkspace): boolean {
  return workspace === 'follow_up' || workspace === 'awaiting_decision';
}

export function workspaceForcesTable(workspace: AdmissionWorkspace): boolean {
  return workspace === 'post_acceptance' || workspace === 'closed';
}

export function resolveWorkspaceView(
  workspace: AdmissionWorkspace,
  preferred: AdmissionListViewMode,
): AdmissionListViewMode {
  if (workspaceForcesTable(workspace)) return 'table';
  if (!workspaceAllowsKanban(workspace)) return 'table';
  return preferred;
}

/** Build the server query for the active workspace + optional AND subfilters. */
export function buildAdmissionWorkspaceQuery(
  state: Pick<
    AdmissionWorkspaceListState,
    | 'workspace'
    | 'followStage'
    | 'awaitingSub'
    | 'postSub'
    | 'closedSub'
    | 'stage'
    | 'decision'
    | 'offerState'
    | 'offerRequired'
    | 'assessmentProgress'
    | 'registrationReadiness'
    | 'registrationStatus'
  >,
): AdmissionWorkspacePreset {
  const advanced = sanitizeAdvancedFilters(state);

  switch (state.workspace) {
    case 'follow_up': {
      const query: AdmissionWorkspaceQuery = {
        workspace: 'follow_up',
        ...advanced,
      };
      const stage = parseFollowUpWorkspaceState(state.followStage);
      if (stage) query.processing_stage = stage;
      return {
        workspace: 'follow_up',
        query,
        // Four presentation columns (assessment stages merged visually).
        kanbanColumns: admissionKanbanFetchStages(),
        kanbanAllowed: true,
        defaultView: 'kanban',
        serverExpressible: true,
      };
    }
    case 'awaiting_decision': {
      const query: AdmissionWorkspaceQuery = {
        workspace: 'awaiting_decision',
        ...advanced,
      };
      const sub = parseAwaitingDecisionSubfilter(state.awaitingSub);
      if (sub === 'assessment_in_progress' || sub === 'decision_ready') {
        query.processing_stage = sub;
      } else if (sub === 'under_review') {
        // Legacy alias — do not invent a processing_stage beyond decision_ready.
        query.processing_stage = 'decision_ready';
      }
      if (sub === 'needs_reassessment') query.decision = 'needs_reassessment';
      if (sub === 'waitlisted') query.decision = 'waitlisted';
      return {
        workspace: 'awaiting_decision',
        query,
        kanbanColumns: admissionKanbanFetchStages(),
        kanbanAllowed: true,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
    case 'post_acceptance': {
      const postSub = parsePostAcceptanceSubfilter(state.postSub);
      const query: AdmissionWorkspaceQuery = {
        workspace: 'post_acceptance',
        ...pickOfferAdvanced(advanced),
      };
      if (postSub === 'ready') {
        query.application_status = 'ready_for_registration';
      } else if (postSub === 'registered') {
        query.application_status = 'registered';
      } else {
        query.application_status = 'accepted';
      }
      return {
        workspace: 'post_acceptance',
        query,
        kanbanColumns: [],
        kanbanAllowed: false,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
    case 'closed': {
      const closedSub = parseClosedSubfilter(state.closedSub);
      const query: AdmissionWorkspaceQuery = {
        workspace: 'closed',
        ...pickOfferAdvanced(advanced),
      };
      if (closedSub === 'rejected') query.application_status = 'rejected';
      else if (closedSub === 'lost' || closedSub === 'cancelled' || closedSub === 'duplicate') {
        query.application_status = 'closed';
        query.state = closedSub;
      } else {
        query.application_status = 'closed';
      }
      return {
        workspace: 'closed',
        query,
        kanbanColumns: [],
        kanbanAllowed: false,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
  }
}

function pickOfferAdvanced(
  advanced: AdmissionWorkspaceQuery,
): AdmissionWorkspaceQuery {
  const out: AdmissionWorkspaceQuery = {};
  if (advanced.offer_state) out.offer_state = advanced.offer_state;
  if (advanced.offer_required != null) out.offer_required = advanced.offer_required;
  if (advanced.registration_readiness) {
    out.registration_readiness = advanced.registration_readiness;
  }
  return out;
}

/** Drop advanced filters that conflict with the active workspace preset. */
export function sanitizeAdvancedFilters(
  state: Pick<
    AdmissionWorkspaceListState,
    | 'workspace'
    | 'stage'
    | 'decision'
    | 'offerState'
    | 'offerRequired'
    | 'assessmentProgress'
    | 'registrationReadiness'
    | 'registrationStatus'
    | 'followStage'
    | 'awaitingSub'
    | 'postSub'
    | 'closedSub'
  >,
): AdmissionWorkspaceQuery {
  const out: AdmissionWorkspaceQuery = {};
  const allowed = getWorkspaceAdvancedFilterAvailability(state.workspace);

  if (allowed.stage && state.stage) {
    if (
      state.workspace === 'follow_up' &&
      (FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes(state.stage)
    ) {
      // Owned by followStage when set.
    } else if (isAdvancedStageAllowed(state.workspace, state.stage)) {
      out.processing_stage = state.stage;
    }
  }

  if (allowed.decision && state.decision) {
    if (state.workspace === 'closed' && state.closedSub === 'rejected') {
      // Owned by closedSub.
    } else if (
      state.workspace === 'awaiting_decision' &&
      (state.awaitingSub === 'needs_reassessment' || state.awaitingSub === 'waitlisted')
    ) {
      // Owned by awaitingSub.
    } else if (!conflictsWithWorkspaceDecision(state.workspace, state.decision)) {
      out.decision = state.decision;
    }
  }

  if (allowed.offerState && state.offerState) {
    out.offer_state = state.offerState;
  }

  if (allowed.offerRequired && state.offerRequired) {
    out.offer_required = state.offerRequired;
  }

  if (allowed.assessmentProgress && state.assessmentProgress) {
    out.assessment_progress = state.assessmentProgress;
  }

  if (allowed.registrationReadiness && state.registrationReadiness) {
    if (
      state.workspace === 'post_acceptance' &&
      (state.postSub === 'ready' || state.postSub === 'registered')
    ) {
      // Owned by postSub (ready → state=confirmed; registered → readiness).
    } else {
      out.registration_readiness = state.registrationReadiness;
    }
  }

  if (allowed.registrationStatus && state.registrationStatus) {
    if (
      state.workspace === 'post_acceptance' &&
      (state.postSub === 'awaiting' ||
        state.postSub === 'ready' ||
        state.postSub === 'registered')
    ) {
      // Owned by postSub.
    } else if (
      !conflictsWithWorkspaceRegistration(state.workspace, state.registrationStatus)
    ) {
      out.registration_status = state.registrationStatus;
    }
  }

  return out;
}

export type AdvancedFilterAvailability = {
  stage: boolean;
  decision: boolean;
  offerState: boolean;
  offerRequired: boolean;
  assessmentProgress: boolean;
  registrationReadiness: boolean;
  registrationStatus: boolean;
  disabledReasonKey?: string;
};

export function getWorkspaceAdvancedFilterAvailability(
  workspace: AdmissionWorkspace,
): AdvancedFilterAvailability {
  switch (workspace) {
    case 'follow_up':
      return {
        stage: true,
        decision: false,
        offerState: false,
        offerRequired: false,
        assessmentProgress: true,
        registrationReadiness: false,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledFollowUp',
      };
    case 'awaiting_decision':
      return {
        stage: true,
        decision: true,
        offerState: false,
        offerRequired: false,
        assessmentProgress: true,
        registrationReadiness: false,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledAwaiting',
      };
    case 'post_acceptance':
      return {
        stage: false,
        decision: false,
        offerState: true,
        offerRequired: true,
        assessmentProgress: false,
        registrationReadiness: true,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledPost',
      };
    case 'closed':
      return {
        stage: false,
        decision: false,
        offerState: true,
        offerRequired: false,
        assessmentProgress: false,
        registrationReadiness: false,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledClosed',
      };
  }
}

function isAdvancedStageAllowed(
  workspace: AdmissionWorkspace,
  stage: string,
): boolean {
  if (workspace === 'follow_up') {
    return (FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes(stage);
  }
  if (workspace === 'awaiting_decision') {
    return (
      stage === 'assessment_in_progress' ||
      stage === 'decision_ready' ||
      stage === 'under_review'
    );
  }
  return false;
}

function conflictsWithWorkspaceDecision(
  workspace: AdmissionWorkspace,
  decision: string,
): boolean {
  if (workspace === 'follow_up') return true;
  if (workspace === 'post_acceptance' && decision === 'rejected') return true;
  return false;
}

function conflictsWithWorkspaceRegistration(
  workspace: AdmissionWorkspace,
  status: string,
): boolean {
  if (workspace === 'follow_up' || workspace === 'awaiting_decision') {
    return status === 'registered' || status === 'awaiting_registration';
  }
  if (workspace === 'closed') return status === 'registered';
  return false;
}

/** Apply workspace change: clear conflicting status filters, reset page. */
export function applyWorkspaceChange(
  prev: AdmissionWorkspaceListState,
  nextWorkspace: AdmissionWorkspace,
): AdmissionWorkspaceListState {
  const preferred =
    prev.resumeView && workspaceAllowsKanban(nextWorkspace)
      ? prev.resumeView
      : prev.view;
  const view = resolveWorkspaceView(nextWorkspace, preferred);
  return {
    ...prev,
    workspace: nextWorkspace,
    page: 1,
    view,
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    stage: undefined,
    decision: undefined,
    offerState: undefined,
    offerRequired: undefined,
    assessmentProgress: undefined,
    registrationReadiness: undefined,
    registrationStatus: undefined,
    resumeView: undefined,
  };
}

export function applyOperationalCard(
  prev: AdmissionWorkspaceListState,
  card: 'awaiting_registration' | 'ready_for_registration' | 'school_rejected',
): AdmissionWorkspaceListState {
  // Re-clicking the active card clears the shortcut and restores the prior view.
  if (resolveActiveOperationalCard(prev) === card) {
    return applyWorkspaceChange(prev, 'follow_up');
  }

  const resumeView =
    prev.resumeView ??
    (workspaceAllowsKanban(prev.workspace) ? prev.view : 'kanban');

  if (card === 'awaiting_registration') {
    return {
      ...applyWorkspaceChange(prev, 'post_acceptance'),
      postSub: 'awaiting',
      hideConverted: true,
      page: 1,
      view: 'table',
      resumeView,
    };
  }
  if (card === 'ready_for_registration') {
    return {
      ...applyWorkspaceChange(prev, 'post_acceptance'),
      postSub: 'ready',
      hideConverted: true,
      page: 1,
      view: 'table',
      resumeView,
    };
  }
  return {
    ...applyWorkspaceChange(prev, 'closed'),
    closedSub: 'rejected',
    page: 1,
    view: 'table',
    resumeView,
  };
}

/** Which operational KPI card is currently reflected by list state (or null). */
export function resolveActiveOperationalCard(
  state: Pick<AdmissionWorkspaceListState, 'workspace' | 'postSub' | 'closedSub'>,
): 'awaiting_registration' | 'ready_for_registration' | 'school_rejected' | null {
  if (state.workspace === 'post_acceptance' && state.postSub === 'awaiting') {
    return 'awaiting_registration';
  }
  if (state.workspace === 'post_acceptance' && state.postSub === 'ready') {
    return 'ready_for_registration';
  }
  if (state.workspace === 'closed' && state.closedSub === 'rejected') {
    return 'school_rejected';
  }
  return null;
}

export function workspaceLabelKey(workspace: AdmissionWorkspace): string {
  return `admin.admissions.workspace.${workspace}`;
}

export function followUpExcludesUnderReview(): boolean {
  return !(FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes('under_review');
}

export function awaitingDecisionExcludesNew(): boolean {
  return true;
}

/** Context filters preserved across workspace changes. */
export function buildContextQuery(state: AdmissionWorkspaceListState): AdmissionWorkspaceQuery {
  const out: AdmissionWorkspaceQuery = {};
  if (state.search?.trim()) out.search = state.search.trim();
  if (state.academicYearId) out.academic_year_id = Number(state.academicYearId) || state.academicYearId;
  // Existing create/edit field — used as list filter when supported by Backend.
  if (state.cycleCode?.trim()) out.requested_cycle_code = state.cycleCode.trim();
  if (state.levelId) out.requested_level_id = Number(state.levelId) || state.levelId;
  if (state.sourceId) out.source_id = Number(state.sourceId) || state.sourceId;
  return out;
}

/**
 * When the selected level no longer belongs to the selected cycle/track, clear it.
 */
export function resetLevelIfIncompatibleWithCycle(
  levelId: string | undefined,
  cycleCode: string | undefined,
  levels: Array<{ id: number; cycle: string }>,
): string | undefined {
  if (!levelId) return undefined;
  if (!cycleCode?.trim()) return levelId;
  const level = levels.find((item) => String(item.id) === levelId);
  if (!level) return undefined;
  return level.cycle === cycleCode.trim() ? levelId : undefined;
}

export function buildAdmissionListServerQuery(
  state: AdmissionWorkspaceListState,
): AdmissionWorkspaceQuery {
  const preset = buildAdmissionWorkspaceQuery(state);
  return {
    ...preset.query,
    ...buildContextQuery(state),
    page: state.page,
  };
}

/**
 * Prefer backend `admission_workspace`. Fallback only for stale payloads —
 * never use for filtering list rows.
 */
export function resolveAdmissionWorkspaceFromRecord(record: {
  admission_workspace?: string | null;
  state?: string | null;
  decision?: string | false | null | { decision?: string | null };
  registration_status?: string | null;
  student_id?: number | false | null;
  is_school_rejected?: boolean | null;
}): AdmissionWorkspace {
  if (isValidAdmissionWorkspace(record.admission_workspace)) {
    return record.admission_workspace;
  }
  return inferAdmissionWorkspaceFallback(record);
}

function decisionValue(
  decision: { decision?: string | null } | string | false | null | undefined,
): string | null {
  if (decision === false || decision == null) return null;
  if (typeof decision === 'string') return decision;
  return decision.decision ?? null;
}

function inferAdmissionWorkspaceFallback(record: {
  state?: string | null;
  decision?: string | false | null | { decision?: string | null };
  registration_status?: string | null;
  student_id?: number | false | null;
  is_school_rejected?: boolean | null;
}): AdmissionWorkspace {
  const state = String(record.state ?? '');
  const decision = decisionValue(record.decision);
  const reg = record.registration_status;
  const rejected = record.is_school_rejected === true || decision === 'rejected';

  if (reg === 'registered' || reg === 'awaiting_registration' || state === 'confirmed') {
    return 'post_acceptance';
  }
  if (
    rejected ||
    state === 'lost' ||
    state === 'cancelled' ||
    state === 'duplicate'
  ) {
    return 'closed';
  }
  if (
    state === 'under_review' ||
    decision === 'needs_reassessment' ||
    decision === 'waitlisted'
  ) {
    return 'awaiting_decision';
  }
  return 'follow_up';
}

export function readAppliedWorkspaceFilter(
  appliedFilters: Record<string, unknown> | null | undefined,
): AdmissionWorkspace | null {
  if (!appliedFilters) return null;
  const value = appliedFilters.workspace;
  return isValidAdmissionWorkspace(String(value ?? '')) ? (value as AdmissionWorkspace) : null;
}

export function parseWorkspaceListStateFromSearchParams(
  params: URLSearchParams,
): AdmissionWorkspaceListState {
  let workspace = parseAdmissionWorkspace(params.get('workspace'));
  const preferredView =
    params.get('view') === 'table' || params.get('view') === 'kanban'
      ? (params.get('view') as AdmissionListViewMode)
      : 'kanban';

  const registration = params.get('registration_status') || params.get('registration');
  const decision = params.get('decision');
  const state = params.get('state');
  const processingStageParam =
    params.get('processing_stage') || params.get('followStage') || '';

  const legacyMap = mapLegacyListStateParam(state);
  if (legacyMap.workspace) {
    workspace = legacyMap.workspace;
  }

  const readinessParam = params.get('registration_readiness');
  const postSubParam = params.get('postSub');
  let postSub = parsePostAcceptanceSubfilter(postSubParam);
  // Prefer explicit postSub; only infer from legacy query params when absent.
  if (!postSubParam) {
    if (registration === 'registered') postSub = 'registered';
    else if (
      workspace === 'post_acceptance' &&
      (state === 'confirmed' || readinessParam === 'ready')
    ) {
      postSub = 'ready';
    } else if (registration === 'awaiting_registration') {
      postSub = 'awaiting';
    }
  }

  const hideConvertedParam = params.get('hide_converted') ?? params.get('show_registered');
  const hideConverted =
    hideConvertedParam === '0' ||
    hideConvertedParam === 'false' ||
    params.get('show_registered') === '1'
      ? false
      : true;

  let closedSub = parseClosedSubfilter(params.get('closedSub'));
  if (decision === 'rejected') closedSub = 'rejected';
  else if (state === 'lost' || state === 'cancelled' || state === 'duplicate') {
    closedSub = state;
  }

  let followStage = parseFollowUpWorkspaceState(
    processingStageParam ||
      (legacyMap.processingStage ?? '') ||
      (workspace === 'follow_up' && !legacyMap.clearLegacyState ? state : ''),
  );

  let awaitingSub = parseAwaitingDecisionSubfilter(params.get('awaitingSub'));
  if (workspace === 'awaiting_decision') {
    if (decision === 'needs_reassessment' || decision === 'waitlisted') {
      awaitingSub = decision;
    } else if (
      processingStageParam === 'assessment_in_progress' ||
      processingStageParam === 'decision_ready'
    ) {
      awaitingSub = processingStageParam;
    } else if (state === 'under_review' || legacyMap.workspace === 'awaiting_decision') {
      // under_review → awaiting_decision without inventing a sub-stage
      awaitingSub = awaitingSub || '';
    }
  }

  return {
    workspace,
    followStage,
    awaitingSub,
    postSub,
    closedSub,
    stage: params.get('stage') || undefined,
    decision:
      workspace === 'closed' && closedSub === 'rejected'
        ? undefined
        : decision || undefined,
    offerState: params.get('offer') || params.get('offer_state') || undefined,
    offerRequired: params.get('offer_required') || undefined,
    assessmentProgress: params.get('assessment_progress') || undefined,
    // Ready is owned by postSub (state=confirmed); do not keep as advanced filter.
    registrationReadiness:
      postSub === 'ready' && readinessParam === 'ready'
        ? undefined
        : readinessParam || undefined,
    registrationStatus: undefined,
    search: params.get('q') || params.get('search') || undefined,
    academicYearId: params.get('year') || params.get('academic_year_id') || undefined,
    cycleCode:
      params.get('cycle') ||
      params.get('track') ||
      params.get('requested_cycle_code') ||
      undefined,
    levelId: params.get('level') || params.get('requested_level_id') || undefined,
    sourceId: params.get('source') || params.get('source_id') || undefined,
    hideConverted,
    page: Math.max(1, Number(params.get('page')) || 1),
    view: resolveWorkspaceView(workspace, preferredView),
  };
}

export function workspaceListStateToSearchParams(
  state: AdmissionWorkspaceListState,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('workspace', state.workspace);

  if (state.workspace === 'post_acceptance') {
    params.set('postSub', state.postSub);
  }
  if (state.workspace === 'closed') {
    params.set('closedSub', state.closedSub);
  }
  if (state.workspace === 'follow_up' && state.followStage) {
    params.set('followStage', state.followStage);
  }
  if (state.workspace === 'awaiting_decision' && state.awaitingSub) {
    params.set('awaitingSub', state.awaitingSub);
  }

  const preset = buildAdmissionWorkspaceQuery(state);
  if (preset.query.processing_stage) {
    params.set('processing_stage', String(preset.query.processing_stage));
  }
  if (preset.query.state) params.set('state', String(preset.query.state));
  if (preset.query.decision) params.set('decision', String(preset.query.decision));
  if (preset.query.registration_status) {
    params.set('registration_status', String(preset.query.registration_status));
  }
  if (preset.query.registration_readiness) {
    params.set('registration_readiness', String(preset.query.registration_readiness));
  }
  if (preset.query.offer_state) params.set('offer_state', String(preset.query.offer_state));
  if (preset.query.offer_required != null) {
    params.set('offer_required', String(preset.query.offer_required));
  }
  if (preset.query.assessment_progress) {
    params.set('assessment_progress', String(preset.query.assessment_progress));
  }

  if (state.search?.trim()) params.set('q', state.search.trim());
  if (state.academicYearId) params.set('year', state.academicYearId);
  if (state.cycleCode?.trim()) params.set('cycle', state.cycleCode.trim());
  if (state.levelId) params.set('level', state.levelId);
  if (state.sourceId) params.set('source', state.sourceId);
  // Default is hide; only persist the non-default (show registered).
  if (state.hideConverted === false) {
    params.set('show_registered', '1');
  }
  if (state.offerState && !preset.query.offer_state) {
    params.set('offer_state', state.offerState);
  }
  if (state.offerRequired && !preset.query.offer_required) {
    params.set('offer_required', state.offerRequired);
  }
  if (state.assessmentProgress && !preset.query.assessment_progress) {
    params.set('assessment_progress', state.assessmentProgress);
  }
  if (state.registrationReadiness && !preset.query.registration_readiness) {
    params.set('registration_readiness', state.registrationReadiness);
  }
  if (state.page > 1) params.set('page', String(state.page));
  if (state.view !== 'kanban' && state.view !== resolveWorkspaceView(state.workspace, 'kanban')) {
    params.set('view', state.view);
  } else if (state.view === 'table' && workspaceAllowsKanban(state.workspace)) {
    params.set('view', 'table');
  }
  return params;
}

export function hasManualContextOrAdvancedFilters(
  state: AdmissionWorkspaceListState,
): boolean {
  return Boolean(
    state.search?.trim() ||
      state.academicYearId ||
      state.cycleCode?.trim() ||
      state.levelId ||
      state.sourceId ||
      state.decision ||
      state.offerState ||
      state.offerRequired ||
      state.assessmentProgress ||
      state.registrationReadiness ||
      state.registrationStatus ||
      state.stage ||
      state.followStage ||
      state.awaitingSub ||
      state.hideConverted === false,
  );
}

/**
 * Extra query for kanban columns: context filters without per-column stage.
 * Omits `workspace` so the four-column pipeline can load assessment + decision
 * stages together (presentation grouping; Backend enums unchanged).
 */
export function buildKanbanWorkspaceExtraQuery(
  state: AdmissionWorkspaceListState,
): AdmissionWorkspaceQuery {
  const full = buildAdmissionListServerQuery(state);
  const out: AdmissionWorkspaceQuery = {};
  for (const [k, v] of Object.entries(full)) {
    if (
      k === 'state' ||
      k === 'processing_stage' ||
      k === 'page' ||
      k === 'search' ||
      k === 'workspace'
    ) {
      continue;
    }
    out[k] = v;
  }
  return out;
}
