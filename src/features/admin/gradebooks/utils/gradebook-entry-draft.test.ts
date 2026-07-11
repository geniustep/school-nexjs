import { describe, expect, it } from 'vitest';
import {
  buildBatchPayload,
  buildCompositeColumnGroups,
  buildSimpleColumns,
  cellDraftKey,
  countDirtyCells,
  defaultDraftForEntry,
  preserveRosterOrder,
  type CellBaselineValue,
  type CellDraftValue,
} from './gradebook-entry-draft';
import type { GradebookMatrixEntry, GradebookRosterRow, GradebookStructure } from '@/types/gradebook';

const simpleStructure: GradebookStructure = {
  mode: 'simple',
  slots: [
    { slot_id: 1, label: 'Slot 1', sequence: 1 },
    { slot_id: 2, label: 'Slot 2', sequence: 2 },
  ],
  cells: [
    { cell_id: 11, slot_id: 1, effective_max_score: 10 },
    { cell_id: 12, slot_id: 2, effective_max_score: 20 },
  ],
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

describe('gradebook-entry-draft', () => {
  it('preserves API roster order without local sort', () => {
    const roster: GradebookRosterRow[] = [
      { gradebook_student_id: 3, student_id: 30, display_name: 'C', roster_sequence: 3 },
      { gradebook_student_id: 1, student_id: 10, display_name: 'A', roster_sequence: 1 },
      { gradebook_student_id: 2, student_id: 20, display_name: 'B', roster_sequence: 2 },
    ];
    expect(preserveRosterOrder(roster).map((row) => row.roster_sequence)).toEqual([3, 1, 2]);
  });

  it('tracks dirty cells and builds batch payload', () => {
    const baseline = new Map<`${number}:${number}`, CellBaselineValue>([
      [cellDraftKey(1, 11), {
        score: null,
        score_is_set: false,
        participation_state: 'not_entered',
        editable: true,
      }],
    ]);
    const drafts = new Map<`${number}:${number}`, CellDraftValue>([
      [cellDraftKey(1, 11), {
        score: 0,
        score_is_set: true,
        participation_state: 'taken',
      }],
    ]);
    expect(countDirtyCells(baseline, drafts)).toBe(1);
    expect(buildBatchPayload(baseline, drafts)).toEqual([
      {
        student_line_id: 1,
        cell_id: 11,
        score: 0,
        score_is_set: true,
        participation_state: 'taken',
        comment: null,
      },
    ]);
  });

  it('builds simple columns from API structure', () => {
    const columns = buildSimpleColumns(simpleStructure);
    expect(columns.map((column) => column.cell.cell_id)).toEqual([11, 12]);
  });

  it('builds composite groups with independent cells per slot', () => {
    const groups = buildCompositeColumnGroups(compositeStructure);
    expect(groups).toHaveLength(2);
    expect(groups[0].cells.map((cell) => cell.cell_id)).toEqual([101, 102]);
    expect(groups[1].cells.map((cell) => cell.cell_id)).toEqual([201, 202]);
  });

  it('defaults draft from matrix entry including score zero', () => {
    const entry: GradebookMatrixEntry = {
      student_line_id: 1,
      cell_id: 11,
      score: 0,
      score_is_set: true,
      participation_state: 'taken',
      editable: true,
    };
    expect(defaultDraftForEntry(entry).score).toBe(0);
    expect(defaultDraftForEntry(entry).score_is_set).toBe(true);
  });
});
