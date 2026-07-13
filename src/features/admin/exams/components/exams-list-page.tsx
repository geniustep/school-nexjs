'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AttachmentListIndicator } from '@/components/attachments/attachment-list-indicator';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { ExamsListFilters } from '@/features/admin/exams/components/exams-list-filters';
import {
  EXAMS_PAGE_SIZE,
  examsListHasActiveQuery,
  formatExamListSchedule,
  formatExamListType,
  resolveExamsListEmptyVariant,
} from '@/features/admin/exams/utils/exams-list-present';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { hasPermission } from '@/lib/permissions/permissions';
import type { ListParams } from '@/types/api';
import type { ExamSummary } from '@/types/exam';
import '@/features/admin/exams/exams-list.css';

function readInitialClassId(searchParams: URLSearchParams | null): string {
  const raw = searchParams?.get('class_id')?.trim() ?? '';
  return raw || '';
}

export function ExamsListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useSession();
  const { formatDate } = useFormat();

  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState(() => readInitialClassId(searchParams));
  const [academicYearId, setAcademicYearId] = useState('');
  const [termId, setTermId] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [classId, academicYearId, termId, stateFilter]);

  const hasActiveQuery = examsListHasActiveQuery({ classId, stateFilter }) || Boolean(academicYearId || termId);
  const hasActiveFilters = hasActiveQuery;

  const params: ListParams = {
    page,
    page_size: EXAMS_PAGE_SIZE,
    class_id: classId || undefined,
    academic_year_id: academicYearId || undefined,
    term_id: termId || undefined,
    state: stateFilter || undefined,
  };

  const state = useAdminResource<ExamSummary[]>(endpoints.admin.exams, params);
  const classesState = useAdminResource<import('@/types/class').SchoolClass[]>(
    endpoints.admin.classes,
  );
  const pg = state.meta?.pagination;

  const canAddExam = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_exams',
    capability: 'manage_exams',
  });
  const canShowListActions = canAddExam || hasPermission(user, 'export_data');

  const resetFilters = useCallback(() => {
    setClassId('');
    setAcademicYearId('');
    setTermId('');
    setStateFilter('');
    setPage(1);
  }, []);

  const emptyVariant = resolveExamsListEmptyVariant({ hasActiveQuery });

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.examsList.noMatch.title')}
        description={t('admin.examsList.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.examsList.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📋"
        title={t('admin.examsList.noData.title')}
        description={t('admin.examsList.noData.description')}
        action={
          canAddExam ? (
            <Link href="/admin/exams/new" className="btn btn--primary btn--sm">
              {t('admin.addExam')}
            </Link>
          ) : undefined
        }
      />
    );

  const columns: Column<ExamSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('academic.exam'),
        render: (e) => (
          <strong className="exams-list__title" dir="auto" title={e.name}>
            {e.name}
          </strong>
        ),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (e) => {
          const label = e.class?.name ?? t('common.dash');
          return (
            <span className="exams-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (e) => {
          const label = e.subject?.name ?? t('common.dash');
          return (
            <span className="exams-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'term',
        header: t('academicContext.fields.term'),
        render: (e) => {
          const label = e.term?.name ?? t('common.dash');
          return (
            <span className="exams-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'type',
        header: t('academic.type'),
        render: (e) => {
          const label = formatExamListType(e.exam_type_label, e.exam_type, t('common.dash'));
          return (
            <span className="exams-list__cell" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'date',
        header: t('academic.date'),
        render: (e) => {
          const schedule = formatExamListSchedule(
            e.exam_date,
            e.start_time,
            e.end_time,
            formatDate,
            t('common.dash'),
          );
          return (
            <div className="exams-list__schedule">
              <span className="exams-list__date" dir="ltr">
                {schedule.dateLabel}
              </span>
              {schedule.timeLabel ? (
                <span className="exams-list__time" dir="ltr">
                  {schedule.timeLabel}
                </span>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (e) => <WorkflowBadge state={e.state} />,
      },
      {
        key: 'attachments',
        header: t('academic.attachments'),
        render: (e) => (
          <div className="exams-list__attachments">
            <AttachmentListIndicator item={e} showName={false} compact />
          </div>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (e) => (
          <div className="exams-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/exams/${e.id}`}
              className="exams-list__view-link"
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
    <div className="admin-workspace exams-list-page">
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader
        title={t('academic.exams')}
        subtitle={
          pg
            ? t('admin.examsList.subtitleWithCount', { total: pg.total })
            : t('admin.examsListDesc')
        }
        actions={
          canShowListActions ? (
            <div className="exams-list__header-actions">
              <AdminListActions
                addHref="/admin/exams/new"
                addLabel={t('admin.addExam')}
                addCapability="manage_exams"
                managePermission="manage_exams"
                exportPath={endpoints.admin.examsExport}
                exportFilename="exams.csv"
              />
            </div>
          ) : null
        }
      />

      <ExamsListFilters
        classId={classId}
        academicYearId={academicYearId}
        termId={termId}
        stateFilter={stateFilter}
        classes={classesState.data ?? []}
        hasActiveFilters={hasActiveFilters}
        onClassIdChange={setClassId}
        onAcademicYearIdChange={(value) => {
          setAcademicYearId(value);
          setTermId('');
        }}
        onTermIdChange={setTermId}
        onStateFilterChange={setStateFilter}
        onReset={resetFilters}
      />

      {state.fetching ? (
        <p className="exams-list__fetching-hint" aria-live="polite">
          {t('admin.examsList.refetching')}
        </p>
      ) : null}

      <div
        className={
          state.fetching
            ? 'exams-list__results exams-list__results--fetching'
            : 'exams-list__results'
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
              <div className="exams-list__table">
                <DataTable
                  columns={columns}
                  rows={rows}
                  rowKey={(e) => e.id}
                  onRowClick={(e) => router.push(`/admin/exams/${e.id}`)}
                />
              </div>
              {pg ? (
                <Pagination
                  page={pg.page}
                  totalPages={pg.total_pages}
                  total={pg.total}
                  pageSize={EXAMS_PAGE_SIZE}
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
