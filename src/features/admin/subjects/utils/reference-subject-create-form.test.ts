import { describe, expect, it } from 'vitest';
import type { LevelOptionsPayload, ReferenceLevelOption } from '@/types/academic-levels';
import {
  buildReferenceSubjectCreatePayload,
  emptyReferenceSubjectCreateFormState,
  filterReferenceLevelsForCycle,
  mapDefaultStatusFlags,
  optionalTrimToNull,
  pruneLevelIdsForCycle,
} from './reference-subject-create-form';

function level(
  partial: Partial<ReferenceLevelOption> &
    Pick<ReferenceLevelOption, 'id' | 'code' | 'name' | 'cycle'>,
): ReferenceLevelOption {
  return {
    sequence: 0,
    active: true,
    supports_tracks: false,
    enabled: false,
    can_enable: true,
    link_status: 'not_enabled',
    ...partial,
  };
}

const preschool = { id: 1, code: 'PRE', name: 'أولي', sequence: 1 };
const primary = { id: 2, code: 'PRIM', name: 'ابتدائي', sequence: 2 };

const options: LevelOptionsPayload = {
  cycles: [preschool, primary],
  permissions: { can_enable: true },
  reference_levels: [
    level({ id: 101, code: 'PRE1', name: 'الأولى', cycle: preschool }),
    level({ id: 102, code: 'PRE2', name: 'الثانية', cycle: preschool }),
    level({ id: 201, code: 'P1', name: 'الأولى ابتدائي', cycle: primary }),
  ],
};

describe('reference subject create form utils', () => {
  it('maps default status without allowing both true', () => {
    expect(mapDefaultStatusFlags('unspecified')).toEqual({
      is_mandatory_default: false,
      is_optional_default: false,
    });
    expect(mapDefaultStatusFlags('mandatory')).toEqual({
      is_mandatory_default: true,
      is_optional_default: false,
    });
    expect(mapDefaultStatusFlags('optional')).toEqual({
      is_mandatory_default: false,
      is_optional_default: true,
    });
  });

  it('filters and prunes levels by selected cycle', () => {
    expect(filterReferenceLevelsForCycle(options.reference_levels, 1).map((l) => l.id)).toEqual([
      101, 102,
    ]);
    expect(pruneLevelIdsForCycle([101, 201], options.reference_levels, 1)).toEqual([101]);
  });

  it('builds payload with reference level ids and null optional blanks', () => {
    const state = {
      ...emptyReferenceSubjectCreateFormState(),
      name: '  نشاط حر  ',
      code: ' ACT_PRE ',
      cycleId: 1,
      levelIds: [101, 101],
      subjectCategory: 'art' as const,
      defaultStatus: 'optional' as const,
      weeklySessionsDefault: '2',
      externalReferenceCode: '  ',
      sourceNote: ' created_from_platform_admin ',
    };
    const result = buildReferenceSubjectCreatePayload(state, options);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload).toEqual({
      name: 'نشاط حر',
      code: 'ACT_PRE',
      cycle_id: 1,
      level_ids: [101],
      subject_category: 'art',
      is_mandatory_default: false,
      is_optional_default: true,
      weekly_sessions_default: 2,
      external_reference_code: null,
      source_note: 'created_from_platform_admin',
      active: true,
    });
    expect(result.payload).not.toHaveProperty('school_id');
    expect(result.payload).not.toHaveProperty('ref_subject_id');
    expect(result.payload).not.toHaveProperty('name_lat');
    expect(result.payload).not.toHaveProperty('active_school_id');
  });

  it('rejects school-level ids that are not in the selected cycle', () => {
    const state = {
      ...emptyReferenceSubjectCreateFormState(),
      name: 'مادة',
      code: 'X',
      cycleId: 1,
      levelIds: [999],
    };
    const result = buildReferenceSubjectCreatePayload(state, options);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.field).toBe('levels');
  });

  it('trims empty optional strings to null', () => {
    expect(optionalTrimToNull('  ')).toBeNull();
    expect(optionalTrimToNull(' note ')).toBe('note');
  });
});
