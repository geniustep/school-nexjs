import { describe, expect, it } from 'vitest';
import type { ReferenceSubjectOption, SubjectOptionsPayload } from '@/types/academic-subjects';
import type { Subject } from '@/types/class';
import { SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE } from '@/types/subject-enablement';
import {
  buildLevelEnablementMatrix,
  buildSubjectEnabledLevelSummaries,
  filterEnablementRows,
  matrixContainsCode,
} from './build-enablement-matrix';

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

function op(partial: Partial<Subject> & Pick<Subject, 'id' | 'name'>): Subject {
  return {
    code: partial.code ?? `C${partial.id}`,
    active: true,
    ...partial,
  };
}

function options(subjects: ReferenceSubjectOption[]): SubjectOptionsPayload {
  return {
    level: { id: 3, name: 'M3', code: 'M3', supports_tracks: false },
    reference_subjects: subjects,
    permissions: { can_enable: true },
  };
}

describe('buildLevelEnablementMatrix', () => {
  it('lists operational subjects only and marks enablement from options', () => {
    const matrix = buildLevelEnablementMatrix(
      { id: 3, name: 'الثالثة إعدادي', code: 'M3' },
      [
        op({ id: 10, name: 'الاجتماعيات', code: 'SOC_MID' }),
        op({ id: 11, name: 'الرياضيات', code: 'MATH_MID' }),
        op({ id: 12, name: 'مؤرشفة', code: 'OLD', active: false }),
      ],
      options([
        ref({
          id: 100,
          code: 'SOC_MID',
          name: 'الاجتماعيات',
          enabled: true,
          school_subject_id: 10,
        }),
        ref({ id: 101, code: 'HISTGEO_MID', name: 'التاريخ والجغرافيا', enabled: false }),
        ref({
          id: 102,
          code: 'MATH_MID',
          name: 'الرياضيات',
          enabled: false,
          school_subject_id: 11,
        }),
      ]),
    );

    expect(SUBJECT_LEVEL_ENABLEMENT_WRITE_AVAILABLE).toBe(false);
    expect(matrix.writeAvailable).toBe(false);
    expect(matrix.counts.operationalActive).toBe(2);
    expect(matrix.counts.enabled).toBe(1);
    expect(matrix.counts.notEnabled).toBe(1);
    expect(matrixContainsCode(matrix, 'HISTGEO_MID')).toBe(false);
    expect(matrix.rows.map((r) => r.operationalSubjectId).sort()).toEqual([10, 11]);
    expect(matrix.rows.find((r) => r.operationalSubjectId === 10)?.status).toBe('enabled');
    expect(matrix.rows.find((r) => r.operationalSubjectId === 11)?.status).toBe('not_enabled');
  });

  it('shows zero enablements for M3-like empty options', () => {
    const matrix = buildLevelEnablementMatrix(
      { id: 3, name: 'M3', code: 'M3' },
      [
        op({ id: 1, name: 'عربية', code: 'AR_MID' }),
        op({ id: 2, name: 'فرنسية', code: 'FR_MID' }),
      ],
      options([
        ref({ id: 1, code: 'AR_MID', enabled: false, school_subject_id: 1 }),
        ref({ id: 2, code: 'FR_MID', enabled: false, school_subject_id: 2 }),
      ]),
    );
    expect(matrix.counts.enabled).toBe(0);
    expect(matrix.counts.notEnabled).toBe(2);
  });

  it('shows ten enablements for M1-like payload', () => {
    const ops = Array.from({ length: 10 }, (_, i) =>
      op({ id: i + 1, name: `مادة ${i + 1}`, code: `S${i + 1}` }),
    );
    const refs = ops.map((s, i) =>
      ref({
        id: 200 + i,
        code: s.code!,
        name: s.name,
        enabled: true,
        school_subject_id: s.id,
      }),
    );
    const matrix = buildLevelEnablementMatrix(
      { id: 1, name: 'M1', code: 'M1' },
      ops,
      options(refs),
    );
    expect(matrix.counts.enabled).toBe(10);
    expect(matrix.counts.notEnabled).toBe(0);
  });

  it('dedupes operational ids and ignores ref-only enabled rows', () => {
    const matrix = buildLevelEnablementMatrix(
      { id: 1, name: 'L', code: 'L' },
      [op({ id: 5, name: 'أ', code: 'A' }), op({ id: 5, name: 'أ مكرر', code: 'A2' })],
      options([
        ref({ id: 9, code: 'REF_ONLY', enabled: true, school_subject_id: null }),
        ref({ id: 10, code: 'A', enabled: true, school_subject_id: 5 }),
      ]),
    );
    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0]?.status).toBe('enabled');
  });

  it('filters by name or code', () => {
    const rows = [
      {
        operationalSubjectId: 1,
        name: 'الاجتماعيات',
        code: 'SOC_MID',
        status: 'enabled' as const,
        source: 'level' as const,
        active: true,
      },
      {
        operationalSubjectId: 2,
        name: 'الرياضيات',
        code: 'MATH_MID',
        status: 'not_enabled' as const,
        source: 'unknown' as const,
        active: true,
      },
    ];
    expect(filterEnablementRows(rows, 'soc').map((r) => r.code)).toEqual(['SOC_MID']);
    expect(filterEnablementRows(rows, 'رياض')).toHaveLength(1);
  });
});

describe('buildSubjectEnabledLevelSummaries', () => {
  it('counts enabled levels from level_ids without duplicating', () => {
    const map = buildSubjectEnabledLevelSummaries(
      [
        op({ id: 7, name: 'عربية', code: 'AR', level_ids: [1, 2, 2] }),
        op({ id: 8, name: 'فرنسية', code: 'FR', level_id: 3 }),
      ],
      [
        { id: 1, code: '1APIC', name: '1' },
        { id: 2, code: '2APIC', name: '2' },
        { id: 3, code: '3APIC', name: '3' },
      ],
    );
    expect(map.get(7)?.enabledCount).toBe(2);
    expect(map.get(7)?.enabledLevelCodes).toEqual(['1APIC', '2APIC']);
    expect(map.get(8)?.enabledCount).toBe(1);
    expect(map.get(8)?.enabledLevelCodes).toEqual(['3APIC']);
  });
});
