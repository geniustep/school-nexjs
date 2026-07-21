import { describe, expect, it, vi } from 'vitest';
import type { ReferenceSubjectOption, SubjectOptionsPayload } from '@/types/academic-subjects';
import {
  dedupeOperationalSubjectOptions,
  extractLevelEnabledOperationalSubjects,
  incompatibleNewSubjectIds,
  isEnabledOperationalReference,
  mergeSchoolSubjectsIntoClassOptions,
  partitionClassSubjectSelection,
  resolveClassSubjectIdsForSave,
} from './class-level-subjects';

function ref(
  partial: Partial<ReferenceSubjectOption> & Pick<ReferenceSubjectOption, 'id' | 'code'>,
): ReferenceSubjectOption {
  return {
    name: partial.name ?? partial.code,
    display_name: partial.display_name ?? partial.name ?? partial.code,
    sequence: partial.sequence ?? partial.id * 10,
    active: partial.active ?? true,
    required: false,
    optional: false,
    source: 'level',
    enabled: partial.enabled ?? false,
    can_enable: true,
    school_subject_id: partial.school_subject_id ?? null,
    ...partial,
  };
}

function payload(subjects: ReferenceSubjectOption[]): SubjectOptionsPayload {
  return {
    level: { id: 3, name: 'M3', code: 'M3', supports_tracks: false },
    reference_subjects: subjects,
    permissions: { can_enable: true },
  };
}

