/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiErrorView, EmptyState, LoadingState } from '@/components/states/states';
import { useT } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type {
  GradebookResults,
  GradebookRosterRow,
  GradebookStructure,
  GradebookStudentResult,
} from '@/types/gradebook';
import {
  getGradebookResults,
  type GradebookWorkspaceApiRole,
} from '../api/gradebooks-api';
import {
  countGradebookResultStatuses,
  formatResultNumeric,
  formatResultScorePair,
  gradebookResultStatusLabelKey,
  isFinalAggregateStatus,
  orderedSlotIdsFromResults,
  resolveStudentDisplayName,
  slotLabelFromStructure,
} from '../utils/gradebook-results-present';

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const tone =
    status === 'complete'
      ? 'is-complete'
      : status === 'partial'
        ? 'is-partial'
        : status === 'not_computable'
          ? 'is-blocked'
          : 'is-available';
  return (
    <span className={`gradebook-result-status ${tone}`}>
      {t(gradebookResultStatusLabelKey(status))}
    </span>
  );
}

function NumericCell({ value }: { value: number | null | undefined }) {
  const disp = formatResultNumeric(value);
  if (disp.kind === 'missing') {
    return <span className="gradebook-result-missing">{'—'}</span>;
  }
  return <span className="gradebook-result-value">{disp.text}</span>;
}

function AggregateCell({ row }: { row: GradebookStudentResult }) {
  const t = useT();
  const agg = row.aggregate;
  const pair = formatResultScorePair(agg.score, agg.max_score);
  const normalized = formatResultNumeric(agg.normalized_score);
  const final = isFinalAggregateStatus(agg.status);

  return (
    <div className="gradebook-result-aggregate">
      <div className="gradebook-result-aggregate__score">
        {pair.score.kind === 'missing' ? (
          <span className="gradebook-result-missing">{t('admin.gradebooks.results.noScore')}</span>
        ) : (
          <span className={final ? 'gradebook-result-value' : 'gradebook-result-value is-provisional'}>
            {pair.text}
          </span>
        )}
      </div>
      {normalized.kind === 'value' ? (
        <div className="gradebook-result-aggregate__norm muted tiny">
          {t('admin.gradebooks.results.normalized', { value: normalized.text })}
        </div>
      ) : null}
      {!final && agg.status === 'partial' && pair.score.kind === 'value' ? (
        <div className="gradebook-result-aggregate__hint muted tiny">
          {t('admin.gradebooks.results.partialHint')}
        </div>
      ) : null}
      {agg.status === 'not_computable' && agg.reason ? (
        <div className="gradebook-result-aggregate__hint muted tiny">
          {t('admin.gradebooks.results.notComputableHint')}
        </div>
      ) : null}
    </div>
  );
}

