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
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { ListParams } from '@/types/api';
import type { DiagnosticAssessmentSummary } from '@/types/diagnostic-assessment';
import {
  DIAGNOSTIC_PAGE_SIZE,
  formatAverageScore,
  formatCompletionPercent,
} from '@/features/admin/diagnostic-assessment/utils/diagnostic-list-present';
import '@/features/admin/diagnostic-assessment/diagnostic-assessment-workspace.css';

export function TeacherDiagnosticAssessmentListPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const [stateFilter, setStateFilter] = useState('');

  useEffect(() => {
    setPage(1);
  }, [stateFilter]);

  const params: ListParams = {
    page,
    page_size: DIAGNOSTIC_PAGE_SIZE,
    state: stateFilter || undefined,
  };

  const state = useResource<DiagnosticAssessmentSummary[]>(
    endpoints.teacher.diagnosticAssessments,
    params,
  );
  const pg = state.meta?.pagination;
  const detailBasePath = '/teacher/assessment/diagnostic';

  const resetFilters = useCallback(() => {
    setStateFilter('');
    setPage(1);
  }, []);

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
    [t],
  );

  return (
    <div className="admin-workspace diagnostic-workspace">
      <PageHeader
        title={t('teacher.diagnosticAssessment.listTitle')}
        subtitle={t('teacher.diagnosticAssessment.listSubtitle')}
      />

      <div className="diagnostic-list-filters">
        <select
          className="input"
          value={stateFilter}
          onChange={(event) => setStateFilter(event.target.value)}
        >
          <option value="">{t('admin.diagnosticAssessment.filters.allStates')}</option>
          <option value="draft">{t('admin.diagnosticAssessment.states.draft')}</option>
          <option value="confirmed">{t('admin.diagnosticAssessment.states.confirmed')}</option>
        </select>
        <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
          {t('admin.diagnosticAssessment.resetFilters')}
        </button>
      </div>

      <ResourceView
        state={state}
        empty={
          <EmptyState
            icon="📝"
            title={t('teacher.diagnosticAssessment.list.noData.title')}
            description={t('teacher.diagnosticAssessment.list.noData.description')}
          />
        }
      >
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
    </div>
  );
}
