import { describe, expect, it } from 'vitest';
import {
  buildBatchClassCreatePayload,
  buildClassPayload,
  collectCyclesFromLevels,
  existingClassNamesForCanonicalScope,
  filterLevelsByCycleId,
  isClassesListCompleteForNaming,
  parseCanonicalClassGroupNumber,
  resolveDefaultClassAcademicYearId,
  resolveLevelAcademicCode,
  shouldReplaceSuggestedClassName,
  suggestCanonicalClassNames,
  suggestNextCanonicalClassName,
} from './class-form-utils';
import type { Level, SchoolClass } from '@/types/class';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = {
  name: '1APG-1',
  levelId: '3',
  trackId: '',
  academicYearId: '1',
  capacity: '30',
  room: 'A1',
  teacherIds: [] as number[],
  subjectIds: [10, 11] as number[],
};

describe('buildClassPayload canonical create contract', () => {
  it('sends name + level_id + academic_year_id + subject_ids and never code', () => {
    const payload = buildClassPayload({
      ...base,
      subjectIds: [10, 11],
      subjectsTouched: true,
      creating: true,
    });
    expect(payload).toEqual({
      name: '1APG-1',
      level_id: 3,
      academic_year_id: 1,
      capacity: 30,
      room_number: 'A1',
      subject_ids: [10, 11],
      active: true,
    });
    expect(payload).not.toHaveProperty('code');
  });

  it('does not send Arabic descriptive names as required format assertion helper', () => {
    const payload = buildClassPayload({
      ...base,
      name: 'الأول ابتدائي أ',
      subjectsTouched: true,
      creating: true,
    });
    // Utility forwards the field; UI must not propose Arabic for create.
    expect(payload.name).toBe('الأول ابتدائي أ');
    expect(String(payload.name)).not.toMatch(/^[A-Z]+\d+[A-Z]$/);
  });

  it('omits subject_ids when not touched', () => {
    const payload = buildClassPayload({
      ...base,
      subjectsTouched: false,
      creating: true,
    });
    expect(payload).not.toHaveProperty('subject_ids');
    expect(payload.active).toBe(true);
  });
});

describe('suggestCanonicalClassNames', () => {
  it('returns 1APG-1 when empty', () => {
    expect(suggestNextCanonicalClassName('1APG', [])).toBe('1APG-1');
  });

  it('returns next after 1APG-1', () => {
    expect(suggestNextCanonicalClassName('1APG', ['1APG-1'])).toBe('1APG-2');
  });

  it('reuses gaps: 1 and 3 taken → 2', () => {
    expect(suggestNextCanonicalClassName('1APG', ['1APG-1', '1APG-3'])).toBe('1APG-2');
  });

  it('continues after contiguous 1..3', () => {
    expect(suggestNextCanonicalClassName('1APG', ['1APG-1', '1APG-2', '1APG-3'])).toBe(
      '1APG-4',
    );
  });

  it('ignores legacy P1A and 6AP-A and invalid 1-3APG', () => {
    expect(
      suggestNextCanonicalClassName('1APG', ['P1A', '6AP-A', '1-3APG', '1APG-X', '1APG-0']),
    ).toBe('1APG-1');
  });

  it('does not mix another academic_code prefix', () => {
    expect(suggestNextCanonicalClassName('1APG', ['2APG-1', '1APG-1'])).toBe('1APG-2');
  });

  it('uses academic_code not level.code/P1A', () => {
    expect(resolveLevelAcademicCode({ academic_code: '1APG', code: 'P1' } as Level)).toBe(
      '1APG',
    );
    expect(suggestNextCanonicalClassName('1APG', [])).toBe('1APG-1');
    expect(suggestNextCanonicalClassName('1APG', [])).not.toBe('P1A');
  });

  it('supports secondary academic codes without track in the name', () => {
    expect(suggestNextCanonicalClassName('1BAC', [])).toBe('1BAC-1');
    expect(suggestNextCanonicalClassName('1BAC', [])).not.toContain('SCI');
  });

  it('returns null without academic_code fallback', () => {
    expect(suggestNextCanonicalClassName(null, ['P1A'])).toBeNull();
    expect(suggestNextCanonicalClassName('', [])).toBeNull();
    expect(resolveLevelAcademicCode({ code: 'P1' } as Level)).toBeNull();
  });

  it('batch suggests unique canonical names with gap reuse', () => {
    expect(suggestCanonicalClassNames('1APG', ['1APG-1', '1APG-3'], 3)).toEqual([
      '1APG-2',
      '1APG-4',
      '1APG-5',
    ]);
  });
});

