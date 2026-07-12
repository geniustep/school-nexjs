import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getStudentMultiSubjectResults } from './student-multi-subject-results-api';

vi.mock('@/lib/api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

beforeEach(() => {
  vi.clearAllMocks();
});

const samplePayload = {
  status: 'available',
  context: {
    school_id: 3,
    academic_year_id: 1,
    term_id: 21,
    class_id: 2058,
    class_name: 'P6A',
    level_id: 2446,
    level_code: 'P6',
  },
  student: {
    student_id: 854,
    student_name: 'أمين البركاني',
    student_code: 'A12455689',
  },
  enrollment: {
    enrollment_id: 407,
    roster_sequence: 0,
    state: 'active',
  },
  subjects: [
    {
      gradebook_id: 223,
      subject_id: 1886,
      subject_code: 'MATH_PRIM',
      subject_name: 'الرياضيات',
      gradebook_state: 'open',
      scheme_id: 129,
      structure_mode: 'simple',
    },
  ],
  results: [
    {
      gradebook_id: 223,
      subject_id: 1886,
      status: 'available',
      score: null,
      max_score: null,
      normalized_score: null,
      completed_cells: 0,
      expected_cells: 2,
      missing_cells: 2,
      blocking_cells: 0,
      available: true,
      reason: null,
    },
  ],
  coverage: {
    subjects_count: 1,
    available_subjects: 1,
    complete_subjects: 0,
    partial_subjects: 0,
    not_computable_subjects: 0,
    not_available_subjects: 0,
    missing_subjects: 0,
  },
  warnings: [
    {
      code: 'configured_subject_without_gradebook',
      message: 'Level subject ART_PRIM has no gradebook for this class/term.',
      subject_id: 1883,
      subject_code: 'ART_PRIM',
    },
  ],
};

describe('getStudentMultiSubjectResults', () => {
  it('maps endpoint path and query params', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: samplePayload, meta: {} });

    await getStudentMultiSubjectResults({
      studentId: 854,
      academicYearId: 1,
      termId: 21,
    });

    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.studentMultiSubjectResults(854), {
      academic_year_id: 1,
      term_id: 21,
    });
    expect(endpoints.admin.studentMultiSubjectResults(854)).toBe(
      '/admin/assessment/students/854/results',
    );
  });

  it('normalizes payload without inventing averages or ranking', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: samplePayload, meta: {} });
    const res = await getStudentMultiSubjectResults({
      studentId: 854,
      academicYearId: 1,
      termId: 21,
    });
    expect(res.success && res.data?.student.student_id).toBe(854);
    expect(res.success && res.data?.context.class_id).toBe(2058);
    expect(res.success && res.data?.subjects).toHaveLength(1);
    expect(res.success && res.data?.coverage.subjects_count).toBe(1);
    expect(res.success && res.data?.warnings).toHaveLength(1);
    expect(JSON.stringify(res.success ? res.data : {})).not.toMatch(
      /overall_average|weighted_average|ranking/,
    );
  });
});
