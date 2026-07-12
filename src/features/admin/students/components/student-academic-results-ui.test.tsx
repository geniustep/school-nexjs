import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudentAcademicResultsCoverage } from '../components/student-academic-results-coverage';
import { StudentAcademicResultsList } from '../components/student-academic-results-list';
import { StudentAcademicResultsWarnings } from '../components/student-academic-results-warnings';
import type { StudentSubjectResultView } from '../utils/student-multi-subject-results-present';

vi.mock('@/features/i18n/locale-context', () => ({
  useT: () => (key: string, params?: Record<string, string | number>) => {
    if (!params) return key;
    return `${key}:${JSON.stringify(params)}`;
  },
}));

describe('student academic results UI guards', () => {
  it('renders coverage counts from backend only', () => {
    const html = renderToStaticMarkup(
      <StudentAcademicResultsCoverage
        coverage={{
          subjects_count: 1,
          available_subjects: 1,
          complete_subjects: 0,
          partial_subjects: 0,
          not_computable_subjects: 0,
          not_available_subjects: 0,
          missing_subjects: 0,
        }}
      />,
    );
    expect(html).toContain('data-coverage-key="subjects_count"');
    expect(html).not.toMatch(/average|ranking|معدل|ترتيب/i);
  });

  it('shows zero score and not_available without coercing to zero', () => {
    const rows: StudentSubjectResultView[] = [
      {
        subject_id: 1,
        subject_name: 'Math',
        subject_code: 'MATH',
        gradebook_id: 10,
        gradebook_state: 'open',
        status: 'complete',
        score: 0,
        max_score: 20,
        normalized_score: 0,
        completed_cells: 2,
        expected_cells: 2,
        missing_cells: 0,
        reason: null,
      },
      {
        subject_id: 2,
        subject_name: 'Art',
        subject_code: 'ART',
        gradebook_id: null,
        gradebook_state: null,
        status: 'not_available',
        score: null,
        max_score: null,
        normalized_score: null,
        completed_cells: null,
        expected_cells: null,
        missing_cells: null,
        reason: 'student_not_in_gradebook_roster',
      },
      {
        subject_id: 3,
        subject_name: 'PE',
        subject_code: 'PE',
        gradebook_id: 12,
        gradebook_state: 'open',
        status: 'partial',
        score: 5,
        max_score: 20,
        normalized_score: null,
        completed_cells: 1,
        expected_cells: 2,
        missing_cells: 1,
        reason: null,
      },
    ];
    const html = renderToStaticMarkup(<StudentAcademicResultsList rows={rows} />);
    expect(html).toContain('0 / 20');
    expect(html).toContain('admin.student360.academic.results.notAvailable');
    expect(html).toContain('data-testid="student-academic-partial-hint"');
    expect(html).toContain('admin.student360.academic.results.openGradebook');
    expect(html).not.toMatch(/overall_average|ranking|Edit|Publish|تعديل|نشر/i);
  });

  it('presents warnings with human-readable codes', () => {
    const html = renderToStaticMarkup(
      <StudentAcademicResultsWarnings
        warnings={[
          {
            code: 'configured_subject_without_gradebook',
            message: 'Missing ART',
            subject_code: 'ART_PRIM',
          },
          {
            code: 'student_not_in_gradebook_roster',
            message: 'Not in roster',
          },
          {
            code: 'duplicate_subject_gradebooks',
            message: 'Dup',
          },
          {
            code: 'student_not_enrolled_for_academic_year',
            message: 'Not enrolled',
          },
        ]}
      />,
    );
    expect(html).toContain(
      'admin.student360.academic.warnings.codes.configured_subject_without_gradebook',
    );
    expect(html).toContain('data-testid="student-academic-warnings-toggle"');
    expect(html).not.toMatch(/POST|PATCH|mutation/i);
  });
});
