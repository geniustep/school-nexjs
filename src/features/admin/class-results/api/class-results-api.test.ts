import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { getClassMultiSubjectResults } from './class-results-api';

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
  context: {
    school_id: 3,
    academic_year_id: 1,
    term_id: 21,
    class_id: 2058,
    class_name: 'P6A',
    level_id: 2446,
    level_code: 'P6',
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
  roster: [
    {
      student_id: 1705,
      enrollment_id: 1225,
      roster_sequence: 0,
      student_name: 'منير البلغيثي',
      student_code: 'A1',
    },
  ],
  matrix: [
    {
      student_id: 1705,
      enrollment_id: 1225,
      roster_sequence: 0,
      subject_results: [
        {
          gradebook_id: 223,
          student_line_id: 240,
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
    },
  ],
  coverage: {
    gradebooks_count: 1,
    subjects_count: 1,
    roster_count: 1,
    students_with_all_subjects: 1,
    students_with_missing_subjects: 0,
    gradebooks_by_state: { open: 1 },
    warnings_count: 0,
  },
  warnings: [],
};

describe('getClassMultiSubjectResults', () => {
  it('maps endpoint path and query params', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: samplePayload, meta: {} });

    await getClassMultiSubjectResults({
      classId: 2058,
      academicYearId: 1,
      termId: 21,
    });

    expect(mockApi.get).toHaveBeenCalledWith(endpoints.admin.classMultiSubjectResults(2058), {
      academic_year_id: 1,
      term_id: 21,
    });
    expect(endpoints.admin.classMultiSubjectResults(2058)).toBe(
      '/admin/assessment/classes/2058/results',
    );
  });

  it('normalizes payload fields without inventing averages', async () => {
    mockApi.get.mockResolvedValueOnce({ success: true, data: samplePayload, meta: {} });
    const res = await getClassMultiSubjectResults({
      classId: 2058,
      academicYearId: 1,
      termId: 21,
    });
    expect(res.success && res.data?.context.class_name).toBe('P6A');
    expect(res.success && res.data?.roster).toHaveLength(1);
    expect(res.success && res.data?.subjects[0]?.gradebook_id).toBe(223);
    expect(JSON.stringify(res.success ? res.data : {})).not.toMatch(
      /overall_average|class_average|ranking/,
    );
  });
});
