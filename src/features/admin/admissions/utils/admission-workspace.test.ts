import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';
import {
  ADMISSION_WORKSPACES,
  ADMISSION_WORKSPACE_COUNT_KEYS,
  FOLLOW_UP_WORKSPACE_STATES,
  applyOperationalCard,
  applyWorkspaceChange,
  awaitingDecisionExcludesNew,
  buildAdmissionListServerQuery,
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  followUpExcludesUnderReview,
  hasManualContextOrAdvancedFilters,
  parseWorkspaceListStateFromSearchParams,
  readAppliedWorkspaceFilter,
  resolveAdmissionWorkspaceFromRecord,
  resolveWorkspaceApplicationStatuses,
  resolveWorkspaceView,
  workspaceForcesTable,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  ADMISSIONS_INFO_INDICATORS,
  ADMISSIONS_OPERATIONAL_CARDS,
} from './admissions-dashboard-cards';
import { APPLICATION_STATUS_VALUES } from './admission-modern-status';

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(__dirname, '../../../../../messages');
function loadMessages(lang: string) {
  return require(path.join(messagesRoot, `${lang}.json`)) as {
    admin: {
      admissions: {
        workspace: Record<string, string>;
        schoolDecision: Record<string, string>;
        states: Record<string, string>;
        applicationStatus: Record<string, string>;
      };
    };
  };
}

const ar = loadMessages('ar');
const en = loadMessages('en');
const fr = loadMessages('fr');
const es = loadMessages('es');

function baseState(
  patch: Partial<AdmissionWorkspaceListState> = {},
): AdmissionWorkspaceListState {
  return {
    workspace: 'follow_up',
    followStage: '',
    awaitingSub: '',
    postSub: 'awaiting',
    closedSub: 'rejected',
    hideConverted: true,
    page: 1,
    view: 'kanban',
    ...patch,
  };
}

