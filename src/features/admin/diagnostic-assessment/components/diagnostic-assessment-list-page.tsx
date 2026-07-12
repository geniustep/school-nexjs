/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams, Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { DiagnosticAssessmentSummary } from '@/types/diagnostic-assessment';
import {
  DIAGNOSTIC_PAGE_SIZE,
  diagnosticListHasActiveQuery,
  formatAverageScore,
  formatCompletionPercent,
  resolveDiagnosticListEmptyVariant,
} from '../utils/diagnostic-list-present';
import { DiagnosticCreateDialog } from './diagnostic-create-dialog';
import { DiagnosticListFilters } from './diagnostic-list-filters';
import '../diagnostic-assessment-workspace.css';

export function DiagnosticAssessmentListPage({
  detailBasePath = '/admin/academics/assessment/diagnostic',
  canCreate = true,
}: {
  detailBasePath?: string;
  canCreate?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { options: academicYearOptions } = useAcademicYearOptions();

  useEffect(() => {
    setPage(1);
  }, [academicYearId, classId, subjectId, stateFilter]);

  const hasActiveQuery = diagnosticListHasActiveQuery({
    academicYearId,
    classId,
    subjectId,
    stateFilter,
  });

  const params: ListParams = {
    page,
    page_size: DIAGNOSTIC_PAGE_SIZE,
    academic_year_id: academicYearId || undefined,
    class_id: classId || undefined,
    subject_id: subjectId || undefined,
    state: stateFilter || undefined,
  };

  const state = useAdminResource<DiagnosticAssessmentSummary[]>(
    endpoints.admin.diagnosticAssessments,
    params,
  );
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useAdminResource<Ref[]>(endpoints.admin.subjects);
  const pg = state.meta?.pagination;

  const resetFilters = useCallback(() => {
    setAcademicYearId('');
    setClassId('');
    setSubjectId('');
    setStateFilter('');
    setPage(1);
  }, []);

  const emptyVariant = resolveDiagnosticListEmptyVariant({ hasActiveQuery });
  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.diagnosticAssessment.list.noMatch.title')}
        description={t('admin.diagnosticAssessment.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.diagnosticAssessment.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📝"
        title={t('admin.diagnosticAssessment.list.noData.title')}
        description={t('admin.diagnosticAssessment.list.noData.description')}
        action={
          canCreate ? (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setCreateOpen(true)}>
              {t('admin.diagnosticAssessment.create.open')}
            </button>
          ) : undefined
        }
      />
    );

  const columns: Column<DiagnosticAssessmentSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.diagnosticAssessment.columns.campaign'),
        render: (row) => (
          <Link href={`${detailBasePath}/${row.id}`} className="link">
            {row.name || row.display_name || `#${row.id}`}
          </Link>
        ),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (row) => row.class?.name ?? t('common.dash'),
      },
      {
        key: 'subject',
        header: t('nav.subjects'),
        render: (row) => row.subject?.name ?? t('common.dash'),
      },
      {
        key: 'teacher',
        header: t('nav.teachers'),
        render: (row) => row.teacher?.name ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('admin.diagnosticAssessment.assessmentDate'),
        render: (row) => row.assessment_date ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.diagnosticAssessment.state'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'completion',
        header: t('admin.diagnosticAssessment.completion'),
        render: (row) =>
          `${formatCompletionPercent(row.completion?.completion_percent)} · ${formatAverageScore(row.completion?.average_score)}`,
      },
    ],
    [detailBasePath, t],
  );

  return (
    <div className="admin-workspace diagnostic-workspace">
      <PageHeader
        title={t('admin.diagnosticAssessment.listTitle')}
        subtitle={t('admin.diagnosticAssessment.listSubtitle')}
        actions={
          canCreate ? (
            <button type="button" className="btn btn--primary" onClick={() => setCreateOpen(true)}>
              {t('admin.diagnosticAssessment.create.open')}
            </button>
          ) : undefined
        }
      />

      <DiagnosticListFilters
        academicYearId={academicYearId}
        classId={classId}
        subjectId={subjectId}
        stateFilter={stateFilter}
        academicYears={academicYearOptions}
        classes={classesState.data ?? []}
        subjects={subjectsState.data ?? []}
        onAcademicYearChange={setAcademicYearId}
        onClassChange={setClassId}
        onSubjectChange={setSubjectId}
        onStateChange={setStateFilter}
        onReset={resetFilters}
      />

      <ResourceView state={state} empty={listEmptyState}>
        {(rows) => (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages ?? 1}
                total={pg.total}
                pageSize={DIAGNOSTIC_PAGE_SIZE}
                onPage={setPage}
              />
            ) : null}
          </>
        )}
      </ResourceView>

      {canCreate ? (
        <DiagnosticCreateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => router.push(`${detailBasePath}/${id}`)}
        />
      ) : null}
    </div>
  );
}