export function GradebookResultsView({
  gradebookId,
  role,
  roster,
  structure,
}: {
  gradebookId: number;
  role: GradebookWorkspaceApiRole;
  roster: GradebookRosterRow[];
  structure: GradebookStructure;
}) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [data, setData] = useState<GradebookResults | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void getGradebookResults({ role, gradebookId }).then((res) => {
      if (!active) return;
      if (res.success && res.data) {
        setData(res.data);
        setError(null);
      } else if (!res.success) {
        setError(res.error);
        setData(null);
      } else {
        setData(null);
        setError(null);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [gradebookId, role, nonce]);

  const statusCounts = useMemo(
    () => countGradebookResultStatuses(data?.students),
    [data?.students],
  );
  const slotIds = useMemo(
    () => orderedSlotIdsFromResults(data?.students ?? [], structure),
    [data?.students, structure],
  );

  if (loading) {
    return <LoadingState label={t('admin.gradebooks.results.loading')} />;
  }

  if (error) {
    return <ApiErrorView error={error} onRetry={() => setNonce((n) => n + 1)} />;
  }

  if (!data || !data.students.length) {
    return (
      <EmptyState
        icon="📊"
        title={t('admin.gradebooks.results.empty.title')}
        description={t('admin.gradebooks.results.empty.description')}
      />
    );
  }

  return (
    <div className="gradebook-results" data-testid="gradebook-results-view">
      <div className="gradebook-results__summary card card--pad" data-testid="gradebook-results-summary">
        <div className="gradebook-results__summary-grid">
          <div className="gradebook-results__summary-item">
            <span className="gradebook-header__label">{t('admin.gradebooks.results.summary.students')}</span>
            <strong>{statusCounts.studentsTotal}</strong>
          </div>
          <div className="gradebook-results__summary-item">
            <span className="gradebook-header__label">{t('admin.gradebooks.results.status.complete')}</span>
            <strong>{statusCounts.complete}</strong>
          </div>
          <div className="gradebook-results__summary-item">
            <span className="gradebook-header__label">{t('admin.gradebooks.results.status.partial')}</span>
            <strong>{statusCounts.partial}</strong>
          </div>
          <div className="gradebook-results__summary-item">
            <span className="gradebook-header__label">{t('admin.gradebooks.results.status.not_computable')}</span>
            <strong>{statusCounts.notComputable}</strong>
          </div>
          <div className="gradebook-results__summary-item">
            <span className="gradebook-header__label">{t('admin.gradebooks.results.status.available')}</span>
            <strong>{statusCounts.available}</strong>
          </div>
        </div>
        <p className="muted tiny gradebook-results__summary-note">
          {t('admin.gradebooks.results.summary.note')}
        </p>
      </div>

      <p className="gradebook-narrow-hint muted">{t('admin.gradebooks.results.narrowHint')}</p>

      <div className="gradebook-grid-wrap gradebook-results__table-wrap">
        <table className="gradebook-grid gradebook-results-table" data-mode={data.mode}>
          <thead>
            <tr>
              <th className="gradebook-grid__student-col">{t('admin.gradebooks.results.columns.student')}</th>
              <th>{t('admin.gradebooks.results.columns.status')}</th>
              <th>{t('admin.gradebooks.results.columns.aggregate')}</th>
              <th>{t('admin.gradebooks.results.columns.completed')}</th>
              <th>{t('admin.gradebooks.results.columns.missing')}</th>
              {slotIds.map((slotId) => (
                <th key={slotId}>{slotLabelFromStructure(slotId, structure)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.students.map((row) => {
              const name = resolveStudentDisplayName(row, roster);
              const slotById = new Map((row.slots ?? []).map((s) => [s.slot_id, s]));
              return (
                <tr key={row.student_line_id} data-student-line-id={row.student_line_id}>
                  <td className="gradebook-grid__student-col">
                    <div className="gradebook-grid__student">
                      <span className="gradebook-grid__name">{name}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={String(row.aggregate.status)} />
                  </td>
                  <td>
                    <AggregateCell row={row} />
                  </td>
                  <td>
                    <NumericCell value={row.aggregate.completed_cells} />
                    <span className="muted tiny">
                      {' / '}
                      <NumericCell value={row.aggregate.expected_cells} />
                    </span>
                  </td>
                  <td>
                    <NumericCell value={row.aggregate.missing_cells} />
                  </td>
                  {slotIds.map((slotId) => {
                    const slot = slotById.get(slotId);
                    if (!slot) {
                      return (
                        <td key={slotId}>
                          <span className="gradebook-result-missing">—</span>
                        </td>
                      );
                    }
                    const pair = formatResultScorePair(slot.score, slot.max_score);
                    return (
                      <td key={slotId}>
                        <div className="gradebook-result-slot">
                          <StatusBadge status={String(slot.status)} />
                          <div>
                            {pair.score.kind === 'missing' ? (
                              <span className="gradebook-result-missing">—</span>
                            ) : (
                              <span className="gradebook-result-value">{pair.text}</span>
                            )}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
