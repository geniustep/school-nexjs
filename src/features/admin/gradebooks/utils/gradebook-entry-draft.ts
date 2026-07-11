import type {
  AssessmentSlot,
  BatchEntryUpdateItem,
  GradebookMatrixEntry,
  GradebookRosterRow,
  GradebookStructure,
  ParticipationState,
  ScorableCell,
} from '@/types/gradebook';

export type CellDraftKey = `${number}:${number}`;

export interface CellDraftValue {
  score: number | null;
  score_is_set: boolean;
  participation_state: ParticipationState;
  comment?: string | null;
}

export interface CellBaselineValue extends CellDraftValue {
  editable: boolean;
}

export function cellDraftKey(studentLineId: number, cellId: number): CellDraftKey {
  return `${studentLineId}:${cellId}`;
}

export function parseCellDraftKey(key: CellDraftKey): { studentLineId: number; cellId: number } {
  const [studentLineId, cellId] = key.split(':').map(Number);
  return { studentLineId, cellId };
}

export function buildBaselineMap(
  matrix: GradebookMatrixEntry[],
): Map<CellDraftKey, CellBaselineValue> {
  const map = new Map<CellDraftKey, CellBaselineValue>();
  for (const entry of matrix) {
    map.set(cellDraftKey(entry.student_line_id, entry.cell_id), {
      score: entry.score,
      score_is_set: entry.score_is_set,
      participation_state: entry.participation_state,
      comment: entry.comment ?? null,
      editable: entry.editable,
    });
  }
  return map;
}

export function isDraftDirty(
  baseline: CellBaselineValue,
  draft: CellDraftValue,
): boolean {
  return (
    baseline.score !== draft.score ||
    baseline.score_is_set !== draft.score_is_set ||
    baseline.participation_state !== draft.participation_state ||
    (baseline.comment ?? null) !== (draft.comment ?? null)
  );
}

export function countDirtyCells(
  baseline: Map<CellDraftKey, CellBaselineValue>,
  drafts: Map<CellDraftKey, CellDraftValue>,
): number {
  let count = 0;
  for (const [key, draft] of drafts) {
    const base = baseline.get(key);
    if (!base?.editable) continue;
    if (isDraftDirty(base, draft)) count += 1;
  }
  return count;
}

export function buildBatchPayload(
  baseline: Map<CellDraftKey, CellBaselineValue>,
  drafts: Map<CellDraftKey, CellDraftValue>,
): BatchEntryUpdateItem[] {
  const items: BatchEntryUpdateItem[] = [];
  for (const [key, draft] of drafts) {
    const base = baseline.get(key);
    if (!base?.editable) continue;
    if (!isDraftDirty(base, draft)) continue;
    const { studentLineId, cellId } = parseCellDraftKey(key);
    items.push({
      student_line_id: studentLineId,
      cell_id: cellId,
      score: draft.score,
      score_is_set: draft.score_is_set,
      participation_state: draft.participation_state,
      comment: draft.comment ?? null,
    });
  }
  return items;
}

export function applySavedEntries(
  baseline: Map<CellDraftKey, CellBaselineValue>,
  drafts: Map<CellDraftKey, CellDraftValue>,
  saved: GradebookMatrixEntry[],
): {
  baseline: Map<CellDraftKey, CellBaselineValue>;
  drafts: Map<CellDraftKey, CellDraftValue>;
} {
  const nextBaseline = new Map(baseline);
  const nextDrafts = new Map(drafts);
  for (const entry of saved) {
    const key = cellDraftKey(entry.student_line_id, entry.cell_id);
    const value: CellBaselineValue = {
      score: entry.score,
      score_is_set: entry.score_is_set,
      participation_state: entry.participation_state,
      comment: entry.comment ?? null,
      editable: entry.editable,
    };
    nextBaseline.set(key, value);
    nextDrafts.set(key, {
      score: value.score,
      score_is_set: value.score_is_set,
      participation_state: value.participation_state,
      comment: value.comment ?? null,
    });
  }
  return { baseline: nextBaseline, drafts: nextDrafts };
}

export interface SimpleColumn {
  slot: AssessmentSlot;
  cell: ScorableCell;
}

export interface CompositeColumnGroup {
  slot: AssessmentSlot;
  cells: ScorableCell[];
}

export function buildSimpleColumns(structure: GradebookStructure): SimpleColumn[] {
  const sortedSlots = [...structure.slots].sort(
    (a, b) => (a.sequence ?? a.slot_id) - (b.sequence ?? b.slot_id),
  );
  return sortedSlots
    .map((slot) => {
      const cell = structure.cells.find((item) => item.slot_id === slot.slot_id);
      if (!cell) return null;
      return { slot, cell };
    })
    .filter((column): column is SimpleColumn => column != null);
}

export function buildCompositeColumnGroups(structure: GradebookStructure): CompositeColumnGroup[] {
  const sortedSlots = [...structure.slots].sort(
    (a, b) => (a.sequence ?? a.slot_id) - (b.sequence ?? b.slot_id),
  );
  return sortedSlots.map((slot) => ({
    slot,
    cells: structure.cells
      .filter((cell) => cell.slot_id === slot.slot_id)
      .sort((a, b) => (a.component_id ?? 0) - (b.component_id ?? 0)),
  }));
}

export function preserveRosterOrder(roster: GradebookRosterRow[]): GradebookRosterRow[] {
  return roster;
}

export function formatRosterSequence(sequence: number): string {
  return String(sequence).padStart(2, '0');
}

export function findMatrixEntry(
  matrix: GradebookMatrixEntry[],
  studentLineId: number,
  cellId: number,
): GradebookMatrixEntry | undefined {
  return matrix.find(
    (entry) => entry.student_line_id === studentLineId && entry.cell_id === cellId,
  );
}

export function participationSetsScore(state: ParticipationState): boolean {
  return state === 'taken';
}

export function defaultDraftForEntry(entry: GradebookMatrixEntry): CellDraftValue {
  return {
    score: entry.score,
    score_is_set: entry.score_is_set,
    participation_state: entry.participation_state,
    comment: entry.comment ?? null,
  };
}
