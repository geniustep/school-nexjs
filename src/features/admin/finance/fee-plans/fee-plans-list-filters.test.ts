import { describe, expect, it } from 'vitest';
import {
  FEE_PLANS_LIST_PAGE_SIZE,
  feePlanMatchesCycle,
  filterFeePlansWorkspaceRows,
  matchesFeePlanWorkspaceSearch,
  paginateFeePlansClient,
} from './fee-plans-list-filters';
import type { FeePlanScopeCycleGroup } from './fee-plan-level-scope';
import type { FeePlan } from '@/types/finance';

const scopeGroups: FeePlanScopeCycleGroup[] = [
  {
    cycle: { id: 1, code: 'primary', name: 'Primary', sequence: 1 },
    levels: [
      { schoolLevelId: 77, name: 'CP', code: 'CP', sequence: 1 },
      { schoolLevelId: 78, name: 'CE1', code: 'CE1', sequence: 2 },
    ],
  },
  {
    cycle: { id: 2, code: 'college', name: 'College', sequence: 2 },
    levels: [{ schoolLevelId: 176, name: 'AC', code: 'AC', sequence: 1 }],
  },
];

function plan(overrides: Partial<FeePlan>): FeePlan {
  return {
    id: 1,
    code: 'PLAN-A',
    name: 'Tuition Plan',
    school_id: 3,
    ...overrides,
  };
}

describe('fee-plans-list-filters', () => {
  it('matches plan name and code case-insensitively', () => {
    const row = plan({ name: 'Contract2 QA Plan', code: 'HTTPA_1' });
    expect(matchesFeePlanWorkspaceSearch(row, 'contract2')).toBe(true);
    expect(matchesFeePlanWorkspaceSearch(row, 'httpa')).toBe(true);
    expect(matchesFeePlanWorkspaceSearch(row, 'nomatch')).toBe(false);
  });

  it('hides archived plans when state filter is empty', () => {
    const rows = filterFeePlansWorkspaceRows(
      [
        plan({ id: 1, state: 'confirmed' }),
        plan({ id: 2, state: 'archived' }),
      ],
      { search: '', stateFilter: '', cycleId: '' },
    );
    expect(rows.map((row) => row.id)).toEqual([1]);
  });

  it('keeps archived plans when state filter targets archived', () => {
    const rows = filterFeePlansWorkspaceRows(
      [plan({ id: 2, state: 'archived' })],
      { search: '', stateFilter: 'archived', cycleId: '' },
    );
    expect(rows.map((row) => row.id)).toEqual([2]);
  });

  it('filters by search after server filters', () => {
    const rows = filterFeePlansWorkspaceRows(
      [
        plan({ id: 1, name: 'Alpha', state: 'draft' }),
        plan({ id: 2, name: 'Beta', state: 'draft' }),
      ],
      { search: 'alpha', stateFilter: 'draft', cycleId: '' },
      scopeGroups,
    );
    expect(rows.map((row) => row.id)).toEqual([1]);
  });

  it('filters by cycle when plan levels overlap cycle scope', () => {
    expect(
      feePlanMatchesCycle(plan({ level_ids: [77] }), '1', scopeGroups),
    ).toBe(true);
    expect(
      feePlanMatchesCycle(plan({ level_ids: [176] }), '1', scopeGroups),
    ).toBe(false);
    const rows = filterFeePlansWorkspaceRows(
      [
        plan({ id: 1, level_ids: [77] }),
        plan({ id: 2, level_ids: [176] }),
      ],
      { search: '', stateFilter: 'draft', cycleId: '1' },
      scopeGroups,
    );
    expect(rows.map((row) => row.id)).toEqual([1]);
  });

  it('keeps plans without explicit level scope when filtering by cycle', () => {
    expect(
      feePlanMatchesCycle(plan({ level_ids: [] }), '1', scopeGroups),
    ).toBe(true);
  });

  it('paginates client-side result windows', () => {
    const all = Array.from({ length: 25 }, (_, index) => plan({ id: index + 1 }));
    const page1 = paginateFeePlansClient(all, 1, FEE_PLANS_LIST_PAGE_SIZE);
    const page2 = paginateFeePlansClient(all, 2, FEE_PLANS_LIST_PAGE_SIZE);
    expect(page1.rows).toHaveLength(20);
    expect(page2.rows).toHaveLength(5);
    expect(page2.pagination).toEqual({ page: 2, total_pages: 2, total: 25 });
  });
});
