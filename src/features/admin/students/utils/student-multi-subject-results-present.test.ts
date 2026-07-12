import { describe, expect, it } from 'vitest';
import type { StudentMultiSubjectResults } from '@/types/student-multi-subject-results';
import {
  buildStudentSubjectResultViews,
  formatResultNumeric,
  formatResultScorePair,
  isMissingStudentResultStatus,
  isNotComputableStudentResultStatus,
  isPartialStudentResultStatus,
  isStudentNotEnrolledPayload,
  normalizeStudentMultiSubjectResultsPayload,
  payloadHasAverageOrRanking,
  studentResultReasonLabelKey,
  studentResultStatusLabelKey,
  studentWarningTitleKey,
} from './student-multi-subject-results-present';

function sample(overrides: Partial<StudentMultiSubjectResults> = {}): StudentMultiSubjectResults {
  return normalizeStudentMultiSubjectResultsPayload({
    status: 'available',
    context: {
      school_id: 3,
      academic_year_id: 1,
      term_id: 21,
      class_id: 2058,
      class_name: 'P6A',
      level_code: 'P6',
    },
    student: { student_id: 854, student_name: 'Amin', student_code: 'A1' },
    enrollment: { enrollment_id: 407, state: 'active' },
    subjects: [
      {
        gradebook_id: 223,
        subject_id: 1886,
        subject_code: 'MATH_PRIM',
        subject_name: 'Math',
        gradebook_state: 'open',
      },
    ],
    results: [
      {
        gradebook_id: 223,
        subject_id: 1886,
        status: 'complete',
        score: 0,
        max_score: 20,
        normalized_score: 0,
        completed_cells: 2,
        expected_cells: 2,
        missing_cells: 0,
        reason: null,
      },
    ],
    coverage: {
      subjects_count: 1,
      available_subjects: 1,
      complete_subjects: 1,
      partial_subjects: 0,
      not_computable_subjects: 0,
      not_available_subjects: 0,
      missing_subjects: 0,
    },
    warnings: [],
    ...overrides,
  });
}

describe('student-multi-subject-results-present', () => {
  it('shows score=0 as zero, not dash', () => {
    expect(formatResultNumeric(0)).toEqual({ kind: 'value', text: '0', value: 0 });
    expect(formatResultScorePair(0, 20).text).toBe('0 / 20');
  });

  it('treats not_available as missing score, not zero', () => {
    const data = sample({
      results: [
        {
          gradebook_id: 223,
          subject_id: 1886,
          status: 'not_available',
          score: null,
          max_score: null,
          normalized_score: null,
          reason: 'student_not_in_gradebook_roster',
        },
      ],
    });
    const row = buildStudentSubjectResultViews(data)[0]!;
    expect(isMissingStudentResultStatus(row.status)).toBe(true);
    expect(formatResultNumeric(row.score).kind).toBe('missing');
    expect(studentResultReasonLabelKey(row.reason)).toBe(
      'admin.student360.academic.reasons.student_not_in_gradebook_roster',
    );
  });

  it('marks partial as non-final', () => {
    expect(isPartialStudentResultStatus('partial')).toBe(true);
    expect(studentResultStatusLabelKey('partial')).toBe('admin.student360.academic.status.partial');
  });

  it('exposes not_computable with reason', () => {
    const data = sample({
      results: [
        {
          gradebook_id: 223,
          subject_id: 1886,
          status: 'not_computable',
          score: null,
          max_score: null,
          normalized_score: null,
          reason: 'participation_state_blocks_aggregation',
        },
      ],
    });
    const row = buildStudentSubjectResultViews(data)[0]!;
    expect(isNotComputableStudentResultStatus(row.status)).toBe(true);
    expect(studentResultReasonLabelKey(row.reason)).toContain('participation_state_blocks_aggregation');
  });

  it('keeps coverage counts from backend', () => {
    const data = sample({
      coverage: {
        subjects_count: 7,
        available_subjects: 1,
        complete_subjects: 0,
        partial_subjects: 1,
        not_computable_subjects: 1,
        not_available_subjects: 2,
        missing_subjects: 2,
      },
    });
    expect(data.coverage).toEqual({
      subjects_count: 7,
      available_subjects: 1,
      complete_subjects: 0,
      partial_subjects: 1,
      not_computable_subjects: 1,
      not_available_subjects: 2,
      missing_subjects: 2,
    });
  });

  it('maps warning codes to human labels', () => {
    expect(studentWarningTitleKey('configured_subject_without_gradebook')).toBe(
      'admin.student360.academic.warnings.codes.configured_subject_without_gradebook',
    );
    expect(studentWarningTitleKey('student_not_enrolled_for_academic_year')).toBe(
      'admin.student360.academic.warnings.codes.student_not_enrolled_for_academic_year',
    );
  });

  it('detects no-enrollment payload', () => {
    const data = sample({
      status: 'not_available',
      reason: 'student_not_enrolled_for_academic_year',
      enrollment: null,
      subjects: [],
      results: [],
      warnings: [
        {
          code: 'student_not_enrolled_for_academic_year',
          message: 'Not enrolled',
        },
      ],
    });
    expect(isStudentNotEnrolledPayload(data)).toBe(true);
  });

  it('detects class without gradebooks via empty subjects and warnings', () => {
    const data = sample({
      subjects: [],
      results: [],
      coverage: {
        subjects_count: 0,
        available_subjects: 0,
        complete_subjects: 0,
        partial_subjects: 0,
        not_computable_subjects: 0,
        not_available_subjects: 0,
        missing_subjects: 0,
      },
      warnings: [
        {
          code: 'configured_subject_without_gradebook',
          message: 'Missing ART',
          subject_code: 'ART_PRIM',
        },
      ],
    });
    expect(data.subjects).toHaveLength(0);
    expect(data.warnings[0]?.code).toBe('configured_subject_without_gradebook');
  });

  it('does not invent average or ranking fields', () => {
    const data = sample();
    expect(payloadHasAverageOrRanking(data)).toBe(false);
    expect('overall_average' in data).toBe(false);
    expect('ranking' in data).toBe(false);
  });

  it('joins subjects and results for Student 360 display', () => {
    const views = buildStudentSubjectResultViews(sample());
    expect(views).toHaveLength(1);
    expect(views[0]?.subject_name).toBe('Math');
    expect(views[0]?.score).toBe(0);
    expect(views[0]?.gradebook_id).toBe(223);
  });
});
