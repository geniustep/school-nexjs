import { describe, expect, it } from 'vitest';
import type { ReferenceLevelOption } from '@/types/academic-levels';
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
    link_status: 'not_enabled',
    ...partial,
  };
}

describe('resolveReferenceLevelState', () => {
  it('reads legacy_unlinked from backend fields only', () => {
    const state = resolveReferenceLevelState(
      ref({
        id: 4,
        code: 'P1',
        link_status: 'legacy_unlinked',
        school_level_id: 77,
        can_link: true,
        can_enable: false,
      }),
    );
    expect(state.linkStatus).toBe('legacy_unlinked');
    expect(state.canLink).toBe(true);
    expect(state.schoolLevelId).toBe(77);
    expect(state.canSelect).toBe(false);
  });

  it('does not enable link without can_link and school_level_id', () => {
    const state = resolveReferenceLevelState(
      ref({
        id: 4,
        code: 'P1',
        link_status: 'legacy_unlinked',
        can_link: false,
      }),
    );
    expect(state.canLink).toBe(false);
  });

  it('treats enabled reference as non-selectable', () => {
    const state = resolveReferenceLevelState(
      ref({
        id: 5,
        code: 'P2',
        link_status: 'enabled',
        enabled: true,
        school_level_id: 138,
        can_enable: false,
      }),
    );
    expect(state.linkStatus).toBe('enabled');
    expect(state.canSelect).toBe(false);
  });

  it('falls back link_status from enabled flag only', () => {
    const enabledFallback = ref({ id: 1, code: 'A', enabled: true });
    delete (enabledFallback as { link_status?: string }).link_status;
    const disabledFallback = ref({ id: 2, code: 'B', enabled: false });
    delete (disabledFallback as { link_status?: string }).link_status;

    expect(resolveReferenceLevelState(enabledFallback).linkStatus).toBe('enabled');
    expect(resolveReferenceLevelState(disabledFallback).linkStatus).toBe('not_enabled');
  });
});
