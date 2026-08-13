import { describe, expect, it } from 'vitest';
import { buildAdmissionWorkspaceQuery, buildKanbanWorkspaceExtraQuery, FOLLOW_UP_WORKSPACE_STATES } from './admission-workspace';
import { isRawKanbanDropTarget, rawKanbanColumnClass } from './admission-raw-kanban';
import { boardStartScrollLeft, computeHorizontalScrollMetrics } from './synchronized-horizontal-scroll';
import { evaluateManualStageChange } from './admission-stage-options';
import { baseState } from './admission-assessment-workflow-ux.test-support';

describe('workspaces and kanban', () => {
  it('11-13. status-nav uses application_status kanban columns', () => {
    const all = buildAdmissionWorkspaceQuery(baseState({ statusFilter: '' }));
    expect(all.query.workspace).toBeUndefined();
    expect(all.query.application_status).toBeUndefined();
    expect(all.kanbanColumns).toContain('new');
    expect(all.kanbanColumns).toContain('accepted');
    expect(all.kanbanColumns).toContain('ready_for_registration');
    const follow = buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'follow_up' }));
    expect(follow.query.workspace).toBeUndefined();
    expect(follow.query.application_status).toBe('follow_up');
    expect(follow.kanbanColumns).toEqual(['follow_up']);
    expect(FOLLOW_UP_WORKSPACE_STATES).toEqual(['new', 'follow_up', 'in_assessment']);
    const awaiting = buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'decision_pending' }));
    expect(awaiting.kanbanColumns).toEqual(['decision_pending']);
    expect(awaiting.query.application_status).toBe('decision_pending');
  });

  it('14-15. kanban extra query omits workspace and application_status', () => {
    const extra = buildKanbanWorkspaceExtraQuery(baseState({ statusFilter: 'follow_up' }));
    expect(extra).not.toHaveProperty('workspace');
    expect(extra).not.toHaveProperty('processing_stage');
    expect(extra).not.toHaveProperty('application_status');
    expect(extra).not.toHaveProperty('state');
  });

  it('16-18. dual scroll helpers + multi-select board metrics preserved', () => {
    expect(boardStartScrollLeft(1000, 400, 'rtl')).toBe(600);
    const metrics = computeHorizontalScrollMetrics(100, 1000, 400);
    expect(metrics.overflow).toBe(true);
    expect(metrics.max).toBeGreaterThan(0);
  });

  it('19-22. column colors distinct; drag rules', () => {
    const classes = FOLLOW_UP_WORKSPACE_STATES.map((s) => rawKanbanColumnClass(s));
    expect(new Set(classes).size).toBe(3);
    expect(isRawKanbanDropTarget('in_assessment')).toBe(true);
    expect(isRawKanbanDropTarget('decision_pending')).toBe(true);
    expect(isRawKanbanDropTarget('follow_up')).toBe(true);
    expect(isRawKanbanDropTarget('registered')).toBe(false);
    expect(evaluateManualStageChange({ processing_stage: 'new' }, 'assessment_in_progress').apply).toBe(false);
    expect(evaluateManualStageChange({ processing_stage: 'new' }, 'initial_follow_up').apply).toBe(true);
  });

  it('23-24. status-nav keeps registered and rejected kanban-addressable', () => {
    expect(buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'registered' })).kanbanAllowed).toBe(true);
    expect(buildAdmissionWorkspaceQuery(baseState({ statusFilter: 'rejected' })).kanbanAllowed).toBe(true);
  });
});