describe('parseCanonicalClassGroupNumber', () => {
  it('accepts only strict academic_code-N', () => {
    expect(parseCanonicalClassGroupNumber('1APG-2', '1APG')).toBe(2);
    expect(parseCanonicalClassGroupNumber('P1A', '1APG')).toBeNull();
    expect(parseCanonicalClassGroupNumber('1APG-0', '1APG')).toBeNull();
  });
});

describe('existingClassNamesForCanonicalScope', () => {
  const classes = [
    {
      id: 1,
      name: '1APG-1',
      code: null,
      level: { id: 5, name: 'P1' },
      academic_year: '2025-2026',
      academic_year_id: 10,
      student_count: 0,
      capacity: null,
      teachers: [],
      subjects: [],
      status: 'active',
    },
    {
      id: 2,
      name: '1APG-9',
      code: null,
      level: { id: 5, name: 'P1' },
      academic_year: '2024-2025',
      academic_year_id: 9,
      student_count: 0,
      capacity: null,
      teachers: [],
      subjects: [],
      status: 'active',
    },
    {
      id: 3,
      name: '2APG-1',
      code: null,
      level: { id: 6, name: 'P2' },
      academic_year: '2025-2026',
      academic_year_id: 10,
      student_count: 0,
      capacity: null,
      teachers: [],
      subjects: [],
      status: 'active',
    },
  ] as SchoolClass[];

  it('scopes by level and academic year id', () => {
    expect(
      existingClassNamesForCanonicalScope(classes, { levelId: 5, academicYearId: '10' }),
    ).toEqual(['1APG-1']);
  });
});

describe('cycle helpers still isolate levels', () => {
  const levels: Level[] = [
    {
      id: 1,
      name: 'الأولى ابتدائي',
      code: 'P1',
      academic_code: '1APG',
      cycle: { id: 10, code: 'primary', name: 'ابتدائي', sequence: 20 },
    },
    {
      id: 2,
      name: 'الأولى إعدادي',
      code: 'M1',
      academic_code: '1AC',
      cycle: { id: 20, code: 'middle_school', name: 'إعدادي', sequence: 30 },
    },
  ];

  it('does not put cycle into suggested names', () => {
    expect(suggestNextCanonicalClassName(levels[0].academic_code, [])).toBe('1APG-1');
    expect(collectCyclesFromLevels(levels).map((c) => c.code)).toEqual([
      'primary',
      'middle_school',
    ]);
    expect(filterLevelsByCycleId(levels, '10').map((l) => l.id)).toEqual([1]);
  });
});

describe('resolveDefaultClassAcademicYearId + replace policy', () => {
  it('prefers is_current year', () => {
    expect(
      resolveDefaultClassAcademicYearId([
        { id: 1, name: '2024-2025' },
        { id: 2, name: '2025-2026', is_current: true },
      ]),
    ).toBe('2');
  });

  it('replaces suggestion unless user diverged', () => {
    expect(shouldReplaceSuggestedClassName('1APG-1', '1APG-1', false)).toBe(true);
    expect(shouldReplaceSuggestedClassName('CUSTOM', '1APG-1', true)).toBe(false);
  });
});

