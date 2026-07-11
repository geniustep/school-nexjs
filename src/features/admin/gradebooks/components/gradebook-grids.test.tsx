// @vitest-environment happy-dom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/features/i18n/locale-context';
import { LOCALE_STORAGE_KEY } from '@/lib/i18n/config';
import { GradebookSimpleGrid } from '../components/gradebook-simple-grid';
import { GradebookCompositeGrid } from '../components/gradebook-composite-grid';
import type { GradebookRosterRow, GradebookStructure } from '@/types/gradebook';
import { defaultDraftForEntry } from '../utils/gradebook-entry-draft';

vi.mock('../gradebook-workspace.css', () => ({}));

const roster: GradebookRosterRow[] = [
  {
    gradebook_student_id: 1,
    student_id: 10,
    display_name: 'محمد أمين',
    massar_code: 'A231056026',
    roster_sequence: 1,
  },
];

const simpleStructure: GradebookStructure = {
  mode: 'simple',
  slots: [{ slot_id: 1, label: 'Slot 1', sequence: 1 }],
  cells: [{ cell_id: 11, slot_id: 1, effective_max_score: 10 }],
};

const compositeStructure: GradebookStructure = {
  mode: 'composite',
  slots: [
    { slot_id: 1, label: 'فرض 1', sequence: 1 },
    { slot_id: 2, label: 'فرض 2', sequence: 2 },
  ],
  components: [
    { component_id: 1, label: 'قراءة' },
    { component_id: 2, label: 'إملاء' },
  ],
  cells: [
    { cell_id: 101, slot_id: 1, component_id: 1, component_label: 'قر', effective_max_score: 10 },
    { cell_id: 102, slot_id: 1, component_id: 2, component_label: 'إمل', effective_max_score: 10 },
    { cell_id: 201, slot_id: 2, component_id: 1, component_label: 'قر', effective_max_score: 10 },
    { cell_id: 202, slot_id: 2, component_id: 2, component_label: 'إمل', effective_max_score: 10 },
  ],
};

beforeEach(() => {
  localStorage.setItem(LOCALE_STORAGE_KEY, 'en');
});

afterEach(() => {
  cleanup();
});

function getCellState() {
  return {
    draft: defaultDraftForEntry({
      student_line_id: 1,
      cell_id: 11,
      score: null,
      score_is_set: false,
      participation_state: 'not_entered',
      editable: true,
    }),
    editable: true,
  };
}

describe('gradebook grids', () => {
  it('renders simple grid with slot headers and roster sequence', () => {
    render(
      <LocaleProvider>
        <GradebookSimpleGrid
          structure={simpleStructure}
          roster={roster}
          getCellState={getCellState}
          onDraftChange={() => undefined}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText('Slot 1')).toBeTruthy();
    expect(screen.getByText('محمد أمين')).toBeTruthy();
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('A231056026')).toBeTruthy();
  });

  it('renders composite grouped headers for slots and components', () => {
    render(
      <LocaleProvider>
        <GradebookCompositeGrid
          structure={compositeStructure}
          roster={roster}
          getCellState={(studentLineId, cellId) => ({
            draft: defaultDraftForEntry({
              student_line_id: studentLineId,
              cell_id: cellId,
              score: null,
              score_is_set: false,
              participation_state: 'not_entered',
              editable: true,
            }),
            editable: true,
          })}
          onDraftChange={() => undefined}
        />
      </LocaleProvider>,
    );
    expect(screen.getByText('فرض 1')).toBeTruthy();
    expect(screen.getByText('فرض 2')).toBeTruthy();
    expect(screen.getAllByText('قر').length).toBe(2);
    expect(screen.getAllByText('إمل').length).toBe(2);
  });
});
