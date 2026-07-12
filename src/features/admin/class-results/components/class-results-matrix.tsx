/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import type {
  ClassMultiSubjectCellResult,
  ClassMultiSubjectColumn,
  ClassMultiSubjectMatrixRow,
  ClassMultiSubjectRosterRow,
} from '@/types/class-multi-subject-results';
import {
  classResultReasonLabelKey,
  classResultStatusLabelKey,
  findSubjectResultForColumn,
  formatResultNumeric,
  formatResultScorePair,
  isDuplicateSubjectColumn,
  isFinalSubjectStatus,
  isMissingSubjectStatus,
  matrixRowByStudentId,
  subjectColumnLabel,
} from '../utils/class-results-present';

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const tone =
    status === 'complete'
      ? 'is-complete'
      : status === 'partial'
        ? 'is-partial'
        : status === 'not_computable' || status === 'not_available'
          ? 'is-blocked'
          : 'is-available';
  return (
    <span className={`class-results-status ${tone}`} data-status={status}>
      {t(classResultStatusLabelKey(status))}
    </span>
  );
}

function SubjectCell({
  cell,
  column,
}: {
  cell: ClassMultiSubjectCellResult | null;
  column: ClassMultiSubjectColumn;
}) {
  const t = useT();

  if (!cell || isMissingSubjectStatus(cell.status)) {
    const reasonKey = classResultReasonLabelKey(cell?.reason);
    return (
      <div className="class-results-cell" data-testid="class-results-cell" data-status="not_available">
        <StatusBadge status={cell?.status ?? 'not_available'} />
        <div className="class-results-cell__score class-results-missing">
          {t('admin.classResults.cell.notAvailable')}
        </div>
        {reasonKey ? <div className="muted tiny">{t(reasonKey)}</div> : null}
        {!reasonKey && cell?.reason ? <div className="muted tiny">{cell.reason}</div> : null}
      </div>
    );
  }

  const pair = formatResultScorePair(cell.score, cell.max_score);
  const normalized = formatResultNumeric(cell.normalized_score);
  const final = isFinalSubjectStatus(cell.status);
  const reasonKey = classResultReasonLabelKey(cell.reason);
  const completed =
    cell.completed_cells != null && cell.expected_cells != null
      ? `${cell.completed_cells} / ${cell.expected_cells}`
      : null;

  return (
    <div className="class-results-cell" data-testid="class-results-cell" data-status={cell.status}>
      {pair.score.kind === 'missing' ? (
        <div className="class-results-cell__score class-results-missing">
          {t('admin.classResults.cell.noScore')}
        </div>
      ) : (
        <div
          className={
            final ? 'class-results-cell__score' : 'class-results-cell__score is-provisional'
          }
          data-testid="class-results-score"
        >
          {pair.text}
        </div>
      )}
      <StatusBadge status={String(cell.status)} />
      {completed ? (
        <div className="muted tiny">
          {t('admin.classResults.cell.completion', { value: completed })}
        </div>
      ) : null}
      {cell.missing_cells != null && cell.missing_cells > 0 ? (
        <div className="muted tiny">
          {t('admin.classResults.cell.missingCells', { count: cell.missing_cells })}
        </div>
      ) : null}
      {cell.status === 'partial' ? (
        <div className="muted tiny" data-testid="class-results-partial-hint">
          {t('admin.classResults.cell.partialHint')}
        </div>
      ) : null}
      {cell.status === 'not_computable' ? (
        <div className="muted tiny" data-testid="class-results-not-computable-hint">
          {reasonKey ? t(reasonKey) : cell.reason || t('admin.classResults.cell.notComputableHint')}
        </div>
      ) : null}
      {normalized.kind === 'value' ? (
        <div className="muted tiny">
          {t('admin.classResults.cell.normalized', { value: normalized.text })}
        </div>
      ) : null}
      {(cell.gradebook_state || column.gradebook_state) && (
        <div className="muted tiny">
          {t('admin.classResults.cell.gradebookState', {
            state: cell.gradebook_state || column.gradebook_state,
          })}
        </div>
      )}
    </div>
  );
}

export function ClassResultsMatrix({
  roster,
  subjects,
  matrix,
}: {
  roster: ClassMultiSubjectRosterRow[];
  subjects: ClassMultiSubjectColumn[];
  matrix: ClassMultiSubjectMatrixRow[];
}) {
  const t = useT();

  if (roster.length === 0) {
    return null;
  }

  return (
    <section className="class-results-matrix card card--pad" data-testid="class-results-matrix">
      <div className="class-results-matrix__header">
        <h2 className="class-results-section-title">{t('admin.classResults.matrix.title')}</h2>
        <p className="muted tiny">{t('admin.classResults.matrix.narrowHint')}</p>
      </div>

      <div className="class-results-matrix__scroll">
        <table className="class-results-table">
          <thead>
            <tr>
              <th className="class-results-table__student-col">
                {t('admin.classResults.matrix.student')}
              </th>
              {subjects.map((column) => {
                const duplicate = isDuplicateSubjectColumn(column, subjects);
                return (
                  <th
                    key={`subject-${column.gradebook_id}-${column.subject_id}`}
                    data-gradebook-id={column.gradebook_id}
                    data-subject-id={column.subject_id}
                  >
                    <div className="class-results-table__subject-head">
                      <span>{subjectColumnLabel(column, duplicate)}</span>
                      {column.gradebook_id ? (
                        <Link
                          href={`/admin/academics/assessment/gradebooks/${column.gradebook_id}`}
                          className="btn btn--ghost btn--sm"
                        >
                          {t('admin.classResults.matrix.openGradebook')}
                        </Link>
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {roster.map((student) => {
              const row = matrixRowByStudentId(matrix, student.student_id);
              return (
                <tr key={student.student_id} data-student-id={student.student_id}>
                  <th scope="row" className="class-results-table__student-col">
                    <div className="class-results-student">
                      <span className="class-results-student__seq muted tiny">
                        {t('admin.classResults.matrix.sequence', {
                          value: student.roster_sequence,
                        })}
                      </span>
                      <span className="class-results-student__name">{student.student_name}</span>
                      {student.student_code ? (
                        <span className="muted tiny">{student.student_code}</span>
                      ) : null}
                    </div>
                  </th>
                  {subjects.map((column) => (
                    <td
                      key={`${student.student_id}-${column.gradebook_id}`}
                      data-gradebook-id={column.gradebook_id}
                    >
                      <SubjectCell
                        cell={findSubjectResultForColumn(row, column)}
                        column={column}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