describe('workspace server contract queries (application_status)', () => {
  it('follow_up sends workspace aggregation without legacy drivers (multi-status via workspace)', () => {
    const query = buildAdmissionWorkspaceQuery(baseState()).query;
    expect(query).toEqual({ workspace: 'follow_up' });
    expect(query).not.toHaveProperty('application_status');
    expect(query).not.toHaveProperty('state');
    expect(query).not.toHaveProperty('processing_stage');
    expect(query).not.toHaveProperty('decision');
    expect(query).not.toHaveProperty('registration_readiness');
  });

  it('awaiting_decision uses workspace aggregation without processing_stage', () => {
    const query = buildAdmissionWorkspaceQuery(
      baseState({ workspace: 'awaiting_decision' }),
    ).query;
    expect(query).toEqual({
      workspace: 'awaiting_decision',
    });
  });

  it('post_acceptance and closed always include application_status (no workspace widening)', () => {
    expect(
      buildAdmissionWorkspaceQuery(baseState({ workspace: 'post_acceptance' })).query,
    ).toEqual({
      application_status: 'accepted',
    });
    expect(
      buildAdmissionWorkspaceQuery(baseState({ workspace: 'closed' })).query,
    ).toEqual({ application_status: 'rejected' });
  });

  it('follow_up + follow_up status ANDs workspace + application_status', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ followStage: 'follow_up' }),
      ).query,
    ).toEqual({ workspace: 'follow_up', application_status: 'follow_up' });
  });

  it('legacy contacted followStage maps to follow_up application_status', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ followStage: 'contacted' as never }),
      ).query,
    ).toEqual({ workspace: 'follow_up', application_status: 'follow_up' });
  });

  it('awaiting_decision + waitlisted ANDs workspace + application_status', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({
          workspace: 'awaiting_decision',
          awaitingSub: 'waitlisted',
        }),
      ).query,
    ).toEqual({
      workspace: 'awaiting_decision',
      application_status: 'waitlisted',
    });
  });

  it('post_acceptance + registered sends application_status=registered', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'post_acceptance', postSub: 'registered' }),
      ).query,
    ).toEqual({
      application_status: 'registered',
    });
  });

  it('closed + rejected / closed / registered use application_status only', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'closed', closedSub: 'rejected' }),
      ).query,
    ).toEqual({ application_status: 'rejected' });
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'closed', closedSub: 'closed' }),
      ).query,
    ).toEqual({ application_status: 'closed' });
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({
          workspace: 'closed',
          closedSub: 'registered',
          hideConverted: true,
        }),
      ).query,
    ).toEqual({
      application_status: 'registered',
    });
  });

  it('ready and rejected cards send application_status only (no workspace / legacy parity)', () => {
    const ready = applyOperationalCard(
      baseState({ page: 4, academicYearId: '1', search: 'x', levelId: '9' }),
      'ready_for_registration',
    );
    expect(ready.page).toBe(1);
    expect(ready.academicYearId).toBeUndefined();
    expect(ready.search).toBeUndefined();
    expect(ready.levelId).toBeUndefined();
    expect(buildAdmissionWorkspaceQuery(ready).query).toEqual({
      application_status: 'ready_for_registration',
    });
    expect(buildAdmissionWorkspaceQuery(ready).query).not.toHaveProperty('workspace');
    expect(buildAdmissionWorkspaceQuery(ready).query).not.toHaveProperty('state');
    const rejected = applyOperationalCard(baseState({ view: 'kanban', cycleCode: 'primary' }), 'school_rejected');
    expect(rejected.view).toBe('table');
    expect(rejected.cycleCode).toBeUndefined();
    expect(buildAdmissionWorkspaceQuery(rejected).query).toEqual({
      application_status: 'rejected',
    });
  });

  it('awaiting KPI maps to accepted without leftover structured filters', () => {
    const awaiting = applyOperationalCard(
      baseState({ academicYearId: '7', sourceId: '3', page: 2 }),
      'awaiting_registration',
    );
    expect(awaiting.postSub).toBe('awaiting');
    expect(awaiting.academicYearId).toBeUndefined();
    expect(awaiting.sourceId).toBeUndefined();
    expect(buildAdmissionListServerQuery(awaiting)).toEqual({
      application_status: 'accepted',
      hide_registered: 1,
      page: 1,
    });
  });

  it('re-clicking an active operational card clears back to follow_up', () => {
    const ready = applyOperationalCard(baseState(), 'ready_for_registration');
    expect(ready.workspace).toBe('post_acceptance');
    expect(ready.postSub).toBe('ready');
    const cleared = applyOperationalCard(ready, 'ready_for_registration');
    expect(cleared.workspace).toBe('follow_up');
    expect(cleared.postSub).toBe('awaiting');
  });

  it('clearing an operational card restores the previous kanban view', () => {
    const ready = applyOperationalCard(
      baseState({ view: 'kanban' }),
      'ready_for_registration',
    );
    expect(ready.view).toBe('table');
    expect(ready.resumeView).toBe('kanban');
    const cleared = applyOperationalCard(ready, 'ready_for_registration');
    expect(cleared.workspace).toBe('follow_up');
    expect(cleared.view).toBe('kanban');
    expect(cleared.resumeView).toBeUndefined();
  });

  it('clearing an operational card keeps table when that was the prior view', () => {
    const ready = applyOperationalCard(
      baseState({ view: 'table' }),
      'ready_for_registration',
    );
    expect(ready.resumeView).toBe('table');
    const cleared = applyOperationalCard(ready, 'ready_for_registration');
    expect(cleared.view).toBe('table');
  });

  it('kanban extra query omits workspace and application_status', () => {
    const extra = buildKanbanWorkspaceExtraQuery(
      baseState({ followStage: 'new', search: 'x', page: 2 }),
    );
    expect(extra).not.toHaveProperty('workspace');
    expect(extra).not.toHaveProperty('state');
    expect(extra).not.toHaveProperty('processing_stage');
    expect(extra).not.toHaveProperty('application_status');
    expect(extra).not.toHaveProperty('page');
    expect(extra).not.toHaveProperty('search');
  });

  it('list server query keeps page from backend pagination contract', () => {
    const query = buildAdmissionListServerQuery(
      baseState({ workspace: 'post_acceptance', page: 3 }),
    );
    expect(query.page).toBe(3);
    expect(query.application_status).toBe('accepted');
    expect(query).not.toHaveProperty('workspace');
  });

  it('accepted ≠ ready_for_registration ≠ registered', () => {
    expect(resolveWorkspaceApplicationStatuses(baseState({ workspace: 'post_acceptance', postSub: 'awaiting' }))).toEqual([
      'accepted',
    ]);
    expect(resolveWorkspaceApplicationStatuses(baseState({ workspace: 'post_acceptance', postSub: 'ready' }))).toEqual([
      'ready_for_registration',
    ]);
    expect(resolveWorkspaceApplicationStatuses(baseState({ workspace: 'post_acceptance', postSub: 'registered' }))).toEqual([
      'registered',
    ]);
  });

  it('hideConverted never strips ready_for_registration', () => {
    const q = buildAdmissionWorkspaceQuery(
      baseState({
        workspace: 'post_acceptance',
        postSub: 'ready',
        hideConverted: true,
      }),
    ).query;
    expect(q.application_status).toBe('ready_for_registration');
  });
});

