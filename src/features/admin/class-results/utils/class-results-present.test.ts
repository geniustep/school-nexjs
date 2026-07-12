import { describe, expect, it } from 'vitest';
import type { ClassMultiSubjectResults } from '@/types/class-multi-subject-results';
import {
  findSubjectResultForColumn,
  formatResultNumeric,
  formatResultScorePair,
  hasDuplicateSubjectColumns,
  isDuplicateSubjectColumn,
  normalizeClassMultiSubjectResultsPayload,
  subjectColumnLabel,
} from './class-results-present';

function sample(overrides: Partial<ClassMultiSubjectResults> = {}): ClassMultiSubjectResults {
  return normalizeClassMultiSubjectResultsPayload({
    context: {
      school_id: 3,
      academic_year_id: 1,
      term_id: 21,
      class_id: 2058,
      class_name: 'P6A',
    },
    subjects: [
      {
        gradebook_id: 223,
        subject_id: 1886,
        subject_name: 'Math',
        gradebook_state: 'open',
      },
    ],
    roster: [
      { student_id: 2, roster_sequence: 1, student_name: 'B' },
      { student_id: 1, roster_sequence: 0, student_name: 'A' },
    ],
    matrix: [],
    coverage: {
      gradebooks_count: 1,
      subjects_count: 1,
      roster_count: 2,
      students_with_all_subjects: 0,
      students_with_missing_subjects: 0,
      gradebooks_by_state: {},
      warnings_count: 0,
    },
    warnings: [],
    ...overrides,
  });
}

describe('class-results-present', () => {
  it('preserves backend roster order (no name re-sort)', () => {
    const data = sample();
    expect(data.roster.map((r) => r.student_id)).toEqual([2, 1]);
  });

  it('shows score=0 as zero, not dash', () => {
    expect(formatResultNumeric(0)).toEqual({ kind: 'value', text: '0', value: 0 });
    expect(formatResultScorePair(0, 20).text).toBe('0 / 20');
    expect(formatResultNumeric(null).kind).toBe('missing');
  });

  it('keeps duplicate subject columns distinct by gradebook_id', () => {
    const subjects = [
      {
        gradebook_id: 10,
        subject_id: 5,
        subject_name: 'Arabic',
        gradebook_state: 'open',
      },
      {
        gradebook_id: 11,
        subject_id: 5,
        subject_name: 'Arabic',
        gradebook_state: 'draft',
      },
    ];
    expect(hasDuplicateSubjectColumns(subjects)).toBe(true);
    expect(isDuplicateSubjectColumn(subjects[0]!, subjects)).toBe(true);
    expect(subjectColumnLabel(subjects[0]!, true)).toContain('#10');
    expect(subjectColumnLabel(subjects[1]!, true)).toContain('#11');

    const row = {
      student_id: 1,
      subject_results: [
        {
          gradebook_id: 10,
          status: 'complete',
          score: 0,
          max_score: 20,
          normalized_score: 0,
        },
        {
          gradebook_id: 11,
          status: 'partial',
          score: 5,
          max_score: 20,
          normalized_score: 0.25,
        },
      ],
    };
    expect(findSubjectResultForColumn(row, subjects[0]!)?.gradebook_id).toBe(10);
    expect(findSubjectResultForColumn(row, subjects[1]!)?.gradebook_id).toBe(11);
  });

  it('maps coverage and warnings from payload as-is', () => {
    const data = sample({
      coverage: {
        gradebooks_count: 0,
        subjects_count: 0,
        roster_count: 26,
        students_with_all_subjects: 0,
        students_with_missing_subjects: 26,
        gradebooks_by_state: {},
        warnings_count: 1,
      },
      warnings: [
        {
          code: 'configured_subject_without_gradebook',
          message: 'Missing ART',
          subject_code: 'ART_PRIM',
        },
      ],
    });
    expect(data.coverage.roster_count).toBe(26);
    expect(data.coverage.gradebooks_count).toBe(0);
    expect(data.warnings[0]?.code).toBe('configured_subject_without_gradebook');
  });
});
