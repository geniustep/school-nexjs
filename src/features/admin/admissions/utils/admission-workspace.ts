/**
 * Central admissions list workspace → server query mapping.
 * Workspaces are aggregations of official `application_status` values.
 * Modern list filters must not drive results via state / processing_stage /
 * registration_readiness / decision as the primary status contract —
 * except dashboard-count parity AND-filters for operational KPI cards
 * (see appendDashboardCountParityFilters) while Backend ignores
 * `application_status` on list GET.
 */

import { mapLegacyListStateParam } from './admission-assessment-workflow-contract';
import {
  applyHideConvertedStatuses,
  formatApplicationStatusParam,
  isAwaitingApplicationStatus,
  isFollowUpApplicationStatus,
  mapLegacyAwaitingSubToApplicationStatus,
  mapLegacyFollowStageToApplicationStatus,
  statusesForWorkspace,
} from './admission-modern-status';
import { resolveEffectiveHideConverted } from './filter-admission-list-items';

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
 * Follow-up kanban columns / optional AND filter (`application_status`).
 * Legacy processing_stage URL aliases map via parseFollowUpWorkspaceState.
 */
export const FOLLOW_UP_WORKSPACE_STATES = [
  'new',
  'follow_up',
  'in_assessment',
] as const;

export type FollowUpWorkspaceState = (typeof FOLLOW_UP_WORKSPACE_STATES)[number];

/** @deprecated Prefer FOLLOW_UP_WORKSPACE_STATES (application_status). */
export const FOLLOW_UP_LEGACY_STATES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
] as const;

export type PostAcceptanceSubfilter = 'awaiting' | 'ready' | 'registered';

/** Official closed-history application_status subfilters (no legacy `state`). */
export type ClosedSubfilter = 'rejected' | 'closed' | 'registered';

/** Empty string = full awaiting_decision queue (`decision_pending` + `waitlisted`). */
export type AwaitingDecisionSubfilter = '' | 'decision_pending' | 'waitlisted';

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
  const mapped = mapLegacyFollowStageToApplicationStatus(value);
  return isFollowUpApplicationStatus(mapped) ? mapped : '';
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
  if (value === 'rejected' || value === 'closed' || value === 'registered') {
    return value;
  }
  // Legacy `state` subtypes collapse into official `closed` status.
  if (value === 'lost' || value === 'cancelled' || value === 'duplicate') {
    return 'closed';
  }
  return 'rejected';
}

