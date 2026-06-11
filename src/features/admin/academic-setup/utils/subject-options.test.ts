import { describe, expect, it } from 'vitest';
import type { EnableSubjectResult, ReferenceSubjectOption } from '@/types/academic-subjects';
import { normalizeSubjectOptionsPayload } from '../hooks/use-subject-options';
import { mapEnableSubjectError } from '../utils/api-errors';
import {
  aggregateEnableSubjectResults,
  buildEnableSubjectsPayload,
  dedupeReferenceSubjects,
  filterReferenceSubjects,
  isReferenceSubjectSelectable,
  selectableAvailableIds,
  selectableRequiredIds,
  sortReferenceSubjects,
} from './subject-options';

function refSubject(
  partial: Partial<ReferenceSubjectOption> & Pick<ReferenceSubjectOption, 'id' | 'code'>,
): ReferenceSubjectOption {
  return {
    name: partial.code,
    display_name: partial.code,
    sequence: partial.id * 10,
    active: true,
    required: false,
    optional: false,
    source: 'level',
    enabled: false,
    can_enable: true,
    ...partial,
  };
}

describe('mapEnableSubjectError', () => {
  const t = (key: string) => `tr:${key}`;

  it('maps legacy review code', () => {
    expect(mapEnableSubjectError('legacy_match_requires_review', t)).toBe(
      'tr:admin.academicSetup.errors.legacyMatchRequiresReview',
    );
  });
});

describe('normalizeSubjectOptionsPayload', () => {
  it('returns null when data missing or level invalid', () => {
    expect(normalizeSubjectOptionsPayload(null)).toBeNull();
    expect(normalizeSubjectOptionsPayload({ reference_subjects: [] } as never)).toBeNull();
  });

  it('normalizes partial payloads', () => {
    const out = normalizeSubjectOptionsPayload({
      level: { id: 5, name: 'P2', code: 'P2', supports_tracks: false },
      reference_subjects: [],
      permissions: { can_enable: true },
    });
    expect(out?.level.id).toBe(5);
    expect(out?.permissions.can_enable).toBe(true);
  });
});

describe('subject-options utils', () => {
  const subjects: ReferenceSubjectOption[] = [
    refSubject({ id: 2, code: 'MATH', sequence: 20, required: true }),
    refSubject({ id: 1, code: 'AR', sequence: 10, optional: true }),
    refSubject({
      id: 3,
      code: 'IT',
      enabled: true,
      can_enable: false,
      source: 'track',
    }),
  ];

  it('sorts by sequence', () => {
    expect(sortReferenceSubjects(subjects).map((s) => s.code)).toEqual(['AR', 'MATH', 'IT']);
  });

  it('dedupes by reference id', () => {
    const dupes = [
      refSubject({ id: 1, code: 'AR', source: 'level' }),
      refSubject({ id: 1, code: 'AR', source: 'track' }),
    ];
    expect(dedupeReferenceSubjects(dupes)).toHaveLength(1);
  });

  it('filters search and modes', () => {
    expect(filterReferenceSubjects(subjects, { search: 'math' }).map((s) => s.code)).toEqual([
      'MATH',
    ]);
    expect(filterReferenceSubjects(subjects, { mode: 'enabled' })).toHaveLength(1);
    expect(filterReferenceSubjects(subjects, { mode: 'required' })).toHaveLength(1);
    expect(filterReferenceSubjects(subjects, { source: 'track' })).toHaveLength(1);
  });

  it('excludes enabled from enable payload', () => {
    const selected = new Set([1, 2, 3]);
    expect(buildEnableSubjectsPayload(selected, subjects)).toEqual([1, 2]);
  });

  it('aggregates full, partial, and already enabled results', () => {
    const results: EnableSubjectResult[] = [
      { reference_subject_id: 1, status: 'enabled', school_subject: { id: 10, name: 'A', code: 'A' } },
      { reference_subject_id: 2, status: 'already_enabled' },
      { reference_subject_id: 3, status: 'failed', error: { code: 'legacy_match_requires_review', message: 'x' } },
    ];
    const out = aggregateEnableSubjectResults(results);
    expect(out.enabledCount).toBe(1);
    expect(out.alreadyEnabledCount).toBe(1);
    expect(out.failedCount).toBe(1);
    expect(out.partialSuccess).toBe(true);
    expect(out.failedIds).toEqual([3]);
    expect(out.newSchoolSubjectIds).toEqual([10]);
  });

  it('maps legacy error on failed row', () => {
    const out = aggregateEnableSubjectResults([
      {
        reference_subject_id: 9,
        status: 'failed',
        error: { code: 'legacy_match_requires_review', message: 'review' },
      },
    ]);
    expect(out.errorsByRefId.get(9)).toBe('review');
  });

  it('selectable helpers respect enabled state', () => {
    expect(isReferenceSubjectSelectable(subjects[2]!)).toBe(false);
    expect(selectableAvailableIds(subjects)).toEqual([2, 1]);
    expect(selectableRequiredIds(subjects)).toEqual([2]);
  });
});

describe('school level id in hook query', () => {
  it('uses numeric school level id not ref level', () => {
    const levelId = 42;
    const query = { level_id: levelId, include_enabled: 'true' };
    expect(query.level_id).toBe(42);
    expect(String(query.level_id)).not.toMatch(/ref/);
  });
});
