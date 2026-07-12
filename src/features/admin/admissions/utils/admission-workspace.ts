/**
 * Central admissions list workspace → server query mapping.
 * Uses Odoo GET /admin/admissions?workspace=<value> (server queue before pagination).
 */

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

/** Manual follow-up stages available as optional AND filters inside follow_up. */
export const FOLLOW_UP_WORKSPACE_STATES = [
  'new',
  'contacted',
  'qualified',
  'visit_pending',
] as const;

export type FollowUpWorkspaceState = (typeof FOLLOW_UP_WORKSPACE_STATES)[number];

export type PostAcceptanceSubfilter = 'awaiting' | 'ready' | 'registered';

export type ClosedSubfilter = 'rejected' | 'lost' | 'cancelled' | 'duplicate';

/** Empty string = full awaiting_decision queue (no extra AND filter). */
export type AwaitingDecisionSubfilter =
  | ''
  | 'under_review'
  | 'needs_reassessment'
  | 'waitlisted';

export type AdmissionListViewMode = 'kanban' | 'table';

export type AdmissionWorkspaceListState = {
  workspace: AdmissionWorkspace;
  /** Optional AND state inside follow_up — never a workspace default. */
  followStage: FollowUpWorkspaceState | '';
  /** Optional AND filter inside awaiting_decision — never defaults to under_review. */
  awaitingSub: AwaitingDecisionSubfilter;
  postSub: PostAcceptanceSubfilter;
  closedSub: ClosedSubfilter;
  /** Advanced filters — only applied when allowed by workspace. */
  stage?: string;
  decision?: string;
  offerState?: string;
  registrationStatus?: string;
  search?: string;
  academicYearId?: string;
  levelId?: string;
  sourceId?: string;
  page: number;
  view: AdmissionListViewMode;
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
  if (
    value &&
    (FOLLOW_UP_WORKSPACE_STATES as readonly string[]).includes(value)
  ) {
    return value as FollowUpWorkspaceState;
  }
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
      if (stage) query.state = stage;
      return {
        workspace: 'follow_up',
        query,
        kanbanColumns: [...FOLLOW_UP_WORKSPACE_STATES],
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
      if (sub === 'under_review') query.state = 'under_review';
      if (sub === 'needs_reassessment') query.decision = 'needs_reassessment';
      if (sub === 'waitlisted') query.decision = 'waitlisted';
      return {
        workspace: 'awaiting_decision',
        query,
        kanbanColumns: ['under_review'],
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
      if (postSub === 'ready') query.state = 'confirmed';
      else if (postSub === 'registered') query.registration_status = 'registered';
      else query.registration_status = 'awaiting_registration';
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
      if (closedSub === 'rejected') query.decision = 'rejected';
      else query.state = closedSub;
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
      out.state = state.stage;
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

  if (allowed.registrationStatus && state.registrationStatus) {
    if (
      state.workspace === 'post_acceptance' &&
      (state.postSub === 'awaiting' || state.postSub === 'registered')
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
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledFollowUp',
      };
    case 'awaiting_decision':
      return {
        stage: false,
        decision: true,
        offerState: false,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledAwaiting',
      };
    case 'post_acceptance':
      return {
        stage: false,
        decision: false,
        offerState: true,
        registrationStatus: false,
        disabledReasonKey: 'admin.admissions.workspace.filtersDisabledPost',
      };
    case 'closed':
      return {
        stage: false,
        decision: false,
        offerState: true,
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
    return stage === 'under_review';
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
  const view = resolveWorkspaceView(nextWorkspace, prev.view);
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
    registrationStatus: undefined,
  };
}

export function applyOperationalCard(
  prev: AdmissionWorkspaceListState,
  card: 'awaiting_registration' | 'ready_for_registration' | 'school_rejected',
): AdmissionWorkspaceListState {
  if (card === 'awaiting_registration') {
    return {
      ...applyWorkspaceChange(prev, 'post_acceptance'),
      postSub: 'awaiting',
      page: 1,
      view: 'table',
    };
  }
  if (card === 'ready_for_registration') {
    return {
      ...applyWorkspaceChange(prev, 'post_acceptance'),
      postSub: 'ready',
      page: 1,
      view: 'table',
    };
  }
  return {
    ...applyWorkspaceChange(prev, 'closed'),
    closedSub: 'rejected',
    page: 1,
    view: 'table',
  };
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
  if (state.levelId) out.requested_level_id = Number(state.levelId) || state.levelId;
  if (state.sourceId) out.source_id = Number(state.sourceId) || state.sourceId;
  return out;
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
  const workspace = parseAdmissionWorkspace(params.get('workspace'));
  const preferredView =
    params.get('view') === 'table' || params.get('view') === 'kanban'
      ? (params.get('view') as AdmissionListViewMode)
      : 'kanban';

  const registration = params.get('registration_status') || params.get('registration');
  const decision = params.get('decision');
  const state = params.get('state');

  let postSub = parsePostAcceptanceSubfilter(params.get('postSub'));
  if (registration === 'registered') postSub = 'registered';
  else if (registration === 'awaiting_registration') postSub = 'awaiting';
  else if (state === 'confirmed' && workspace === 'post_acceptance') postSub = 'ready';

  let closedSub = parseClosedSubfilter(params.get('closedSub'));
  if (decision === 'rejected') closedSub = 'rejected';
  else if (state === 'lost' || state === 'cancelled' || state === 'duplicate') {
    closedSub = state;
  }

  let followStage = parseFollowUpWorkspaceState(
    params.get('followStage') || (workspace === 'follow_up' ? state : ''),
  );

  let awaitingSub = parseAwaitingDecisionSubfilter(params.get('awaitingSub'));
  if (workspace === 'awaiting_decision') {
    if (decision === 'needs_reassessment' || decision === 'waitlisted') {
      awaitingSub = decision;
    } else if (state === 'under_review') {
      awaitingSub = 'under_review';
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
    registrationStatus: undefined,
    search: params.get('q') || params.get('search') || undefined,
    academicYearId: params.get('year') || params.get('academic_year_id') || undefined,
    levelId: params.get('level') || params.get('requested_level_id') || undefined,
    sourceId: params.get('source') || params.get('source_id') || undefined,
    page: Math.max(1, Number(params.get('page')) || 1),
    view: resolveWorkspaceView(workspace, preferredView),
  };
}

export function workspaceListStateToSearchParams(
  state: AdmissionWorkspaceListState,
): URLSearchParams {
  const params = new URLSearchParams();
  params.set('workspace', state.workspace);

  const preset = buildAdmissionWorkspaceQuery(state);
  if (preset.query.state) params.set('state', String(preset.query.state));
  if (preset.query.decision) params.set('decision', String(preset.query.decision));
  if (preset.query.registration_status) {
    params.set('registration_status', String(preset.query.registration_status));
  }
  if (preset.query.offer_state) params.set('offer_state', String(preset.query.offer_state));

  if (state.search?.trim()) params.set('q', state.search.trim());
  if (state.academicYearId) params.set('year', state.academicYearId);
  if (state.levelId) params.set('level', state.levelId);
  if (state.sourceId) params.set('source', state.sourceId);
  if (state.offerState && !preset.query.offer_state) {
    params.set('offer_state', state.offerState);
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
      state.levelId ||
      state.sourceId ||
      state.decision ||
      state.offerState ||
      state.registrationStatus ||
      state.stage ||
      state.followStage ||
      state.awaitingSub,
  );
}

/** Extra query for kanban columns: workspace (+ context) without per-column state. */
export function buildKanbanWorkspaceExtraQuery(
  state: AdmissionWorkspaceListState,
): AdmissionWorkspaceQuery {
  const full = buildAdmissionListServerQuery(state);
  const out: AdmissionWorkspaceQuery = {};
  for (const [k, v] of Object.entries(full)) {
    if (k === 'state' || k === 'page' || k === 'search') continue;
    out[k] = v;
  }
  return out;
}
