import { describe, expect, it } from 'vitest';
import type { LevelOptionsPayload } from '@/types/academic-levels';
import {
  buildFeePlanScopeGroups,
  dedupeLevelIds,
  formatFeePlanLevelScopeSummary,
  getCycleCheckState,
  normalizeFeePlanLevelIds,
  reconcileLevelIdsWithGroups,
  resolveFeePlanLevelErrorCode,
  feePlanLevelErrorMessageKey,
  sortLevelIdsByGroups,
  toggleCycleSelection,
  toggleLevelSelection,
} from './fee-plan-level-scope';

const labels = {
  selectLevels: 'Select levels',
  allInCycle: (cycle: string) => `${cycle}: all levels`,
  compact: (cycles: number, count: number) => `${cycles} cycles · ${count} levels`,
  noScope: 'No scope',
};

function sampleOptions(): LevelOptionsPayload {
  return {
    cycles: [
      { id: 2, code: 'primary', name: 'Primary', sequence: 20 },
      { id: 4, code: 'high_school', name: 'High school', sequence: 40 },
    ],
    reference_levels: [
      {
        id: 4,
        code: 'P1',
        name: 'First primary',
        sequence: 10,
        active: true,
        supports_tracks: false,
        cycle: { id: 2, code: 'primary', name: 'Primary', sequence: 20 },
        enabled: true,
        school_level_id: 77,
        link_status: 'enabled',
        can_enable: false,
      },
      {
        id: 5,
        code: 'P2',
        name: 'Second primary',
        sequence: 20,
        active: true,
        supports_tracks: false,
        cycle: { id: 2, code: 'primary', name: 'Primary', sequence: 20 },
        enabled: true,
        school_level_id: 2442,
        link_status: 'enabled',
        can_enable: false,
      },
      {
        id: 14,
        code: '1BAC',
        name: 'First bac',
        sequence: 20,
        active: true,
        supports_tracks: false,
        cycle: { id: 4, code: 'high_school', name: 'High school', sequence: 40 },
        enabled: true,
        school_level_id: 2449,
        link_status: 'enabled',
        can_enable: false,
      },
      {
        id: 99,
        code: 'DISABLED',
        name: 'Disabled',
        sequence: 99,
        active: true,
        supports_tracks: false,
        cycle: { id: 2, code: 'primary', name: 'Primary', sequence: 20 },
        enabled: false,
        school_level_id: 9999,
        link_status: 'not_enabled',
        can_enable: true,
      },
    ],
    permissions: { can_enable: false },
  };
}

describe('fee plan level scope', () => {
  const groups = buildFeePlanScopeGroups(sampleOptions());

  it('loads only enabled levels with school_level_id', () => {
    const allIds = groups.flatMap((g) => g.levels.map((l) => l.schoolLevelId));
    expect(allIds).toEqual([77, 2442, 2449]);
  });

  it('groups levels by cycle and respects sequence', () => {
    expect(groups.map((g) => g.cycle.code)).toEqual(['primary', 'high_school']);
    expect(groups[0].levels.map((l) => l.schoolLevelId)).toEqual([77, 2442]);
  });

  it('normalizes level_ids over level_id', () => {
    expect(normalizeFeePlanLevelIds({ level_id: 77, level_ids: [2442, 77] })).toEqual([2442, 77]);
    expect(normalizeFeePlanLevelIds({ level_id: 77 })).toEqual([77]);
    expect(normalizeFeePlanLevelIds({})).toEqual([]);
  });

  it('dedupes level ids', () => {
    expect(dedupeLevelIds([77, 77, 2442])).toEqual([77, 2442]);
  });

  it('selects and clears a full cycle', () => {
    const primary = groups[0];
    let selected = toggleCycleSelection(primary, []);
    expect(selected).toEqual([77, 2442]);
    expect(getCycleCheckState(primary, selected)).toBe('all');
    selected = toggleCycleSelection(primary, selected);
    expect(selected).toEqual([]);
    expect(getCycleCheckState(primary, selected)).toBe('none');
  });

  it('supports partial cycle selection and returns to full', () => {
    const primary = groups[0];
    let selected = toggleLevelSelection(77, []);
    expect(getCycleCheckState(primary, selected)).toBe('partial');
    selected = toggleLevelSelection(2442, selected);
    expect(getCycleCheckState(primary, selected)).toBe('all');
    selected = toggleLevelSelection(77, selected);
    expect(getCycleCheckState(primary, selected)).toBe('partial');
    selected = toggleLevelSelection(77, selected);
    expect(getCycleCheckState(primary, selected)).toBe('all');
  });

  it('supports multiple cycles', () => {
    const selected = sortLevelIdsByGroups([2449, 77, 2442], groups);
    expect(selected).toEqual([77, 2442, 2449]);
  });

  it('reconciles invalid ids when school changes', () => {
    const reconciled = reconcileLevelIdsWithGroups([77, 9999, 2449], groups);
    expect(reconciled).toEqual([77, 2449]);
  });

  it('formats summary for full and partial cycles', () => {
    const allPrimary = formatFeePlanLevelScopeSummary(groups, [77, 2442], labels);
    expect(allPrimary).toBe('Primary: all levels');
    const mixed = formatFeePlanLevelScopeSummary(groups, [77, 2442, 2449], labels);
    expect(mixed).toContain('Primary: all levels');
    expect(mixed).toContain('High school: all levels');
  });

  it('maps backend error codes to message keys', () => {
    const code = resolveFeePlanLevelErrorCode('fee_plan_level_scope_required');
    expect(code).toBe('fee_plan_level_scope_required');
    expect(feePlanLevelErrorMessageKey(code!)).toBe(
      'admin.finance.feePlansWorkspace.errors.levelScope.fee_plan_level_scope_required',
    );
  });
});

describe('fee plan level scope payloads', () => {
  it('builds create payload with level_ids only', async () => {
    const { buildCreateFeePlanPayload } = await import('./fee-plan-payload');
    const { createEmptyFeePlanFormValues, newDraftLine } = await import('./fee-plan-types');
    const line = newDraftLine('l1');
    line.feeTypeId = 1;
    line.amount = 100;
    const values = {
      ...createEmptyFeePlanFormValues(),
      name: 'Plan',
      code: 'CODE',
      academicYearId: '1',
      levelIds: [2449, 77],
      lines: [line],
    };
    const groups = buildFeePlanScopeGroups(sampleOptions());
    const payload = buildCreateFeePlanPayload(values, 3, groups);
    expect(payload.level_ids).toEqual([77, 2449]);
    expect((payload as { level_id?: number }).level_id).toBeUndefined();
  });

  it('builds update payload with sorted level_ids', async () => {
    const { buildUpdateFeePlanPayload } = await import('./fee-plan-payload');
    const { createEmptyFeePlanFormValues, newDraftLine } = await import('./fee-plan-types');
    const line = newDraftLine('l1');
    line.feeTypeId = 1;
    line.amount = 100;
    const values = {
      ...createEmptyFeePlanFormValues(),
      name: 'Plan',
      code: 'CODE',
      academicYearId: '1',
      levelIds: [2449, 2442, 77],
      lines: [line],
    };
    const groups = buildFeePlanScopeGroups(sampleOptions());
    const payload = buildUpdateFeePlanPayload(values, groups);
    expect(payload.level_ids).toEqual([77, 2442, 2449]);
  });
});
