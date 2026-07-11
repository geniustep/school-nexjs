/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useMemo, useRef } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { GradebookRosterRow, GradebookStructure } from '@/types/gradebook';
import {
  buildCompositeColumnGroups,
  cellDraftKey,
  type CellDraftValue,
  formatRosterSequence,
  preserveRosterOrder,
} from '../utils/gradebook-entry-draft';
import { GradebookScoreCell } from './gradebook-score-cell';

export function GradebookCompositeGrid({
  structure,
  roster,
  getCellState,
  onDraftChange,
}: {
  structure: GradebookStructure;
  roster: GradebookRosterRow[];
  getCellState: (
    studentLineId: number,
    cellId: number,
  ) => { draft: CellDraftValue; editable: boolean };
  onDraftChange: (studentLineId: number, cellId: number, value: CellDraftValue) => void;
}) {
  const t = useT();
  const gridRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => buildCompositeColumnGroups(structure), [structure]);
  const orderedRoster = preserveRosterOrder(roster);
  const flatCells = useMemo(() => groups.flatMap((group) => group.cells), [groups]);

  function focusCell(rowIndex: number, colIndex: number) {
    const root = gridRef.current;
    if (!root) return;
    const selector = `input[data-row="${rowIndex}"][data-col="${colIndex}"]`;
    const input = root.querySelector<HTMLInputElement>(selector);
    input?.focus();
    input?.select();
  }

  return (
    <div className="gradebook-grid-wrap" ref={gridRef}>
      <table className="data gradebook-grid gradebook-grid--composite">
        <thead>
          <tr>
            <th className="gradebook-grid__student-col" rowSpan={2} scope="col">
              {t('actions.students')}
            </th>
            {groups.map((group) => (
              <th
                key={group.slot.slot_id}
                colSpan={group.cells.length}
                scope="colgroup"
                className="gradebook-grid__slot-head"
                title={group.slot.label}
              >
                {group.slot.label}
              </th>
            ))}
          </tr>
          <tr>
            {groups.flatMap((group) =>
              group.cells.map((cell) => (
                <th
                  key={cell.cell_id}
                  scope="col"
                  className="gradebook-grid__component-head"
                  title={cell.component_label ?? undefined}
                >
                  {cell.component_label ?? '—'}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {orderedRoster.map((row, rowIndex) => (
            <tr key={row.gradebook_student_id}>
              <th className="gradebook-grid__student-col" scope="row">
                <div className="gradebook-grid__student">
                  <span className="gradebook-grid__seq mono">{formatRosterSequence(row.roster_sequence)}</span>
                  <div className="gradebook-grid__student-meta">
                    <span className="gradebook-grid__name" dir="auto" title={row.display_name}>
                      {row.display_name}
                    </span>
                    {row.massar_code ? (
                      <span className="gradebook-grid__massar mono faint" dir="ltr" title={row.massar_code}>
                        {row.massar_code}
                      </span>
                    ) : null}
                  </div>
                </div>
              </th>
              {flatCells.map((cell, colIndex) => {
                const { draft, editable } = getCellState(row.gradebook_student_id, cell.cell_id);
                return (
                  <GradebookScoreCell
                    key={cell.cell_id}
                    studentLineId={row.gradebook_student_id}
                    cellId={cell.cell_id}
                    maxScore={cell.effective_max_score}
                    score={draft.score}
                    scoreIsSet={draft.score_is_set}
                    participationState={draft.participation_state}
                    editable={editable}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    onChange={(value) =>
                      onDraftChange(row.gradebook_student_id, cell.cell_id, {
                        ...draft,
                        ...value,
                      })
                    }
                    onNavigate={focusCell}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