export function parseAwaitingDecisionSubfilter(
  value: string | null | undefined,
): AwaitingDecisionSubfilter {
  const mapped = mapLegacyAwaitingSubToApplicationStatus(value);
  return isAwaitingApplicationStatus(mapped) ? mapped : '';
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

/**
 * Resolve official application_status values for the active workspace + subfilters.
 * Does not apply hideConverted — callers compose with applyHideConvertedStatuses.
 */
export function resolveWorkspaceApplicationStatuses(
  state: Pick<
    AdmissionWorkspaceListState,
    'workspace' | 'followStage' | 'awaitingSub' | 'postSub' | 'closedSub'
  >,
): string[] {
  switch (state.workspace) {
    case 'follow_up': {
      const stage = parseFollowUpWorkspaceState(state.followStage);
      return stage ? [stage] : statusesForWorkspace('follow_up');
    }
    case 'awaiting_decision': {
      const sub = parseAwaitingDecisionSubfilter(state.awaitingSub);
      return sub ? [sub] : statusesForWorkspace('awaiting_decision');
    }
    case 'post_acceptance': {
      const postSub = parsePostAcceptanceSubfilter(state.postSub);
      if (postSub === 'ready') return ['ready_for_registration'];
      if (postSub === 'registered') return ['registered'];
      return ['accepted'];
    }
    case 'closed': {
      const closedSub = parseClosedSubfilter(state.closedSub);
      if (closedSub === 'rejected') return ['rejected'];
      if (closedSub === 'registered') return ['registered'];
      return ['closed'];
    }
  }
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
    | 'hideConverted'
  >,
): AdmissionWorkspacePreset {
  const advanced = sanitizeAdvancedFilters(state);
  const hideConverted = resolveEffectiveHideConverted({
    hideConverted: state.hideConverted,
    workspace: state.workspace,
    postSub: state.postSub,
    closedSub: state.closedSub,
  });
  const statuses = applyHideConvertedStatuses(
    resolveWorkspaceApplicationStatuses(state),
    hideConverted,
  );
  // Single status → explicit application_status.
  // Multiple → workspace aggregation only (no unproven multi-value API).
  const applicationStatus =
    statuses.length === 1 ? formatApplicationStatusParam(statuses) : undefined;

  switch (state.workspace) {
    case 'follow_up': {
      const query: AdmissionWorkspaceQuery = {
        ...advanced,
        // Live Backend honors application_status (school Runtime 1b10a31+).
        // Keep workspace for the follow-up band when no stage is narrowed.
        workspace: 'follow_up',
      };
      if (applicationStatus) query.application_status = applicationStatus;
      return {
        workspace: 'follow_up',
        query,
        kanbanColumns: statuses.length
          ? statuses
          : statusesForWorkspace('follow_up'),
        kanbanAllowed: true,
        defaultView: 'kanban',
        serverExpressible: true,
      };
    }
    case 'awaiting_decision': {
      const query: AdmissionWorkspaceQuery = {
        ...advanced,
        workspace: 'awaiting_decision',
      };
      if (applicationStatus) query.application_status = applicationStatus;
      return {
        workspace: 'awaiting_decision',
        query,
        kanbanColumns: statuses.length
          ? statuses
          : statusesForWorkspace('awaiting_decision'),
        kanbanAllowed: true,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
    case 'post_acceptance': {
      const query: AdmissionWorkspaceQuery = {
        ...pickOfferAdvanced(advanced),
      };
      // Ready / accepted / registered must be status-exact — no workspace widening.
      if (applicationStatus) query.application_status = applicationStatus;
      else query.workspace = 'post_acceptance';
      return {
        workspace: 'post_acceptance',
        query: appendDashboardCountParityFilters(query, state),
        kanbanColumns: [],
        kanbanAllowed: false,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
    case 'closed': {
      const query: AdmissionWorkspaceQuery = {
        ...pickOfferAdvanced(advanced),
      };
      if (applicationStatus) query.application_status = applicationStatus;
      else query.workspace = 'closed';
      return {
        workspace: 'closed',
        query: appendDashboardCountParityFilters(query, state),
        kanbanColumns: [],
        kanbanAllowed: false,
        defaultView: 'table',
        serverExpressible: true,
      };
    }
  }
}

/**
 * Official application_status filters are trusted on current school Runtime
 * (commit 1b10a31+). Do not AND legacy state / registration_status / decision
 * parity params — they diverge from application_status_counts.
 */
export function appendDashboardCountParityFilters(
  query: AdmissionWorkspaceQuery,
  _state: Pick<AdmissionWorkspaceListState, 'workspace' | 'postSub' | 'closedSub'>,
): AdmissionWorkspaceQuery {
  return query;
}

function pickOfferAdvanced(
  advanced: AdmissionWorkspaceQuery,
): AdmissionWorkspaceQuery {
  const out: AdmissionWorkspaceQuery = {};
  if (advanced.offer_state) out.offer_state = advanced.offer_state;
  if (advanced.offer_required != null) out.offer_required = advanced.offer_required;
  return out;
}

/**
 * Drop advanced filters that conflict with the active workspace preset.
 * Never emits legacy status drivers (processing_stage / decision / registration_* /
 * state) — official status is application_status via buildAdmissionWorkspaceQuery.
 */
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

  // Intentionally omit `stage` → processing_stage and `decision` → decision.
  // Status narrowing uses application_status only.

  if (allowed.offerState && state.offerState) {
    out.offer_state = state.offerState;
  }

  if (allowed.offerRequired && state.offerRequired) {
    out.offer_required = state.offerRequired;
  }

  if (allowed.assessmentProgress && state.assessmentProgress) {
    out.assessment_progress = state.assessmentProgress;
  }

  // registration_readiness / registration_status are legacy readiness filters —
  // omit from modern list queries.

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
        stage: false,
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
        stage: false,
        decision: false,
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
        registrationReadiness: false,
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

  // Dashboard KPI counts are school-scoped without structured filters —
  // clear them so list totals can match the card.
  const clearedContext = {
    search: undefined as string | undefined,
    academicYearId: undefined as string | undefined,
    cycleCode: undefined as string | undefined,
    levelId: undefined as string | undefined,
    sourceId: undefined as string | undefined,
  };

  if (card === 'awaiting_registration') {
    return {
      ...applyWorkspaceChange(prev, 'post_acceptance'),
      ...clearedContext,
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
      ...clearedContext,
      postSub: 'ready',
      hideConverted: true,
      page: 1,
      view: 'table',
      resumeView,
    };
  }
  return {
    ...applyWorkspaceChange(prev, 'closed'),
    ...clearedContext,
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'table',
    resumeView,
  };
}

/**
 * Official application_status driven by each operational KPI card.
 * Must stay aligned with buildAdmissionWorkspaceQuery(postSub/closedSub).
 */
export function operationalCardApplicationStatus(
  card: 'awaiting_registration' | 'ready_for_registration' | 'school_rejected',
): 'accepted' | 'ready_for_registration' | 'rejected' {
  if (card === 'awaiting_registration') return 'accepted';
  if (card === 'ready_for_registration') return 'ready_for_registration';
  return 'rejected';
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
  return !(FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes('under_review' as never);
}

export function awaitingDecisionExcludesNew(): boolean {
  return !(statusesForWorkspace('awaiting_decision') as readonly string[]).includes('new');
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
 * Runtime (9553345+) honors hide_registered on list + dashboard workspace counts.
 * Default list/dashboard without the param includes registered (post_acceptance=32).
 * When the UI hide toggle is on, send hide_registered=1 so counts/lists match 14.
 */
export function buildRegisteredVisibilityQuery(
  state: Pick<
    AdmissionWorkspaceListState,
    'hideConverted' | 'workspace' | 'postSub' | 'closedSub'
  >,
): AdmissionWorkspaceQuery {
  if (
    !resolveEffectiveHideConverted({
      hideConverted: state.hideConverted,
      workspace: state.workspace,
      postSub: state.postSub,
      closedSub: state.closedSub,
    })
  ) {
    return {};
  }
  return { hide_registered: 1 };
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
    ...buildRegisteredVisibilityQuery(state),
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
  if (workspace === 'closed') {
    const statusParam = params.get('application_status');
    if (decision === 'rejected' || statusParam === 'rejected') {
      closedSub = 'rejected';
    } else if (
      state === 'lost' ||
      state === 'cancelled' ||
      state === 'duplicate' ||
      statusParam === 'closed'
    ) {
      closedSub = 'closed';
    } else if (statusParam === 'registered') {
      closedSub = 'registered';
    }
  }

  let followStage = parseFollowUpWorkspaceState(
    params.get('followStage') ||
      (workspace === 'follow_up' ? params.get('application_status') : null) ||
      processingStageParam ||
      (legacyMap.processingStage ?? '') ||
      (workspace === 'follow_up' && !legacyMap.clearLegacyState ? state : ''),
  );

  let awaitingSub = parseAwaitingDecisionSubfilter(
    params.get('awaitingSub') ||
      (workspace === 'awaiting_decision' ? params.get('application_status') : null),
  );
  if (workspace === 'awaiting_decision') {
    if (decision === 'needs_reassessment' || decision === 'waitlisted') {
      awaitingSub = parseAwaitingDecisionSubfilter(decision);
    } else if (
      processingStageParam === 'assessment_in_progress' ||
      processingStageParam === 'decision_ready' ||
      processingStageParam === 'under_review'
    ) {
      awaitingSub = parseAwaitingDecisionSubfilter(processingStageParam);
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
  // Persist official status when narrowed (single value) — never legacy status drivers.
  if (
    typeof preset.query.application_status === 'string' &&
    !preset.query.application_status.includes(',')
  ) {
    params.set('application_status', String(preset.query.application_status));
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
 * Context filters for kanban columns. Omits workspace + application_status so
 * each column owns its exact application_status filter (no workspace widening).
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
      k === 'application_status' ||
      k === 'decision' ||
      k === 'registration_status' ||
      k === 'registration_readiness' ||
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