describe('admission_workspace field priority', () => {
  it('prefers backend admission_workspace over fallback', () => {
    expect(
      resolveAdmissionWorkspaceFromRecord({
        admission_workspace: 'closed',
        state: 'new',
      }),
    ).toBe('closed');
  });

  it('fallback does not invent filters and keeps family children independent', () => {
    expect(
      resolveAdmissionWorkspaceFromRecord({
        state: 'new',
      }),
    ).toBe('follow_up');
    expect(
      resolveAdmissionWorkspaceFromRecord({
        state: 'under_review',
      }),
    ).toBe('awaiting_decision');
    const childA = resolveAdmissionWorkspaceFromRecord({
      admission_workspace: 'post_acceptance',
      state: 'accepted',
    });
    const childB = resolveAdmissionWorkspaceFromRecord({
      admission_workspace: 'closed',
      state: 'lost',
      decision: 'rejected',
    });
    expect(childA).toBe('post_acceptance');
    expect(childB).toBe('closed');
  });

  it('reads applied_filters.workspace', () => {
    expect(readAppliedWorkspaceFilter({ workspace: 'follow_up' })).toBe('follow_up');
    expect(readAppliedWorkspaceFilter({ workspace: 'nope' })).toBeNull();
  });
});

describe('URL and workspace navigation', () => {
  it('persists workspace in URL and restores context filters', () => {
    const state = baseState({
      workspace: 'post_acceptance',
      postSub: 'registered',
      search: 'sara',
      academicYearId: '12',
      levelId: '3',
      sourceId: '9',
      page: 2,
      view: 'table',
    });
    const params = workspaceListStateToSearchParams(state);
    expect(params.get('workspace')).toBe('post_acceptance');
    expect(params.get('postSub')).toBe('registered');
    expect(params.get('application_status')).toBe('registered');
    expect(params.get('registration_status')).toBeNull();
    expect(params.get('q')).toBe('sara');
    expect(params.get('year')).toBe('12');
    expect(params.get('level')).toBe('3');
    expect(params.get('source')).toBe('9');
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(restored.workspace).toBe('post_acceptance');
    expect(restored.postSub).toBe('registered');
    expect(restored.search).toBe('sara');
    expect(restored.academicYearId).toBe('12');
    expect(restored.levelId).toBe('3');
    expect(restored.sourceId).toBe('9');
  });

  it('ready subfilter round-trips via postSub + application_status', () => {
    const state = baseState({
      workspace: 'post_acceptance',
      postSub: 'ready',
      view: 'table',
    });
    const params = workspaceListStateToSearchParams(state);
    expect(params.get('state')).toBeNull();
    expect(params.get('postSub')).toBe('ready');
    expect(params.get('application_status')).toBe('ready_for_registration');
    expect(params.get('registration_status')).toBeNull();
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(restored.postSub).toBe('ready');
    expect(workspaceListStateToSearchParams(restored).toString()).toBe(params.toString());
  });

  it('legacy registration_readiness=ready URL still restores ready subfilter', () => {
    const params = new URLSearchParams({
      workspace: 'post_acceptance',
      registration_readiness: 'ready',
    });
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(restored.postSub).toBe('ready');
    expect(buildAdmissionWorkspaceQuery(restored).query).toEqual({
      application_status: 'ready_for_registration',
    });
  });

  it('hideConverted defaults on and show_registered URL turns it off', () => {
    expect(parseWorkspaceListStateFromSearchParams(new URLSearchParams()).hideConverted).toBe(
      true,
    );
    const shown = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams({ show_registered: '1' }),
    );
    expect(shown.hideConverted).toBe(false);
    expect(workspaceListStateToSearchParams(shown).get('show_registered')).toBe('1');
  });

  it('changing workspace resets page and clears conflicting filters', () => {
    const next = applyWorkspaceChange(
      baseState({
        page: 4,
        search: 'ali',
        academicYearId: '1',
        levelId: '2',
        sourceId: '3',
        decision: 'rejected',
        followStage: 'follow_up',
      }),
      'closed',
    );
    expect(next.page).toBe(1);
    expect(next.search).toBe('ali');
    expect(next.academicYearId).toBe('1');
    expect(next.levelId).toBe('2');
    expect(next.sourceId).toBe('3');
    expect(next.decision).toBeUndefined();
    expect(next.followStage).toBe('');
    expect(next.view).toBe('table');
  });

  it('does not expose workspace as a manual chip signal', () => {
    expect(hasManualContextOrAdvancedFilters(baseState())).toBe(false);
    expect(hasManualContextOrAdvancedFilters(baseState({ academicYearId: '1' }))).toBe(
      true,
    );
  });

  it('forces table for post_acceptance and closed', () => {
    expect(workspaceForcesTable('closed')).toBe(true);
    expect(resolveWorkspaceView('post_acceptance', 'kanban')).toBe('table');
    expect(resolveWorkspaceView('follow_up', 'kanban')).toBe('kanban');
  });

  it('follow_up excludes under_review; awaiting excludes new', () => {
    expect(followUpExcludesUnderReview()).toBe(true);
    expect(FOLLOW_UP_WORKSPACE_STATES).not.toContain('under_review');
    expect(awaitingDecisionExcludesNew()).toBe(true);
  });

  it('maps legacy lost/cancelled/duplicate to closed application_status', () => {
    for (const legacy of ['lost', 'cancelled', 'duplicate']) {
      const restored = parseWorkspaceListStateFromSearchParams(
        new URLSearchParams({ workspace: 'closed', closedSub: legacy }),
      );
      expect(restored.closedSub).toBe('closed');
      expect(buildAdmissionWorkspaceQuery(restored).query).toEqual({
        application_status: 'closed',
      });
      expect(buildAdmissionWorkspaceQuery(restored).query).not.toHaveProperty('state');
      expect(buildAdmissionWorkspaceQuery(restored).query).not.toHaveProperty('workspace');
    }
  });
});

