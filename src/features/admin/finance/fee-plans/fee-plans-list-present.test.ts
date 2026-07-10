import { describe, expect, it } from 'vitest';
import type { FeePlan } from '@/types/finance';
import {
  FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE,
  FEE_PLANS_LIST_PAGE_SIZE,
  feePlansListHasActiveQuery,
  resolveFeePlanListState,
  resolveFeePlanListUsageCount,
  resolveFeePlansListEmptyVariant,
  resolveFeePlansResultContext,
} from '@/features/admin/finance/fee-plans/fee-plans-list-present';

function plan(overrides: Partial<FeePlan> = {}): FeePlan {
  return {
    id: 1,
    code: 'P1',
    name: 'Plan',
    school_id: 3,
    state: 'confirmed',
    ...overrides,
  };
}

describe('fee-plans-list-present', () => {
  it('maps page size and client window constants', () => {
    expect(FEE_PLANS_LIST_PAGE_SIZE).toBe(20);
    expect(FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE).toBe(100);
  });

  it('detects active filter/query state', () => {
    expect(
      feePlansListHasActiveQuery({
        search: '',
        yearId: '',
        cycleId: '',
        levelId: '',
        stateFilter: '',
      }),
    ).toBe(false);
    expect(
      feePlansListHasActiveQuery({
        search: '  tuition  ',
        yearId: '',
        cycleId: '',
        levelId: '',
        stateFilter: '',
      }),
    ).toBe(true);
    expect(
      feePlansListHasActiveQuery({
        search: '',
        yearId: '1',
        cycleId: '',
        levelId: '',
        stateFilter: '',
      }),
    ).toBe(true);
    expect(
      feePlansListHasActiveQuery({
        search: '',
        yearId: '',
        cycleId: '2',
        levelId: '',
        stateFilter: 'draft',
      }),
    ).toBe(true);
  });

  it('separates no-data from no-match', () => {
    expect(resolveFeePlansListEmptyVariant({ hasActiveQuery: false })).toBe('no-data');
    expect(resolveFeePlansListEmptyVariant({ hasActiveQuery: true })).toBe('no-match');
  });

  it('presents plan state without inventing semantics', () => {
    expect(resolveFeePlanListState(plan({ state: 'draft' }))).toBe('draft');
    expect(resolveFeePlanListState(plan({ state: 'confirmed' }))).toBe('confirmed');
    expect(resolveFeePlanListState(plan({ state: 'archived' }))).toBe('archived');
  });

  it('presents usage count only when API provides it', () => {
    expect(resolveFeePlanListUsageCount(plan())).toBeNull();
    expect(
      resolveFeePlanListUsageCount(
        plan({ usage: { assigned_student_count: 12, is_used: true } }),
      ),
    ).toBe(12);
    expect(
      resolveFeePlanListUsageCount(plan({ usage_summary: { student_count: 3 } })),
    ).toBe(3);
  });

  it('resolves result count with client-window semantics', () => {
    const server = resolveFeePlansResultContext({
      filters: { search: '', cycleId: '' },
      filteredTotal: 18,
      serverTotal: 42,
    });
    expect(server).toEqual({
      total: 42,
      clientWindowActive: false,
      clientWindowLimit: 100,
      pageSize: 20,
    });

    const client = resolveFeePlansResultContext({
      filters: { search: 'plan', cycleId: '' },
      filteredTotal: 7,
      serverTotal: 42,
    });
    expect(client.clientWindowActive).toBe(true);
    expect(client.total).toBe(7);
    expect(client.clientWindowLimit).toBe(FEE_PLANS_CLIENT_SEARCH_FETCH_SIZE);
  });
});
