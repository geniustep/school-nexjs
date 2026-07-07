import { describe, expect, it, vi } from 'vitest';
import { runBulkStageChange } from '@/features/admin/admissions/utils/admission-bulk-stage-change';
import { evaluateKanbanDragStateChange } from '@/features/admin/admissions/utils/admission-kanban-drag';

describe('runBulkStageChange', () => {
  it('uses the same mapping as drag transitions', async () => {
    const changeState = vi.fn(async (id: number, state: string) => {
      expect(id).toBe(10);
      expect(state).toBe('contacted');
      return true;
    });

    const result = await runBulkStageChange(
      [{ id: 10, record: { state: 'new' } }],
      'in_follow_up',
      changeState,
    );

    expect(result).toEqual({ succeeded: [10], failed: [], skipped: [] });
    expect(changeState).toHaveBeenCalledTimes(1);
  });

  it('skips same-stage items without PATCH', async () => {
    const changeState = vi.fn(async () => true);

    const result = await runBulkStageChange(
      [{ id: 3, record: { state: 'qualified' } }],
      'in_follow_up',
      changeState,
    );

    expect(result).toEqual({ succeeded: [], failed: [], skipped: [3] });
    expect(changeState).not.toHaveBeenCalled();
  });

  it('keeps failed ids separate from successes', async () => {
    const changeState = vi.fn(async (id: number) => id !== 2);

    const result = await runBulkStageChange(
      [
        { id: 1, record: { state: 'new' } },
        { id: 2, record: { state: 'new' } },
      ],
      'in_follow_up',
      changeState,
    );

    expect(result.succeeded).toEqual([1]);
    expect(result.failed).toEqual([2]);
    expect(result.skipped).toEqual([]);
    expect(changeState).toHaveBeenCalledTimes(2);
  });

  it('blocks registered targets consistently with drag helper', () => {
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'registered').reason).toBe(
      'blocked_target',
    );
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'closed').reason).toBe(
      'blocked_target',
    );
  });
});

describe('detail stage transition mapping parity', () => {
  it('does not reset raw state when already in the target UI stage', () => {
    const decision = evaluateKanbanDragStateChange({ state: 'qualified' }, 'in_follow_up');
    expect(decision).toEqual({ apply: false, targetState: null, reason: 'same_stage' });
  });

  it('maps operational UI stages to canonical raw states', async () => {
    const changeState = vi.fn(async (_id, state) => {
      expect(state).toBe('under_review');
      return true;
    });

    await runBulkStageChange(
      [{ id: 7, record: { state: 'contacted' } }],
      'in_evaluation',
      changeState,
    );

    expect(changeState).toHaveBeenCalledOnce();
  });
});
