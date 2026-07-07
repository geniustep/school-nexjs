import { describe, expect, it } from 'vitest';
import {
  evaluateKanbanDragStateChange,
  isAdmissionKanbanDraggable,
  isUiStageDropTarget,
  patchOptimisticAdmissionState,
  resolveKanbanDragTargetState,
  UI_STAGE_DRAG_TARGET_STATE,
} from '@/features/admin/admissions/utils/admission-kanban-drag';

describe('UI stage drag target mapping', () => {
  it('maps operational stages to canonical raw states', () => {
    expect(UI_STAGE_DRAG_TARGET_STATE.new).toBe('new');
    expect(UI_STAGE_DRAG_TARGET_STATE.in_follow_up).toBe('contacted');
    expect(UI_STAGE_DRAG_TARGET_STATE.in_evaluation).toBe('under_review');
    expect(UI_STAGE_DRAG_TARGET_STATE.accepted).toBe('accepted');
    expect(UI_STAGE_DRAG_TARGET_STATE.ready_for_registration).toBe('confirmed');
  });

  it('blocks registered and closed drop targets', () => {
    expect(isUiStageDropTarget('registered')).toBe(false);
    expect(isUiStageDropTarget('closed')).toBe(false);
    expect(resolveKanbanDragTargetState('registered')).toBeNull();
    expect(resolveKanbanDragTargetState('closed')).toBeNull();
  });
});

describe('evaluateKanbanDragStateChange', () => {
  it('allows drag between permitted operational stages', () => {
    const decision = evaluateKanbanDragStateChange({ state: 'new' }, 'in_follow_up');
    expect(decision).toEqual({ apply: true, targetState: 'contacted' });
  });

  it('skips when dropping on the same UI stage', () => {
    const decision = evaluateKanbanDragStateChange({ state: 'qualified' }, 'in_follow_up');
    expect(decision).toEqual({ apply: false, targetState: null, reason: 'same_stage' });
  });

  it('blocks registered items from dragging', () => {
    expect(
      isAdmissionKanbanDraggable({ state: 'confirmed', student_id: 42 }),
    ).toBe(false);
    expect(
      evaluateKanbanDragStateChange(
        { state: 'confirmed', student_id: 42 },
        'accepted',
      ).reason,
    ).toBe('not_draggable');
  });

  it('blocks drop onto registered and closed columns', () => {
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'registered').reason).toBe(
      'blocked_target',
    );
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'closed').reason).toBe(
      'blocked_target',
    );
  });

  it('does not PATCH when target raw state already matches', () => {
    const decision = evaluateKanbanDragStateChange({ state: 'contacted' }, 'in_evaluation');
    expect(decision.apply).toBe(true);
    expect(decision.targetState).toBe('under_review');

    const noop = evaluateKanbanDragStateChange({ state: 'under_review' }, 'in_evaluation');
    expect(noop).toEqual({ apply: false, targetState: null, reason: 'same_stage' });
  });
});

describe('patchOptimisticAdmissionState rollback', () => {
  it('clears optimistic override when API rejects the transition', () => {
    const optimistic = patchOptimisticAdmissionState(new Map(), 12, 'contacted');
    expect(optimistic.get(12)).toBe('contacted');

    const rolledBack = patchOptimisticAdmissionState(optimistic, 12, null);
    expect(rolledBack.has(12)).toBe(false);
  });
});
