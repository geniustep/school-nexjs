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
  resolveWorkspaceView,
  workspaceForcesTable,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import {
  ADMISSIONS_INFO_INDICATORS,
  ADMISSIONS_OPERATIONAL_CARDS,
} from './admissions-dashboard-cards';

const require = createRequire(import.meta.url);
const messagesRoot = path.resolve(__dirname, '../../../../../messages');
function loadMessages(lang: string) {
  return require(path.join(messagesRoot, `${lang}.json`)) as {
    admin: {
      admissions: {
        workspace: Record<string, string>;
        schoolDecision: Record<string, string>;
        states: Record<string, string>;
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
    page: 1,
    view: 'kanban',
    ...patch,
  };
}

describe('workspace server contract queries', () => {
  it('follow_up sends workspace without default state', () => {
    const query = buildAdmissionWorkspaceQuery(baseState()).query;
    expect(query).toEqual({ workspace: 'follow_up' });
    expect(query).not.toHaveProperty('state');
  });

  it('awaiting_decision sends workspace without default under_review', () => {
    const query = buildAdmissionWorkspaceQuery(
      baseState({ workspace: 'awaiting_decision' }),
    ).query;
    expect(query).toEqual({ workspace: 'awaiting_decision' });
    expect(query).not.toHaveProperty('state');
  });

  it('post_acceptance and closed always include workspace', () => {
    expect(
      buildAdmissionWorkspaceQuery(baseState({ workspace: 'post_acceptance' })).query,
    ).toEqual({
      workspace: 'post_acceptance',
      registration_status: 'awaiting_registration',
    });
    expect(
      buildAdmissionWorkspaceQuery(baseState({ workspace: 'closed' })).query,
    ).toEqual({ workspace: 'closed', decision: 'rejected' });
  });

  it('follow_up + initial_follow_up sends AND processing_stage', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ followStage: 'initial_follow_up' }),
      ).query,
    ).toEqual({ workspace: 'follow_up', processing_stage: 'initial_follow_up' });
  });

  it('legacy contacted followStage maps to initial_follow_up', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ followStage: 'contacted' as never }),
      ).query,
    ).toEqual({ workspace: 'follow_up', processing_stage: 'initial_follow_up' });
  });

  it('awaiting_decision + needs_reassessment sends AND', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({
          workspace: 'awaiting_decision',
          awaitingSub: 'needs_reassessment',
        }),
      ).query,
    ).toEqual({
      workspace: 'awaiting_decision',
      decision: 'needs_reassessment',
    });
  });

  it('post_acceptance + registered sends AND', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'post_acceptance', postSub: 'registered' }),
      ).query,
    ).toEqual({
      workspace: 'post_acceptance',
      registration_readiness: 'registered',
      registration_status: 'registered',
    });
  });

  it('closed + rejected sends AND', () => {
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'closed', closedSub: 'rejected' }),
      ).query,
    ).toEqual({ workspace: 'closed', decision: 'rejected' });
  });

  it('ready and rejected cards include workspace', () => {
    const ready = applyOperationalCard(baseState(), 'ready_for_registration');
    expect(buildAdmissionWorkspaceQuery(ready).query).toEqual({
      workspace: 'post_acceptance',
      registration_readiness: 'ready',
    });
    const rejected = applyOperationalCard(baseState({ view: 'kanban' }), 'school_rejected');
    expect(rejected.view).toBe('table');
    expect(buildAdmissionWorkspaceQuery(rejected).query).toEqual({
      workspace: 'closed',
      decision: 'rejected',
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

  it('kanban extra query keeps workspace and drops column state', () => {
    const extra = buildKanbanWorkspaceExtraQuery(
      baseState({ followStage: 'new', search: 'x', page: 2 }),
    );
    expect(extra.workspace).toBe('follow_up');
    expect(extra).not.toHaveProperty('state');
    expect(extra).not.toHaveProperty('page');
    expect(extra).not.toHaveProperty('search');
  });

  it('list server query keeps page from backend pagination contract', () => {
    const query = buildAdmissionListServerQuery(
      baseState({ workspace: 'post_acceptance', page: 3 }),
    );
    expect(query.page).toBe(3);
    expect(query.workspace).toBe('post_acceptance');
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
    expect(params.get('registration_status')).toBe('registered');
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

  it('changing workspace resets page and clears conflicting filters', () => {
    const next = applyWorkspaceChange(
      baseState({
        page: 4,
        search: 'ali',
        academicYearId: '1',
        levelId: '2',
        sourceId: '3',
        decision: 'rejected',
        followStage: 'initial_follow_up',
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
});

describe('counters', () => {
  it('uses workspace counters for tabs and outcome counters for cards', () => {
    expect(ADMISSION_WORKSPACE_COUNT_KEYS.follow_up).toBe('follow_up_workspace_count');
    expect(ADMISSION_WORKSPACE_COUNT_KEYS.closed).toBe('closed_workspace_count');
    expect(ADMISSIONS_OPERATIONAL_CARDS).toHaveLength(3);
    expect(ADMISSIONS_OPERATIONAL_CARDS.map((c) => c.countKey)).toEqual([
      'awaiting_registration_count',
      'confirmed_count',
      'school_rejected_count',
    ]);
    expect(ADMISSIONS_INFO_INDICATORS).toHaveLength(4);
    expect(ADMISSION_WORKSPACES).toHaveLength(4);
  });
});

describe('workspace i18n', () => {
  it('has workspace labels in four locales', () => {
    for (const messages of [ar, en, fr, es]) {
      const ws = messages.admin.admissions.workspace;
      for (const key of ADMISSION_WORKSPACES) {
        expect(ws[key]).toBeTruthy();
      }
      expect(ws.advancedFilters).toBeTruthy();
      expect(ws.allInWorkspace).toBeTruthy();
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