describe('batch drawer source no longer uses legacy letter codes', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/features/admin/academic-setup/components/batch-class-drawer.tsx'),
    'utf8',
  );

  it('does not contain level.code + letter generator', () => {
    expect(source).not.toContain('String.fromCharCode(65');
    expect(source).not.toContain('${level.code');
    expect(source).toContain('suggestCanonicalClassNames');
    expect(source).not.toMatch(/payload\.code|code:\s*row\.code/);
  });

  it('uses shared helpers and year→cycle→level flow markers', () => {
    expect(source).toContain('buildBatchClassCreatePayload');
    expect(source).toContain('isClassesListCompleteForNaming');
    expect(source).toContain('academicContext.fields.academicYear');
    expect(source).toContain('academicContext.fields.cycle');
    expect(source).toContain('disabled={levelDisabled}');
    expect(source).toContain('ClassSubjectsField');
    expect(source).toContain('onSelectAll');
    expect(source).toContain('onClearAll');
    expect(source).toContain('if (saving) return');
  });
});

describe('buildBatchClassCreatePayload', () => {
  it('sends canonical name + subject_ids and never code', () => {
    const payload = buildBatchClassCreatePayload({
      name: '1APG-2',
      levelId: 44,
      academicYearId: '9',
      subjectIds: [7, 8],
      trackId: '3',
      capacity: '28',
    });
    expect(payload).toEqual({
      name: '1APG-2',
      level_id: 44,
      track_id: 3,
      academic_year_id: 9,
      capacity: 28,
      subject_ids: [7, 8],
      active: true,
    });
    expect(payload).not.toHaveProperty('code');
  });

  it('keeps same subject_ids for every batch row caller', () => {
    const subjects = [1, 2, 3];
    const a = buildBatchClassCreatePayload({
      name: '1APG-1',
      levelId: 1,
      academicYearId: '1',
      subjectIds: subjects,
    });
    const b = buildBatchClassCreatePayload({
      name: '1APG-2',
      levelId: 1,
      academicYearId: '1',
      subjectIds: subjects,
    });
    expect(a.subject_ids).toEqual(subjects);
    expect(b.subject_ids).toEqual(subjects);
  });
});

describe('isClassesListCompleteForNaming', () => {
  it('treats missing pagination as complete', () => {
    expect(isClassesListCompleteForNaming([{ id: 1 }], null)).toBe(true);
  });

  it('detects truncated pages', () => {
    expect(
      isClassesListCompleteForNaming([{ id: 1 }], {
        pagination: { page: 1, page_size: 1, total: 3, total_pages: 3 },
      }),
    ).toBe(false);
  });

  it('accepts full first page that matches total', () => {
    expect(
      isClassesListCompleteForNaming([{ id: 1 }, { id: 2 }], {
        pagination: { page: 1, page_size: 50, total: 2, total_pages: 1 },
      }),
    ).toBe(true);
  });
});

describe('cycle/level wizard rules', () => {
  const levels: Level[] = [
    {
      id: 1,
      name: 'الأولى',
      code: 'P1',
      academic_code: '1APG',
      cycle: { id: 10, code: 'primary', name: 'ابتدائي', sequence: 20 },
    },
    {
      id: 2,
      name: 'إعدادي',
      code: 'M1',
      academic_code: '1AC',
      cycle: { id: 20, code: 'middle_school', name: 'إعدادي', sequence: 30 },
    },
  ];

  it('filters levels by cycle and clears invalid prior selection semantics', () => {
    expect(filterLevelsByCycleId(levels, '').length).toBe(0);
    expect(filterLevelsByCycleId(levels, '10').map((l) => l.id)).toEqual([1]);
    const afterCycleChange = filterLevelsByCycleId(levels, '20');
    expect(afterCycleChange.some((l) => l.id === 1)).toBe(false);
  });

  it('blocks naming without academic_code', () => {
    expect(resolveLevelAcademicCode({ code: 'P1' } as Level)).toBeNull();
    expect(suggestCanonicalClassNames(null, [], 2)).toBeNull();
  });
});
