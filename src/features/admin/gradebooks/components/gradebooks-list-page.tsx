/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { GradebookSummary } from '@/types/gradebook';
import {
  formatCompletionPercent,
  GRADEBOOKS_PAGE_SIZE,
  gradebooksListHasActiveQuery,
  resolveGradebooksListEmptyVariant,
} from '../utils/gradebook-list-present';
import { GradebookCreateDialog } from './gradebook-create-dialog';
import { GradebooksListFilters } from './gradebooks-list-filters';
import '../gradebook-workspace.css';

export function GradebooksListPage() {
  const t = useT();
  const { activeAcademicYearId } = useAdminSession();
  const academicYearId = activeAcademicYearId != null ? String(activeAcademicYearId) : '';
  const [page, setPage] = useState(1);
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [academicYearId, termId, classId, subjectId, offeringId, stateFilter]);

  // The global academic year is operational context, not a resettable local filter.
  const hasActiveQuery = gradebooksListHasActiveQuery({
    termId,
    classId,
    subjectId,
    stateFilter,
  });

  const params: ListParams = {
    page,
    page_size: GRADEBOOKS_PAGE_SIZE,
    academic_year_id: activeAcademicYearId ?? undefined,
    term_id: termId || undefined,
    class_id: classId || undefined,
    subject_id: subjectId || undefined,
    teaching_offering_id: offeringId || undefined,
    state: stateFilter || undefined,
  };

  const state = useAdminResource<GradebookSummary[]>(endpoints.admin.gradebooks, params);
  const pg = state.meta?.pagination;

  const resetFilters = useCallback(() => {
    setTermId('');
    setClassId('');
    setSubjectId('');
    setOfferingId('');
    setStateFilter('');
    setPage(1);
  }, []);

  const emptyVariant = resolveGradebooksListEmptyVariant({ hasActiveQuery });
  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.gradebooks.list.noMatch.title')}
        description={t('admin.gradebooks.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.gradebooks.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📒"
        title={t('admin.gradebooks.list.noData.title')}
        description={t('admin.gradebooks.list.noData.description')}
      />
    );

  const columns: Column<GradebookSummary>[] = useMemo(
    () => [
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (row) => row.subject?.name ?? t('common.dash'),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (row) => row.class?.name ?? t('common.dash'),
      },
      {
        key: 'academic_year',
        header: t('admin.gradebooks.academicYear'),
        render: (row) => row.academic_year?.name ?? t('common.dash'),
      },
      {
        key: 'term',
        header: t('admin.gradebooks.term'),
        render: (row) => row.term?.name ?? t('common.dash'),
      },
      {
        key: 'teacher',
        header: t('nav.teachers'),
        render: (row) => row.teacher?.name ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'completion',
        header: t('admin.gradebooks.completion.label'),
        render: (row) => formatCompletionPercent(row.completion_percent, t('common.dash')),
      },
      {
        key: 'students_count',
        header: t('actions.students'),
        render: (row) => row.students_count ?? t('common.dash'),
      },
      {
        key: 'hint',
        header: t('admin.gradebooks.lastHint'),
        render: (row) => row.last_operational_hint ?? t('common.dash'),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link
            href={`/admin/academics/assessment/gradebooks/${row.id}`}
            className="btn btn--ghost btn--sm"
          >
            {t('common.view')}
          </Link>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace gradebook-workspace">
      <PageHeader
        title={t('admin.gradebooks.listTitle')}
        subtitle={
          pg?.total != null
            ? t('admin.gradebooks.list.subtitleWithCount', { total: pg.total })
            : t('admin.gradebooks.listSubtitle')
        }
        actions={
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={activeAcademicYearId == null}
            onClick={() => setCreateOpen(true)}
          >
            {t('admin.gradebooks.create.title')}
          </button>
        }
      />

      <GradebooksListFilters
        academicYearId={academicYearId}
        termId={termId}
        classId={classId}
        subjectId={subjectId}
        offeringId={offeringId}
        stateFilter={stateFilter}
        hasActiveFilters={hasActiveQuery}
        onTermIdChange={setTermId}
        onClassIdChange={setClassId}
        onSubjectIdChange={setSubjectId}
        onOfferingIdChange={setOfferingId}
        onStateFilterChange={setStateFilter}
        onReset={resetFilters}
      />

      <ResourceView state={state} empty={listEmptyState}>
        {(rows) => (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                pageSize={GRADEBOOKS_PAGE_SIZE}
                onPage={setPage}
              />
            ) : null}
          </>
        )}
      </ResourceView>

      <GradebookCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          window.location.href = `/admin/academics/assessment/gradebooks/${id}`;
        }}
      />
    </div>
  );
}
