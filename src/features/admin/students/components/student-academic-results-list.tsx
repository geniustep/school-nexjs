/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useT } from '@/features/i18n/locale-context';
import { Badge } from '@/components/ui/primitives';
import type { StudentSubjectResultView } from '../utils/student-multi-subject-results-present';
import {
  formatResultNumeric,
  formatResultScorePair,
  isMissingStudentResultStatus,
  isNotComputableStudentResultStatus,
  isPartialStudentResultStatus,
  studentResultReasonLabelKey,
  studentResultStatusLabelKey,
} from '../utils/student-multi-subject-results-present';

function statusTone(status: string): 'green' | 'amber' | 'red' | 'slate' | 'blue' {
  if (status === 'complete') return 'green';
  if (status === 'partial') return 'amber';
  if (status === 'available') return 'blue';
  if (status === 'not_computable' || status === 'not_available') return 'red';
  return 'slate';
}

export function StudentAcademicResultsList({
  rows,
}: {
  rows: StudentSubjectResultView[];
}) {
  const t = useT();

  if (rows.length === 0) {
    return (
      <section
        className="student-academic-results-list card card--pad"
        data-testid="student-academic-results-list"
      >
        <h2 className="student-academic-results-section-title">
          {t('admin.student360.academic.results.title')}
        </h2>
        <p className="muted" data-testid="student-academic-results-empty">
          {t('admin.student360.academic.empty.resultsEmpty.description')}
        </p>
      </section>
    );
  }

  return (
    <section
      className="student-academic-results-list"
      data-testid="student-academic-results-list"
    >
      <h2 className="student-academic-results-section-title">
        {t('admin.student360.academic.results.title')}
      </h2>
      <div className="student-academic-results-cards">
        {rows.map((row, index) => {
          const pair = formatResultScorePair(row.score, row.max_score);
          const normalized = formatResultNumeric(row.normalized_score);
          const reasonKey = studentResultReasonLabelKey(row.reason);
          const missing = isMissingStudentResultStatus(row.status);
          const partial = isPartialStudentResultStatus(row.status);
          const notComputable = isNotComputableStudentResultStatus(row.status);
          const key = `${row.gradebook_id ?? 'x'}-${row.subject_id ?? 'x'}-${index}`;

          return (
            <article
              key={key}
              className="student-academic-result-card card card--pad"
              data-testid="student-academic-result-card"
              data-status={row.status}
            >
              <div className="student-academic-result-card__head">
                <div>
                  <h3 className="student-academic-result-card__title">{row.subject_name}</h3>
                  {row.subject_code ? (
                    <p className="muted tiny mono">{row.subject_code}</p>
                  ) : null}
                </div>
                <Badge tone={statusTone(String(row.status))}>
                  {t(studentResultStatusLabelKey(row.status))}
                </Badge>
              </div>

              {missing ? (
                <div className="student-academic-result-card__score is-missing" data-testid="student-academic-score">
                  {t('admin.student360.academic.results.notAvailable')}
                </div>
              ) : pair.score.kind === 'missing' ? (
                <div className="student-academic-result-card__score is-missing" data-testid="student-academic-score">
                  {t('admin.student360.academic.results.noScore')}
                </div>
              ) : (
                <div
                  className={
                    partial
                      ? 'student-academic-result-card__score is-provisional'
                      : 'student-academic-result-card__score'
                  }
                  data-testid="student-academic-score"
                >
                  {pair.text}
                </div>
              )}

              {partial ? (
                <p className="muted tiny" data-testid="student-academic-partial-hint">
                  {t('admin.student360.academic.results.partialHint')}
                </p>
              ) : null}

              {notComputable ? (
                <p className="muted tiny" data-testid="student-academic-not-computable-hint">
                  {t('admin.student360.academic.results.notComputableHint')}
                </p>
              ) : null}

              {normalized.kind === 'value' ? (
                <p className="muted tiny">
                  {t('admin.student360.academic.results.normalized', { value: normalized.text })}
                </p>
              ) : null}

              {row.completed_cells != null && row.expected_cells != null ? (
                <p className="muted tiny">
                  {t('admin.student360.academic.results.completion', {
                    value: `${row.completed_cells} / ${row.expected_cells}`,
                  })}
                </p>
              ) : null}

              {row.missing_cells != null && row.missing_cells > 0 ? (
                <p className="muted tiny">
                  {t('admin.student360.academic.results.missingCells', { count: row.missing_cells })}
                </p>
              ) : null}

              {row.gradebook_state ? (
                <p className="muted tiny">
                  {t('admin.student360.academic.results.gradebookState', {
                    state: row.gradebook_state,
                  })}
                </p>
              ) : null}

              {reasonKey ? (
                <p className="muted tiny" data-testid="student-academic-reason">
                  {t(reasonKey)}
                </p>
              ) : row.reason ? (
                <p className="muted tiny" data-testid="student-academic-reason">
                  {row.reason}
                </p>
              ) : null}

              {row.gradebook_id != null ? (
                <Link
                  className="btn btn--ghost btn--sm student-academic-result-card__link"
                  href={`/admin/academics/assessment/gradebooks/${row.gradebook_id}`}
                  data-testid="student-academic-gradebook-link"
                >
                  {t('admin.student360.academic.results.openGradebook')}
                </Link>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
