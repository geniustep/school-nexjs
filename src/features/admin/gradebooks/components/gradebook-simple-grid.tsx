/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useMemo, useRef } from 'react';
import { useT } from '@/features/i18n/locale-context';
import type { GradebookRosterRow, GradebookStructure } from '@/types/gradebook';
import {
  buildSimpleColumns,
  type CellDraftValue,
  formatRosterSequence,
  preserveRosterOrder,
} from '../utils/gradebook-entry-draft';
import { GradebookScoreCell } from './gradebook-score-cell';

export function GradebookSimpleGrid({
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
  const columns = useMemo(() => buildSimpleColumns(structure), [structure]);
  const orderedRoster = preserveRosterOrder(roster);

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
      <table className="data gradebook-grid gradebook-grid--simple">
        <thead>
          <tr>
            <th className="gradebook-grid__student-col" scope="col">
              {t('actions.students')}
            </th>
            {columns.map((column) => (
              <th key={column.slot.slot_id} scope="col" title={column.slot.label}>
                {column.slot.label}
              </th>
            ))}
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
              {columns.map((column, colIndex) => {
                const { draft, editable } = getCellState(row.gradebook_student_id, column.cell.cell_id);
                return (
                  <GradebookScoreCell
                    key={column.cell.cell_id}
                    studentLineId={row.gradebook_student_id}
                    cellId={column.cell.cell_id}
                    maxScore={column.cell.effective_max_score}
                    score={draft.score}
                    scoreIsSet={draft.score_is_set}
                    participationState={draft.participation_state}
                    editable={editable}
                    rowIndex={rowIndex}
                    colIndex={colIndex}
                    onChange={(value) =>
                      onDraftChange(row.gradebook_student_id, column.cell.cell_id, {
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
