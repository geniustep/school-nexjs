import { describe, expect, it } from 'vitest';
import type { ReferenceLevelOption } from '@/types/academic-levels';
import type { Level } from '@/types/class';
import { resolveReferenceLevelState } from './level-link-status';

const cycle = { id: 2, code: 'primary', name: 'Primary', sequence: 20 };

function ref(partial: Partial<ReferenceLevelOption> & Pick<ReferenceLevelOption, 'id' | 'code'>): ReferenceLevelOption {
  return {
    name: partial.code,
    display_name: partial.code,
    sequence: 10,
    active: true,
    supports_tracks: false,
    cycle,
    enabled: false,
    can_enable: true,
    ...partial,
  };
}

describe('resolveReferenceLevelState', () => {
  const schoolLevels: Level[] = [
    { id: 77, name: 'P1', code: 'P1', ref_level_id: null },
    { id: 88, name: 'P1 bis', code: 'P1', ref_level_id: null },
  ];

  it('uses API link_status when provided', () => {
    const state = resolveReferenceLevelState(
      ref({
        id: 4,
        code: 'P1',
        link_status: 'legacy_unlinked',
        school_level_id: 77,
        can_link: true,
        can_enable: false,
      }),
      [],
    );
    expect(state.linkStatus).toBe('legacy_unlinked');
    expect(state.canLink).toBe(true);
    expect(state.schoolLevelId).toBe(77);
  });

  it('infers legacy_unlinked from school levels', () => {
    const state = resolveReferenceLevelState(ref({ id: 4, code: 'P1' }), [schoolLevels[0]!]);
    expect(state.linkStatus).toBe('legacy_unlinked');
    expect(state.canLink).toBe(true);
    expect(state.canSelect).toBe(false);
  });

  it('marks ambiguous when multiple school matches', () => {
    const state = resolveReferenceLevelState(ref({ id: 4, code: 'P1' }), schoolLevels);
    expect(state.linkStatus).toBe('legacy_ambiguous');
    expect(state.canLink).toBe(false);
  });

  it('treats enabled reference as not selectable', () => {
    const state = resolveReferenceLevelState(
      ref({ id: 5, code: 'P2', enabled: true, school_level_id: 138, can_enable: false }),
      [],
    );
    expect(state.linkStatus).toBe('enabled');
    expect(state.canSelect).toBe(false);
  });
});