describe('counters', () => {
  it('uses workspace counters for tabs and outcome counters for cards', () => {
    expect(ADMISSION_WORKSPACE_COUNT_KEYS.follow_up).toBe('follow_up_workspace_count');
    expect(ADMISSION_WORKSPACE_COUNT_KEYS.closed).toBe('closed_workspace_count');
    expect(ADMISSIONS_OPERATIONAL_CARDS).toHaveLength(3);
    expect(ADMISSIONS_OPERATIONAL_CARDS.map((c) => c.countKey)).toEqual([
      'application_status_accepted_count',
      'application_status_ready_for_registration_count',
      'application_status_rejected_count',
    ]);
    expect(ADMISSIONS_INFO_INDICATORS).toHaveLength(4);
    expect(ADMISSION_WORKSPACES).toHaveLength(4);
  });
});

describe('workspace i18n', () => {
  it('has workspace labels and application_status labels in four locales', () => {
    for (const messages of [ar, en, fr, es]) {
      const ws = messages.admin.admissions.workspace;
      for (const key of ADMISSION_WORKSPACES) {
        expect(ws[key]).toBeTruthy();
      }
      expect(ws.advancedFilters).toBeTruthy();
      expect(ws.allInWorkspace).toBeTruthy();
      for (const status of APPLICATION_STATUS_VALUES) {
        expect(messages.admin.admissions.applicationStatus[status]).toBeTruthy();
      }
    }
    expect(ar.admin.admissions.workspace.follow_up).toBe('المتابعة الأولية');
    expect(fr.admin.admissions.workspace.awaiting_decision).toBe(
      'En attente de décision',
    );
  });
});

describe('execution location marker', () => {
  it('runs from the original repository path', () => {
    expect(__dirname.replace(/\\/g, '/')).toContain('/school-nexjs/src/features/admin/admissions/utils');
    expect(__dirname.replace(/\\/g, '/')).not.toContain('admissions-actions-ux');
  });
});