describe('extractLevelEnabledOperationalSubjects', () => {
  it('returns empty for M3 with no enabled subjects', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({ id: 1, code: 'SOC_MID', name: 'الاجتماعيات', enabled: false }),
        ref({ id: 2, code: 'HISTGEO_MID', name: 'التاريخ والجغرافيا', enabled: false }),
      ]),
    );
    expect(out).toEqual([]);
  });

  it('returns only enabled operational subjects (count 10)', () => {
    const subjects = Array.from({ length: 10 }, (_, i) =>
      ref({
        id: i + 1,
        code: `S${i + 1}`,
        name: `مادة ${i + 1}`,
        enabled: true,
        school_subject_id: 100 + i,
      }),
    );
    subjects.push(
      ref({ id: 99, code: 'OFF', name: 'غير مفعلة', enabled: false, school_subject_id: 999 }),
    );
    expect(extractLevelEnabledOperationalSubjects(payload(subjects))).toHaveLength(10);
  });

  it('includes active enabled operational subject', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({
          id: 10,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: true,
          school_subject_id: 501,
        }),
      ]),
    );
    expect(out).toEqual([
      { id: 501, name: 'الاجتماعيات', code: 'SOC_MID', refSubjectId: 10 },
    ]);
  });

  it('excludes operational subject not enabled for the level', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({
          id: 10,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: false,
          school_subject_id: 501,
        }),
      ]),
    );
    expect(out).toEqual([]);
  });

  it('excludes ref-only rows without school_subject_id', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({ id: 10, code: 'SOC_MID', name: 'الاجتماعيات', enabled: true, school_subject_id: null }),
        ref({ id: 11, code: 'HISTGEO_MID', name: 'التاريخ والجغرافيا', enabled: true }),
      ]),
    );
    expect(out).toEqual([]);
  });

  it('never surfaces HISTGEO_MID when not enabled operationally', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({ id: 1, code: 'HISTGEO_MID', name: 'التاريخ والجغرافيا', enabled: false }),
        ref({
          id: 2,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: true,
          school_subject_id: 77,
        }),
      ]),
    );
    expect(out.map((s) => s.code)).toEqual(['SOC_MID']);
  });

  it('shows SOC_MID once when enabled', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({
          id: 2,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: true,
          school_subject_id: 88,
          sequence: 20,
        }),
        ref({
          id: 2,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: true,
          school_subject_id: 88,
          source: 'track',
          sequence: 30,
        }),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe(88);
  });

  it('keeps only the enabled row among similar Arabic names', () => {
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({
          id: 1,
          code: 'ISLAM_PRIM',
          name: 'التربية الإسلامية',
          enabled: false,
          school_subject_id: 1,
        }),
        ref({
          id: 2,
          code: 'ISLAM_MID',
          name: 'التربية الإسلامية',
          enabled: true,
          school_subject_id: 2,
        }),
        ref({
          id: 3,
          code: 'ISLAM_HIGH',
          name: 'التربية الإسلامية',
          enabled: false,
          school_subject_id: 3,
        }),
      ]),
    );
    expect(out).toEqual([
      { id: 2, name: 'التربية الإسلامية', code: 'ISLAM_MID', refSubjectId: 2 },
    ]);
  });

  it('dedupes duplicate operational ids in payload', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = extractLevelEnabledOperationalSubjects(
      payload([
        ref({
          id: 1,
          code: 'A',
          name: 'أ',
          enabled: true,
          school_subject_id: 50,
          sequence: 10,
        }),
        ref({
          id: 9,
          code: 'B',
          name: 'ب',
          enabled: true,
          school_subject_id: 50,
          sequence: 20,
        }),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.code).toBe('A');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('isEnabledOperationalReference', () => {
  it('rejects inactive or missing operational id', () => {
    expect(
      isEnabledOperationalReference(
        ref({ id: 1, code: 'X', enabled: true, active: false, school_subject_id: 1 }),
      ),
    ).toBe(false);
    expect(
      isEnabledOperationalReference(ref({ id: 1, code: 'X', enabled: true, school_subject_id: 0 })),
    ).toBe(false);
  });
});

describe('partition / save / level change helpers', () => {
  const options = [
    { id: 10, name: 'Math', code: 'MATH', refSubjectId: 1 },
    { id: 11, name: 'Arabic', code: 'AR', refSubjectId: 2 },
  ];

  it('keeps legacy linked subjects out of new options', () => {
    const part = partitionClassSubjectSelection(
      [10, 99],
      options,
      [{ id: 99, name: 'Legacy', code: 'LEG' }],
    );
    expect(part.allowedIds).toEqual([10]);
    expect(part.legacy).toEqual([{ id: 99, name: 'Legacy', code: 'LEG' }]);
  });

  it('resolveClassSubjectIdsForSave keeps legacy and drops foreign ids', () => {
    expect(resolveClassSubjectIdsForSave([10, 99, 500], options, [99])).toEqual([10, 99]);
  });

  it('incompatibleNewSubjectIds ignores initial legacy', () => {
    expect(incompatibleNewSubjectIds([10, 20, 99], options, [99])).toEqual([20]);
  });

  it('dedupeOperationalSubjectOptions collapses duplicate ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(
      dedupeOperationalSubjectOptions([
        { id: 1, name: 'A', code: 'A', refSubjectId: 1 },
        { id: 1, name: 'B', code: 'B', refSubjectId: 2 },
      ]),
    ).toHaveLength(1);
    warn.mockRestore();
  });
});

describe('mergeSchoolSubjectsIntoClassOptions', () => {
  it('adds school-local subjects linked to the level', () => {
    const out = mergeSchoolSubjectsIntoClassOptions(
      [{ id: 10, name: 'Math', code: 'MATH', refSubjectId: 1 }],
      [
        { id: 20, name: 'نشاط', code: 'ACT', level_ids: [3], ref_subject_id: null },
        { id: 21, name: 'أخرى', code: 'OTH', level_ids: [9] },
      ],
      3,
    );
    expect(out.map((s) => s.id).sort()).toEqual([10, 20]);
    expect(out.find((s) => s.id === 20)?.refSubjectId).toBeNull();
  });

  it('includes subjects present on level.subjects even without level_ids', () => {
    const out = mergeSchoolSubjectsIntoClassOptions(
      [],
      [{ id: 33, name: 'محلية', code: 'LOC' }],
      5,
      [33],
    );
    expect(out).toEqual([{ id: 33, name: 'محلية', code: 'LOC', refSubjectId: null }]);
  });

  it('does not duplicate national operational options', () => {
    const out = mergeSchoolSubjectsIntoClassOptions(
      [{ id: 10, name: 'Math', code: 'MATH', refSubjectId: 1 }],
      [{ id: 10, name: 'Math renamed', code: 'MATH', level_ids: [3] }],
      3,
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.name).toBe('Math');
  });
});
