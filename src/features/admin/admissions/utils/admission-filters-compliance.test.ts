/**
 * Targeted admissions filters compliance matrix tests.
 * TEMPORARY_TEST_DATA: fictional Arabic names used in fixtures only.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  APPLICATION_STATUS_VALUES,
  applyHideConvertedStatuses,
  formatApplicationStatusParam,
  statusesForWorkspace,
} from './admission-modern-status';
import {
  FOLLOW_UP_WORKSPACE_STATES,
  applyWorkspaceChange,
  buildAdmissionListServerQuery,
  buildAdmissionWorkspaceQuery,
  buildKanbanWorkspaceExtraQuery,
  parseWorkspaceListStateFromSearchParams,
  resolveWorkspaceApplicationStatuses,
  workspaceListStateToSearchParams,
  type AdmissionWorkspaceListState,
} from './admission-workspace';
import { filterAdmissionListItems } from './filter-admission-list-items';
import type { AdmissionListItem } from '@/types/admission';

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

const TEMPORARY_TEST_DATA: Array<{
  name: string;
  application_status: (typeof APPLICATION_STATUS_VALUES)[number];
}> = [
  { name: 'سلمى العلمي', application_status: 'new' },
  { name: 'ياسين أمين', application_status: 'follow_up' },
  { name: 'مريم العلوي', application_status: 'in_assessment' },
  { name: 'آدم السالمي', application_status: 'decision_pending' },
  { name: 'هند القاسمي', application_status: 'waitlisted' },
  { name: 'نور الدين', application_status: 'accepted' },
  { name: 'ليلى الهاشمي', application_status: 'ready_for_registration' },
  { name: 'كريم البلوي', application_status: 'registered' },
  { name: 'سارة المنصوري', application_status: 'rejected' },
  { name: 'زياد الإدريسي', application_status: 'closed' },
];

function fixtureItem(
  id: number,
  name: string,
  application_status: string,
): AdmissionListItem {
  return {
    id,
    student_name: name,
    guardian_name: null,
    guardian_phone: null,
    source: null,
    requested_level: null,
    state: 'new',
    application_status,
    next_action: null,
    next_action_date: null,
    duplicate_count: 0,
    offer_state: null,
    assigned_user: null,
    priority: null,
    student_id: application_status === 'registered' ? 9000 + id : false,
  } as AdmissionListItem;
}

describe('admissions filters compliance matrix', () => {
  it('A. inventory — workspace query keys are documented and free of legacy status drivers', () => {
    const follow = buildAdmissionListServerQuery(baseState({ search: 'سلمى', page: 2 }));
    expect(Object.keys(follow).sort()).toEqual([
      'hide_registered',
      'page',
      'search',
      'workspace',
    ]);
    for (const forbidden of [
      'state',
      'processing_stage',
      'registration_readiness',
      'decision',
      'registration_flow_state',
    ]) {
      expect(follow).not.toHaveProperty(forbidden);
    }
  });

  it('B. each official application_status can be requested alone', () => {
    for (const status of APPLICATION_STATUS_VALUES) {
      let state = baseState();
      if (statusesForWorkspace('follow_up').includes(status)) {
        state = baseState({ followStage: status as 'new' });
      } else if (statusesForWorkspace('awaiting_decision').includes(status)) {
        state = baseState({
          workspace: 'awaiting_decision',
          awaitingSub: status as 'decision_pending',
        });
      } else if (status === 'accepted') {
        state = baseState({ workspace: 'post_acceptance', postSub: 'awaiting' });
      } else if (status === 'ready_for_registration') {
        state = baseState({ workspace: 'post_acceptance', postSub: 'ready' });
      } else if (status === 'registered') {
        state = baseState({
          workspace: 'post_acceptance',
          postSub: 'registered',
          hideConverted: false,
        });
      } else if (status === 'rejected') {
        state = baseState({ workspace: 'closed', closedSub: 'rejected' });
      } else if (status === 'closed') {
        state = baseState({ workspace: 'closed', closedSub: 'closed' });
      }
      expect(buildAdmissionWorkspaceQuery(state).query.application_status).toBe(status);
    }
  });

  it('C. workspaces map without status duplication across workspaces', () => {
    const buckets = ADMISSION_WORKSPACES_STATUSES();
    const seen = new Set<string>();
    for (const statuses of Object.values(buckets)) {
      for (const status of statuses) {
        expect(seen.has(status)).toBe(false);
        seen.add(status);
      }
    }
    expect(seen.has('waitlisted')).toBe(true);
    expect(buckets.follow_up).toEqual(['new', 'follow_up', 'in_assessment']);
    expect(buckets.closed).toContain('registered');
  });

  it('C. workspace change resets page and preserves independent filters', () => {
    const next = applyWorkspaceChange(
      baseState({ page: 5, search: 'مريم', academicYearId: '3' }),
      'awaiting_decision',
    );
    expect(next.page).toBe(1);
    expect(next.search).toBe('مريم');
    expect(next.academicYearId).toBe('3');
    expect(next.workspace).toBe('awaiting_decision');
  });

  it('D. hideConverted drops only registered from server statuses', () => {
    expect(applyHideConvertedStatuses(['accepted', 'registered'], true)).toEqual([
      'accepted',
    ]);
    expect(
      applyHideConvertedStatuses(['ready_for_registration', 'registered'], true),
    ).toEqual(['ready_for_registration']);
    expect(
      buildAdmissionWorkspaceQuery(
        baseState({ workspace: 'closed', closedSub: 'closed', hideConverted: true }),
      ).query.application_status,
    ).toBe('closed');
  });

  it('E. closed closedSub never sends state=', () => {
    const closed = buildAdmissionWorkspaceQuery(
      baseState({ workspace: 'closed', closedSub: 'closed' }),
    ).query;
    expect(closed.application_status).toBe('closed');
    expect(closed).not.toHaveProperty('state');
    const rejected = buildAdmissionWorkspaceQuery(
      baseState({ workspace: 'closed', closedSub: 'rejected' }),
    ).query;
    expect(rejected).toEqual({ application_status: 'rejected' });
  });

  it('F. search trims and AND-combines with workspace status', () => {
    const q = buildAdmissionListServerQuery(
      baseState({ search: '  ياسين أمين  ', followStage: 'follow_up', page: 4 }),
    );
    expect(q.search).toBe('ياسين أمين');
    expect(q.workspace).toBe('follow_up');
    expect(q.application_status).toBe('follow_up');
    expect(q.page).toBe(4);
  });

  it('G. structured filters serialize independently in URL', () => {
    const state = baseState({
      search: 'آدم',
      academicYearId: '1',
      cycleCode: 'primary',
      levelId: '9',
      sourceId: '4',
      page: 2,
      view: 'table',
    });
    const params = workspaceListStateToSearchParams(state);
    expect(params.get('q')).toBe('آدم');
    expect(params.get('year')).toBe('1');
    expect(params.get('cycle')).toBe('primary');
    expect(params.get('level')).toBe('9');
    expect(params.get('source')).toBe('4');
    expect(params.get('page')).toBe('2');
    expect(params.get('view')).toBe('table');
    const restored = parseWorkspaceListStateFromSearchParams(params);
    expect(restored.search).toBe('آدم');
    expect(restored.cycleCode).toBe('primary');
    expect(restored.levelId).toBe('9');
  });

  it('H. invalid academic URL values do not invent filters', () => {
    const restored = parseWorkspaceListStateFromSearchParams(
      new URLSearchParams('cycle=&level=not-a-number&source='),
    );
    expect(restored.cycleCode).toBeFalsy();
    expect(restored.levelId).toBe('not-a-number');
  });

  it('I. show_registered is the only non-default hideConverted URL chip signal', () => {
    const hidden = workspaceListStateToSearchParams(baseState());
    expect(hidden.get('show_registered')).toBeNull();
    const shown = workspaceListStateToSearchParams(baseState({ hideConverted: false }));
    expect(shown.get('show_registered')).toBe('1');
  });

  it('J. page stays authoritative from list query (filter changes pass page:1 from UI)', () => {
    expect(buildAdmissionListServerQuery(baseState({ page: 1 })).page).toBe(1);
    expect(buildAdmissionListServerQuery(baseState({ page: 7 })).page).toBe(7);
  });

  it('K. Temporary fixtures distinguish registered from ready/accepted for empty filters', () => {
    const items = TEMPORARY_TEST_DATA.map((row, i) =>
      fixtureItem(i + 1, row.name, row.application_status),
    );
    const visible = filterAdmissionListItems(items, true);
    expect(visible.some((i) => i.application_status === 'registered')).toBe(false);
    expect(visible.some((i) => i.student_name === 'ليلى الهاشمي')).toBe(true);
    expect(visible.some((i) => i.student_name === 'كريم البلوي')).toBe(false);
  });

  it('L. kanban extra query shares context filters without status', () => {
    const extra = buildKanbanWorkspaceExtraQuery(
      baseState({
        academicYearId: '2',
        cycleCode: 'primary',
        levelId: '8',
        sourceId: '3',
        followStage: 'new',
      }),
    );
    expect(extra.academic_year_id).toBe(2);
    expect(extra.requested_cycle_code).toBe('primary');
    expect(extra).not.toHaveProperty('application_status');
    expect(extra).not.toHaveProperty('processing_stage');
  });

  it('M. URL round-trip for status-nav statuses (no workspace bands)', () => {
    for (const statusFilter of [
      '',
      'new',
      'accepted',
      'ready_for_registration',
      'rejected',
    ] as const) {
      const state = baseState({
        statusFilter,
        view: statusFilter ? 'table' : 'kanban',
      });
      const params = workspaceListStateToSearchParams(state);
      const restored = parseWorkspaceListStateFromSearchParams(params);
      expect(restored.statusFilter).toBe(statusFilter);
      expect(params.get('workspace')).toBeNull();
      expect(params.get('postSub')).toBeNull();
      expect(params.get('processing_stage')).toBeNull();
      expect(params.get('state')).toBeNull();
      expect(params.get('decision')).toBeNull();
      if (statusFilter) {
        expect(params.get('application_status')).toBe(statusFilter);
      } else {
        expect(params.get('application_status')).toBeNull();
      }
    }
  });

  it('N. legacy protections — list page and kanban source keep contracts', () => {
    const listPage = readFileSync(
      resolve(process.cwd(), 'src/features/admin/admissions/components/admissions-list-page.tsx'),
      'utf8',
    );
    const kanbanHook = readFileSync(
      resolve(
        process.cwd(),
        'src/features/admin/admissions/hooks/use-admissions-kanban-board.ts',
      ),
      'utf8',
    );
    expect(listPage).toContain('allowDrag');
    expect(listPage).not.toContain('attention_level');
    expect(kanbanHook).toContain('application_status: state');
    expect(kanbanHook).not.toContain('processing_stage: state');
    expect(FOLLOW_UP_WORKSPACE_STATES).toEqual(['new', 'follow_up', 'in_assessment']);
    expect(formatApplicationStatusParam(resolveWorkspaceApplicationStatuses(baseState()))).toBe(
      'new,follow_up,in_assessment',
    );
    expect(buildAdmissionWorkspaceQuery(baseState()).query.application_status).toBeUndefined();
  });
});

function ADMISSION_WORKSPACES_STATUSES() {
  return {
    follow_up: statusesForWorkspace('follow_up'),
    awaiting_decision: statusesForWorkspace('awaiting_decision'),
    post_acceptance: statusesForWorkspace('post_acceptance'),
    closed: statusesForWorkspace('closed'),
  };
}
