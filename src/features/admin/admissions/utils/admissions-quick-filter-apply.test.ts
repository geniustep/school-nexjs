import { describe, expect, it } from 'vitest';
import {
  applyOutcomeQuickFilter,
  applyStageQuickFilter,
  clearOutcomeChip,
  clearStageChip,
  preserveNonConflictingFilters,
} from './admissions-quick-filter-apply';

describe('admissions quick filter mutual exclusivity', () => {
  const base = {
    stateFilter: 'in_evaluation' as const,
    outcomeFilter: '' as const,
    offerStateFilter: '',
    page: 3,
  };

  it('rejected clears previous stage', () => {
    const next = applyOutcomeQuickFilter(base, 'school_rejected');
    expect(next.stateFilter).toBe('');
    expect(next.outcomeFilter).toBe('school_rejected');
    expect(next.page).toBe(1);
  });

  it('ready clears previous registration outcome and stage', () => {
    const next = applyOutcomeQuickFilter(
      { ...base, outcomeFilter: 'awaiting_registration' },
      'ready_for_registration',
    );
    expect(next.stateFilter).toBe('');
    expect(next.outcomeFilter).toBe('ready_for_registration');
    expect(next.offerStateFilter).toBe('');
  });

  it('awaiting clears previous stage', () => {
    const next = applyOutcomeQuickFilter(base, 'awaiting_registration');
    expect(next.stateFilter).toBe('');
    expect(next.outcomeFilter).toBe('awaiting_registration');
  });

  it('choosing stage clears outcome', () => {
    const next = applyStageQuickFilter(
      { ...base, outcomeFilter: 'school_rejected' },
      'in_evaluation',
    );
    expect(next.outcomeFilter).toBe('');
    expect(next.stateFilter).toBe('in_evaluation');
    expect(next.page).toBe(1);
  });

  it('removing chip resets page to 1', () => {
    expect(clearOutcomeChip({ ...base, outcomeFilter: 'registered', page: 4 }).page).toBe(1);
    expect(clearStageChip({ ...base, page: 5 }).page).toBe(1);
  });

  it('preserves search and view mode', () => {
    expect(preserveNonConflictingFilters({ search: 'sara', view: 'table' })).toEqual({
      search: 'sara',
      view: 'table',
    });
  });
});
