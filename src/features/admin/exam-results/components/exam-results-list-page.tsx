'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { ExamResultsListFilters } from '@/features/admin/exam-results/components/exam-results-list-filters';
import {
  EXAM_RESULTS_PAGE_SIZE,
  examResultsListHasActiveQuery,
  formatExamResultListDate,
  formatExamResultScore,
  resolveExamResultsListEmptyVariant,
} from '@/features/admin/exam-results/utils/exam-results-list-present';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { hasPermission } from '@/lib/permissions/permissions';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { ListParams } from '@/types/api';
import type { ExamResult } from '@/types/exam';
import '@/features/admin/exam-results/exam-results-list.css';

function readInitialClassId(searchParams: URLSearchParams | null): string {
  const raw = searchParams?.get('class_id')?.trim() ?? '';
  return raw || '';
}

export function ExamResultsListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { formatDate } = useFormat();

  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState(() => readInitialClassId(searchParams));
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [classId, stateFilter]);

  const hasActiveQuery = examResultsListHasActiveQuery({ classId, stateFilter });
  const hasActiveFilters = hasActiveQuery;

  const params: ListParams = {
    page,
    page_size: EXAM_RESULTS_PAGE_SIZE,
    class_id: classId || undefined,
    state: stateFilter || undefined,
  };

  const state = useAdminResource<ExamResult[]>(endpoints.admin.examResults, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(
    endpoints.admin.classes,
  );
  const pg = state.meta?.pagination;

  const canShowListActions = hasPermission(user, 'export_data');

  const resetFilters = useCallback(() => {
    setClassId('');
    setStateFilter('');
    setPage(1);
  }, []);

  const emptyVariant = resolveExamResultsListEmptyVariant({ hasActiveQuery });

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.examResultsList.noMatch.title')}
        description={t('admin.examResultsList.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.examResultsList.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📊"
        title={t('admin.examResultsList.noData.title')}
        description={t('admin.examResultsList.noData.description')}
      />
    );

  const columns: Column<ExamResult>[] = useMemo(
    () => [
      {
        key: 'student',
        header: t('actions.students'),
        render: (r) => {
          const name = getStudentDisplayName(r.student);
          const code = r.student?.massar_code?.trim() || '';
          return (
            <div className="exam-results-list__student">
              <strong className="exam-results-list__name" dir="auto" title={name}>
                {name}
              </strong>
              {code ? (
                <span className="exam-results-list__code mono muted" dir="ltr" title={code}>
                  {code}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'exam',
        header: t('academic.exam'),
        render: (r) => {
          const label = r.exam?.name ?? t('common.dash');
          return (
            <span className="exam-results-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (r) => {
          const label = r.class?.name ?? t('common.dash');
          return (
            <span className="exam-results-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (r) => {
          const label = r.subject?.name ?? t('common.dash');
          return (
            <span className="exam-results-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'score',
        header: t('academic.score'),
        render: (r) => (
          <span className="exam-results-list__score" dir="ltr">
            {formatExamResultScore(r.score, r.max_score, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'grade',
        header: t('academic.grade'),
        render: (r) => {
          const label = r.grade_label ?? t('common.dash');
          return (
            <span className="exam-results-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (r) => <WorkflowBadge state={r.state} />,
      },
      {
        key: 'date',
        header: t('academic.date'),
        render: (r) => (
          <span className="exam-results-list__date" dir="ltr">
            {formatExamResultListDate(r.exam?.exam_date, formatDate, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (r) => (
          <div
            className="exam-results-list__row-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <Link
              href={`/admin/exams/${r.exam.id}/results`}
              className="exam-results-list__view-link"
              aria-label={t('common.view')}
              title={t('common.view')}
            >
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ),
      },
    ],
    [t, formatDate],
  );

  return (
    <div className="admin-workspace exam-results-list-page">
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader
        title={t('nav.results')}
        subtitle={
          pg
            ? t('admin.examResultsList.subtitleWithCount', { total: pg.total })
            : t('admin.examResultsListDesc')
        }
        actions={
          canShowListActions ? (
            <div className="exam-results-list__header-actions">
              <AdminListActions
                exportPath={endpoints.admin.examResultsExport}
                exportFilename="exam-results.csv"
              />
            </div>
          ) : null
        }
      />

      <ExamResultsListFilters
        classId={classId}
        stateFilter={stateFilter}
        classes={classesState.data ?? []}
        hasActiveFilters={hasActiveFilters}
        onClassIdChange={setClassId}
        onStateFilterChange={setStateFilter}
        onReset={resetFilters}
      />

      {state.fetching ? (
        <p className="exam-results-list__fetching-hint" aria-live="polite">
          {t('admin.examResultsList.refetching')}
        </p>
      ) : null}

      <div
        className={
          state.fetching
            ? 'exam-results-list__results exam-results-list__results--fetching'
            : 'exam-results-list__results'
        }
        aria-busy={state.fetching || undefined}
      >
        <ResourceView
          state={state}
          loadingLabel={t('common.loading')}
          isEmpty={(rows) => rows.length === 0}
          empty={listEmptyState}
        >
          {(rows) => (
            <>
              <div className="exam-results-list__table">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(r) => r.id}
                  onRowClick={(r) => router.push(`/admin/exams/${r.exam.id}/results`)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  pageSize={EXAM_RESULTS_PAGE_SIZE}
                  onPage={setPage}
                />
              ) : null}
            </>
          )}
        </ResourceView>
      </div>
    </div>
  );
}
