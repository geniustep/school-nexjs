import { describe, expect, it } from 'vitest';
import type { EnableLevelResult, ReferenceLevelOption } from '@/types/academic-levels';
import { normalizeLevelOptionsPayload } from '../hooks/use-level-options';
import {
  aggregateEnableResults,
  buildEnablePayload,
  filterReferenceLevels,
  groupReferenceLevelsByCycle,
  isLegacyUnlinkedLevel,
  isReferenceLevelSelectable,
  selectableIdsInCycle,
  sortReferenceLevels,
} from './level-options';

const cyclePrimary = { id: 2, code: 'primary', name: 'Primary', sequence: 20 };
const cyclePreschool = { id: 1, code: 'preschool', name: 'Preschool', sequence: 10 };

function refLevel(
  partial: Partial<ReferenceLevelOption> & Pick<ReferenceLevelOption, 'id' | 'code'>,
): ReferenceLevelOption {
  return {
    name: partial.code,
    display_name: partial.code,
    sequence: partial.id * 10,
    active: true,
    supports_tracks: false,
    cycle: cyclePrimary,
    enabled: false,
    can_enable: true,
    ...partial,
  };
}

describe('normalizeLevelOptionsPayload', () => {
  it('returns null when data missing', () => {
    expect(normalizeLevelOptionsPayload(null)).toBeNull();
    expect(normalizeLevelOptionsPayload(undefined)).toBeNull();
  });

  it('normalizes partial payloads', () => {
    const out = normalizeLevelOptionsPayload({
      reference_levels: [{ id: 1 } as never],
      cycles: [],
      permissions: { can_enable: true },
    });
    expect(out?.reference_levels).toHaveLength(1);
    expect(out?.permissions.can_enable).toBe(true);
  });
});

describe('level-options utils', () => {
  const levels: ReferenceLevelOption[] = [
    refLevel({ id: 2, code: 'P2', cycle: cyclePrimary, sequence: 20 }),
    refLevel({ id: 1, code: 'P1', cycle: cyclePrimary, sequence: 10 }),
    refLevel({ id: 3, code: 'PRE1', cycle: cyclePreschool, sequence: 10 }),
  ];

  it('sorts by cycle then sequence', () => {
    const sorted = sortReferenceLevels(levels);
    expect(sorted.map((l) => l.code)).toEqual(['PRE1', 'P1', 'P2']);
  });

  it('groups by cycle order from cycles list', () => {
    const groups = groupReferenceLevelsByCycle(levels, [cyclePreschool, cyclePrimary]);
    expect(groups.map((g) => g.cycle.code)).toEqual(['preschool', 'primary']);
    expect(groups[1]?.levels.map((l) => l.code)).toEqual(['P1', 'P2']);
  });

  it('filters search and enabled mode', () => {
    const withEnabled = [
      ...levels,
      refLevel({ id: 4, code: 'P3', enabled: true, can_enable: false }),
    ];
    expect(
      filterReferenceLevels(withEnabled, { search: 'p2', mode: 'available' }).map((l) => l.code),
    ).toEqual(['P2']);
    expect(filterReferenceLevels(withEnabled, { mode: 'enabled' })).toHaveLength(1);
  });

  it('excludes enabled from enable payload', () => {
    const list = [
      refLevel({ id: 1, code: 'P1' }),
      refLevel({ id: 2, code: 'P2', enabled: true, can_enable: false }),
    ];
    expect(buildEnablePayload([1, 2], list)).toEqual([1]);
  });

  it('aggregates enable results', () => {
    const results: EnableLevelResult[] = [
      {
        reference_level_id: 1,
        status: 'enabled',
        school_level: { id: 50, name: 'P1', code: 'P1', supports_tracks: false },
      },
      { reference_level_id: 2, status: 'already_enabled' },
      {
        reference_level_id: 3,
        status: 'failed',
        error: { code: 'reference_level_inactive', message: 'inactive' },
      },
    ];
    const outcome = aggregateEnableResults(results);
    expect(outcome.enabledCount).toBe(1);
    expect(outcome.alreadyEnabledCount).toBe(1);
    expect(outcome.failedCount).toBe(1);
    expect(outcome.partialSuccess).toBe(true);
    expect(outcome.newSchoolLevelIds).toEqual([50]);
  });

  it('selectableIdsInCycle skips enabled levels', () => {
    const list = [
      refLevel({ id: 1, code: 'P1', cycle: cyclePrimary }),
      refLevel({ id: 2, code: 'P2', cycle: cyclePrimary, enabled: true, can_enable: false }),
    ];
    expect(selectableIdsInCycle(list, cyclePrimary.id)).toEqual([1]);
    expect(isReferenceLevelSelectable(list[1]!)).toBe(false);
  });

  it('blocks legacy unlinked levels from enable selection', () => {
    const schoolLevels = [{ id: 77, name: 'P1', code: 'P1', ref_level_id: null }];
    const p1 = refLevel({ id: 1, code: 'P1' });
    expect(isLegacyUnlinkedLevel(p1, schoolLevels)).toBe(true);
    expect(isReferenceLevelSelectable(p1, schoolLevels)).toBe(false);
    expect(buildEnablePayload([1, 2], [p1, refLevel({ id: 2, code: 'P3' })], schoolLevels)).toEqual([2]);
    expect(
      selectableIdsInCycle([p1, refLevel({ id: 2, code: 'P3' })], cyclePrimary.id, schoolLevels),
    ).toEqual([2]);
  });

  it('counts linked_existing as enabled in aggregate', () => {
    const outcome = aggregateEnableResults([
      {
        reference_level_id: 4,
        status: 'linked_existing',
        school_level: { id: 77, name: 'P1', code: 'P1', supports_tracks: false },
      },
    ]);
    expect(outcome.enabledCount).toBe(1);
    expect(outcome.newSchoolLevelIds).toEqual([77]);
  });
});
