// @vitest-environment happy-dom

import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import type { GradebookResults, GradebookRosterRow, GradebookStructure } from '@/types/gradebook';
import { GradebookResultsView } from './gradebook-results-view';

vi.mock('../gradebook-workspace.css', () => ({}));

const getGradebookResults = vi.fn();

vi.mock('../api/gradebooks-api', () => ({
  getGradebookResults: (...args: unknown[]) => getGradebookResults(...args),
}));

const roster: GradebookRosterRow[] = [
  {
    gradebook_student_id: 240,
    student_id: 1705,
    display_name: 'محمد أمين',
    massar_code: 'A231056026',
    roster_sequence: 1,
  },
  {
    gradebook_student_id: 241,
    student_id: 1706,
    display_name: 'سارة العلوي',
    roster_sequence: 2,
  },
];

const structure: GradebookStructure = {
  mode: 'simple',
  slots: [
    { slot_id: 167, label: 'فرض 1', sequence: 1 },
    { slot_id: 168, label: 'فرض 2', sequence: 2 },
  ],
  cells: [
    { cell_id: 213, slot_id: 167, effective_max_score: 10 },
    { cell_id: 214, slot_id: 168, effective_max_score: 10 },
  ],
};

const sampleResults: GradebookResults = {
  gradebook_id: 223,
  state: 'open',
  mode: 'simple',
  scheme_id: 129,
  scheme_version: 1,
  students: [
    {
      student_line_id: 240,
      student_id: 1705,
      cells: [
        {
          cell_id: 213,
          slot_id: 167,
          component_id: null,
          score: 0,
          score_is_set: true,
          participation_state: 'taken',
          max_score: 10,
          normalized_score: 0,
          included_in_aggregation: true,
        },
      ],
      slots: [
        {
          slot_id: 167,
          weight: 1,
          status: 'complete',
          score: 0,
          max_score: 10,
          normalized_score: 0,
          completed_cells: 1,
          expected_cells: 1,
          included_cells: 1,
          missing_cells: 0,
          blocking_cells: 0,
        },
        {
          slot_id: 168,
          weight: 1,
          status: 'not_computable',
          score: null,
          max_score: null,
          normalized_score: null,
          completed_cells: 1,
          expected_cells: 1,
          included_cells: 0,
          missing_cells: 0,
          blocking_cells: 1,
          reason: 'participation_state_blocks_aggregation',
        },
      ],
      aggregate: {
        status: 'not_computable',
        score: null,
        max_score: null,
        normalized_score: null,
        completed_cells: 2,
        expected_cells: 2,
        included_cells: 1,
        missing_cells: 0,
        blocking_cells: 1,
        reason: 'participation_state_blocks_aggregation',
      },
    },
    {
      student_line_id: 241,
      student_id: 1706,
      cells: [],
      slots: [
        {
          slot_id: 167,
          status: 'available',
          score: null,
          max_score: null,
          normalized_score: null,
          completed_cells: 0,
          expected_cells: 1,
          included_cells: 0,
          missing_cells: 1,
          blocking_cells: 0,
        },
      ],
      aggregate: {
        status: 'partial',
        score: 5,
        max_score: 10,
        normalized_score: 0.5,
        completed_cells: 1,
        expected_cells: 2,
        included_cells: 1,
        missing_cells: 1,
        blocking_cells: 0,
      },
    },
  ],
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
  getGradebookResults.mockReset();
});

afterEach(() => {
  cleanup();
});

describe('GradebookResultsView', () => {
  it('loads via admin role adapter and renders statuses without ranking actions', async () => {
    getGradebookResults.mockResolvedValueOnce({
      success: true,
      data: sampleResults,
      meta: {},
    });

    render(
      <LocaleProvider>
        <GradebookResultsView
          gradebookId={223}
          role="admin"
          roster={roster}
          structure={structure}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Loading results/i)).toBeTruthy();
    expect(screen.queryByText(/No results/i)).toBeNull();

    await waitFor(() => {
      expect(screen.getByTestId('gradebook-results-view')).toBeTruthy();
    });

    expect(getGradebookResults).toHaveBeenCalledWith({ role: 'admin', gradebookId: 223 });
    expect(screen.getByText('محمد أمين')).toBeTruthy();
    expect(screen.getAllByText('Not computable').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partial').length).toBeGreaterThan(0);
    expect(screen.getByText('Partial result — not final')).toBeTruthy();
    expect(screen.getByText('0 / 10')).toBeTruthy();
    expect(screen.queryByText(/rank/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /publish|override|validate/i })).toBeNull();
  });

  it('loads via teacher role adapter and maps completed/missing cells', async () => {
    getGradebookResults.mockResolvedValueOnce({
      success: true,
      data: sampleResults,
      meta: {},
    });

    render(
      <LocaleProvider>
        <GradebookResultsView
          gradebookId={223}
          role="teacher"
          roster={roster}
          structure={structure}
        />
      </LocaleProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('gradebook-results-view')).toBeTruthy();
    });

    expect(getGradebookResults).toHaveBeenCalledWith({ role: 'teacher', gradebookId: 223 });
    expect(screen.getByText('سارة العلوي')).toBeTruthy();
    expect(screen.getByTestId('gradebook-results-summary').textContent).toMatch(/Students/);
    expect(screen.queryByText(/class rank|student rank|ranking/i)).toBeNull();
  });

  it('does not show empty state while loading', async () => {
    const deferred: { resolve: ((value: unknown) => void) | null } = { resolve: null };
    getGradebookResults.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          deferred.resolve = resolve;
        }),
    );

    render(
      <LocaleProvider>
        <GradebookResultsView
          gradebookId={223}
          role="admin"
          roster={roster}
          structure={structure}
        />
      </LocaleProvider>,
    );

    expect(screen.getByText(/Loading results/i)).toBeTruthy();
    expect(screen.queryByText(/No results/i)).toBeNull();

    deferred.resolve?.({
      success: true,
      data: { ...sampleResults, students: [] },
      meta: {},
    });

    await waitFor(() => {
      expect(screen.getByText(/No results/i)).toBeTruthy();
    });
  });
});
