// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { ClassMultiSubjectResults } from '@/types/class-multi-subject-results';

vi.mock('../../class-results-workspace.css', () => ({}));

const getClassMultiSubjectResults = vi.fn();

vi.mock('../api/class-results-api', () => ({
  getClassMultiSubjectResults: (...args: unknown[]) => getClassMultiSubjectResults(...args),
}));

vi.mock('@/features/admin/finance/use-finance-lookups', () => ({
  useAcademicYearOptions: () => ({
    options: [{ id: 1, name: '2025-2026' }],
    loading: false,
  }),
}));

vi.mock('@/lib/hooks/use-admin-resource', () => ({
  useAdminResource: () => ({
    data: [{ id: 2058, name: 'P6A' }],
    meta: {
      terms: [{ id: 21, name: 'Term 1', academic_year_id: 1 }],
    },
    loading: false,
    error: null,
  }),
}));

import { ClassResultsPage } from './class-results-page';
import { ClassResultsMatrix } from './class-results-matrix';
import { ClassResultsWarnings } from './class-results-warnings';
import { ClassResultsCoverage } from './class-results-coverage';

function basePayload(overrides: Partial<ClassMultiSubjectResults> = {}): ClassMultiSubjectResults {
  return {
    context: {
      school_id: 3,
      academic_year_id: 1,
      term_id: 21,
      class_id: 2058,
      class_name: 'P6A',
      level_code: 'P6',
    },
    subjects: [
      {
        gradebook_id: 223,
        subject_id: 1886,
        subject_code: 'MATH_PRIM',
        subject_name: 'Math',
        gradebook_state: 'open',
      },
    ],
    roster: [
      {
        student_id: 1705,
        enrollment_id: 1225,
        roster_sequence: 0,
        student_name: 'Student Zero',
        student_code: 'Z0',
      },
      {
        student_id: 1706,
        enrollment_id: 1226,
        roster_sequence: 1,
        student_name: 'Student Partial',
        student_code: 'P1',
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
            status: 'complete',
            score: 0,
            max_score: 20,
            normalized_score: 0,
            completed_cells: 2,
            expected_cells: 2,
            missing_cells: 0,
            blocking_cells: 0,
            available: true,
            reason: null,
          },
        ],
      },
      {
        student_id: 1706,
        enrollment_id: 1226,
        roster_sequence: 1,
        subject_results: [
          {
            gradebook_id: 223,
            student_line_id: 241,
            status: 'partial',
            score: 5,
            max_score: 20,
            normalized_score: 0.25,
            completed_cells: 1,
            expected_cells: 2,
            missing_cells: 1,
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
      roster_count: 2,
      students_with_all_subjects: 2,
      students_with_missing_subjects: 0,
      gradebooks_by_state: { open: 1 },
      warnings_count: 1,
    },
    warnings: [
      {
        code: 'configured_subject_without_gradebook',
        message: 'Level subject ART_PRIM has no gradebook',
        subject_code: 'ART_PRIM',
      },
    ],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <LocaleProvider>
      <ClassResultsPage />
    </LocaleProvider>,
  );
}

beforeEach(() => {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  getClassMultiSubjectResults.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('Class multi-subject results workspace', () => {
  it('does not show false empty while loading', async () => {
    let resolveFn: (value: unknown) => void = () => undefined;
    getClassMultiSubjectResults.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFn = resolve;
        }),
    );

    renderPage();
    const year = screen.getByLabelText('Academic year');
    year.dispatchEvent(new Event('change', { bubbles: true }));
    // Controlled selects need fireEvent — use native change via user interaction simulation
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Term'), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '2058' } });

    expect(await screen.findByText('Loading class results…')).toBeTruthy();
    expect(screen.queryByText('Empty roster')).toBeNull();

    resolveFn({ success: true, data: basePayload(), meta: {} });
    await waitFor(() => expect(screen.getByTestId('class-results-matrix')).toBeTruthy());
  });

  it('renders one subject matrix, score=0, partial, coverage, warnings; no average/ranking/edit', async () => {
    getClassMultiSubjectResults.mockResolvedValueOnce({
      success: true,
      data: basePayload(),
      meta: {},
    });
    const { fireEvent } = await import('@testing-library/react');
    renderPage();
    fireEvent.change(screen.getByLabelText('Academic year'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('Term'), { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: '2058' } });

    await waitFor(() => expect(screen.getByTestId('class-results-matrix')).toBeTruthy());
    expect(screen.getByTestId('class-results-coverage')).toBeTruthy();
    expect(screen.getByTestId('class-results-warnings')).toBeTruthy();
    expect(screen.getByText('0 / 20')).toBeTruthy();
    expect(screen.getByTestId('class-results-partial-hint')).toBeTruthy();
    expect(screen.getByTestId('class-results-no-average').getAttribute('data-has-average')).toBe(
      'false',
    );
    expect(screen.getByTestId('class-results-no-ranking').getAttribute('data-has-ranking')).toBe(
      'false',
    );
    expect(screen.queryByText(/publish|edit result|rank students/i)).toBeNull();
    expect(screen.getAllByText('Open gradebook').length).toBeGreaterThan(0);
  });

  it('renders multiple subjects and keeps duplicate columns', () => {
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
      {
        gradebook_id: 12,
        subject_id: 7,
        subject_name: 'Math',
        gradebook_state: 'open',
      },
    ];
    render(
      <LocaleProvider>
        <ClassResultsMatrix
          roster={[
            {
              student_id: 1,
              roster_sequence: 0,
              student_name: 'A',
              student_code: 'C1',
            },
          ]}
          subjects={subjects}
          matrix={[
            {
              student_id: 1,
              subject_results: [
                {
                  gradebook_id: 10,
                  status: 'complete',
                  score: 0,
                  max_score: 10,
                  normalized_score: 0,
                },
                {
                  gradebook_id: 11,
                  status: 'not_available',
                  score: null,
                  max_score: null,
                  normalized_score: null,
                  reason: 'student_not_in_gradebook_roster',
                },
                {
                  gradebook_id: 12,
                  status: 'not_computable',
                  score: null,
                  max_score: null,
                  normalized_score: null,
                  reason: 'participation_state_blocks_aggregation',
                },
              ],
            },
          ]}
        />
      </LocaleProvider>,
    );

    expect(screen.getAllByRole('columnheader').length).toBe(4);
    expect(document.querySelectorAll('th[data-gradebook-id]').length).toBe(3);
    expect(screen.getByText('0 / 10')).toBeTruthy();
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
    expect(screen.getByText('Not present in the gradebook roster')).toBeTruthy();
    expect(screen.getByTestId('class-results-not-computable-hint')).toBeTruthy();
    const notAvailableCell = document.querySelector(
      '[data-testid="class-results-cell"][data-status="not_available"]',
    );
    expect(notAvailableCell).toBeTruthy();
    expect(notAvailableCell?.querySelector('[data-testid="class-results-score"]')).toBeNull();
  });

  it('presents warnings panel and class-without-gradebooks empty guidance', () => {
    render(
      <LocaleProvider>
        <ClassResultsWarnings
          warnings={[
            {
              code: 'duplicate_subject_gradebooks',
              message: 'Two Arabic gradebooks',
              subject_code: 'AR',
            },
          ]}
        />
        <ClassResultsCoverage
          coverage={{
            gradebooks_count: 0,
            subjects_count: 0,
            roster_count: 26,
            students_with_all_subjects: 0,
            students_with_missing_subjects: 26,
            gradebooks_by_state: {},
            warnings_count: 1,
          }}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText('Duplicate subject gradebooks')).toBeTruthy();
    expect(screen.getByText('Two Arabic gradebooks')).toBeTruthy();
    expect(screen.getByTestId('class-results-coverage')).toBeTruthy();
    expect(screen.getAllByText('26').length).toBe(2);
  });

  it('shows no-context empty before selection and does not call API', () => {
    renderPage();
    expect(screen.getByText('Select year, term, and class')).toBeTruthy();
    expect(getClassMultiSubjectResults).not.toHaveBeenCalled();
  });
});
