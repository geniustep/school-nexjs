import { describe, expect, it, vi } from 'vitest';
import { runBulkStageChange } from '@/features/admin/admissions/utils/admission-bulk-stage-change';
import { evaluateManualStageChange } from '@/features/admin/admissions/utils/admission-stage-options';
import { evaluateKanbanDragStateChange } from '@/features/admin/admissions/utils/admission-kanban-drag';

describe('runBulkStageChange', () => {
  it('patches processing stages directly', async () => {
    const changeState = vi.fn(async (id: number, state: string) => {
      expect(id).toBe(10);
      expect(state).toBe('initial_follow_up');
      return true;
    });

    const result = await runBulkStageChange(
      [{ id: 10, record: { processing_stage: 'new', state: 'new' } }],
      'initial_follow_up',
      changeState,
    );

    expect(result).toEqual({
      succeeded: [10],
      failed: [],
      skipped: [],
      ineligible: [],
    });
    expect(changeState).toHaveBeenCalledTimes(1);
  });

  it('skips same-stage items without PATCH', async () => {
    const changeState = vi.fn(async () => true);

    const result = await runBulkStageChange(
      [{ id: 3, record: { processing_stage: 'assessment_ready' } }],
      'assessment_ready',
      changeState,
    );

    expect(result).toEqual({
      succeeded: [],
      failed: [],
      skipped: [3],
      ineligible: [],
    });
    expect(changeState).not.toHaveBeenCalled();
  });

  it('keeps failed ids separate from successes', async () => {
    const changeState = vi.fn(async (id: number) => id !== 2);

    const result = await runBulkStageChange(
      [
        { id: 1, record: { processing_stage: 'new' } },
        { id: 2, record: { processing_stage: 'new' } },
      ],
      'initial_follow_up',
      changeState,
    );

    expect(result.succeeded).toEqual([1]);
    expect(result.failed).toEqual([2]);
    expect(result.skipped).toEqual([]);
    expect(result.ineligible).toEqual([]);
    expect(changeState).toHaveBeenCalledTimes(2);
  });

  it('reports ineligible non-manual rows without silent success', async () => {
    const changeState = vi.fn(async () => true);
    const result = await runBulkStageChange(
      [
        { id: 1, record: { state: 'accepted' } },
        { id: 2, record: { state: 'confirmed' } },
      ],
      'assessment_ready',
      changeState,
    );
    expect(changeState).not.toHaveBeenCalled();
    expect(result.ineligible).toEqual([1, 2]);
    expect(result.succeeded).toEqual([]);
  });

  it('blocks registered/closed kanban drop targets', () => {
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'registered').reason).toBe(
      'blocked_target',
    );
    expect(evaluateKanbanDragStateChange({ state: 'new' }, 'closed').reason).toBe(
      'blocked_target',
    );
  });
});

describe('manual stage helper parity', () => {
  it('does not apply when already on target processing stage', () => {
    expect(
      evaluateManualStageChange(
        { processing_stage: 'assessment_ready' },
        'assessment_ready',
      ),
    ).toEqual({
      apply: false,
      targetState: null,
      reason: 'same_state',
    });
  });

  it('maps assessment_ready target without UI-stage indirection', async () => {
    const changeState = vi.fn(async (_id, state) => {
      expect(state).toBe('assessment_ready');
      return true;
    });

    await runBulkStageChange(
      [{ id: 7, record: { processing_stage: 'initial_follow_up' } }],
      'assessment_ready',
      changeState,
    );

    expect(changeState).toHaveBeenCalledOnce();
  });
});
