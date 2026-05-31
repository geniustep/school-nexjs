'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useResource } from '@/lib/hooks/use-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { ExportButton } from '@/features/admin/export-button';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import type { ExamSummary } from '@/types/exam';
import type { ListParams } from '@/types/api';

export default function AdminExamsPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  const params: ListParams = {
    page,
    page_size: 20,
    class_id: classId || undefined,
    state: stateFilter || undefined,
  };
  const state = useResource<ExamSummary[]>(endpoints.admin.exams, params);
  const classesState = useResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const pg = state.meta?.pagination;

  const columns: Column<ExamSummary>[] = useMemo(
    () => [
      { key: 'name', header: t('academic.exam'), render: (e) => <strong>{e.name}</strong> },
      { key: 'class', header: t('nav.classes'), render: (e) => e.class?.name ?? t('common.dash') },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (e) => e.subject?.name ?? t('common.dash'),
      },
      {
        key: 'type',
        header: t('academic.type'),
        render: (e) => e.exam_type_label ?? e.exam_type ?? t('common.dash'),
      },
      {
        key: 'date',
        header: t('academic.date'),
        render: (e) => (e.exam_date ? formatDate(e.exam_date) : t('common.dash')),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (e) => <WorkflowBadge state={e.state} />,
      },
    ],
    [t, formatDate],
  );

  return (
    <>
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader
        title={t('academic.exams')}
        subtitle={t('admin.examsListDesc')}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <ExportButton path={endpoints.admin.examsExport} filename="exams.csv" />
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => router.push('/admin/exams/new')}
            >
              {t('admin.addExam')}
            </button>
          </div>
        }
      />

      <form className="toolbar" onSubmit={(e) => e.preventDefault()}>
        <select className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allClasses')}</option>
          {(classesState.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allStates')}</option>
          <option value="draft">{t('states.draft')}</option>
          <option value="published">{t('states.published')}</option>
          <option value="done">{t('states.done')}</option>
          <option value="cancelled">{t('states.cancelled')}</option>
          <option value="archived">{t('states.archived')}</option>
        </select>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="📋" title={t('empty.exams')} />}
      >
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(e) => e.id}
              onRowClick={(e) => router.push(`/admin/exams/${e.id}`)}
            />
            {pg && (
              <Pagination page={pg.page} totalPages={pg.total_pages} total={pg.total} onPage={setPage} />
            )}
          </>
        )}
      </ResourceView>
    </>
  );
}
