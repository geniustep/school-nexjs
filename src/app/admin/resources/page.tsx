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
import type { ResourceSummary } from '@/types/resource';
import type { ListParams } from '@/types/api';

export default function AdminResourcesPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const params: ListParams = {
    page,
    page_size: 20,
    class_id: classId || undefined,
    state: stateFilter || undefined,
    resource_type: typeFilter || undefined,
  };
  const state = useResource<ResourceSummary[]>(endpoints.admin.resources, params);
  const classesState = useResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const pg = state.meta?.pagination;

  const columns: Column<ResourceSummary>[] = useMemo(
    () => [
      { key: 'name', header: t('academic.resources'), render: (r) => <strong>{r.name}</strong> },
      { key: 'class', header: t('nav.classes'), render: (r) => r.class?.name ?? t('common.dash') },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (r) => r.subject?.name ?? t('common.dash'),
      },
      {
        key: 'teacher',
        header: t('academic.teacher'),
        render: (r) => r.teacher?.name ?? t('common.dash'),
      },
      { key: 'type', header: t('academic.type'), render: (r) => r.resource_type ?? t('common.dash') },
      {
        key: 'state',
        header: t('academic.status'),
        render: (r) => <WorkflowBadge state={r.state} />,
      },
      {
        key: 'date',
        header: t('academic.publishDate'),
        render: (r) => (r.publish_date ? formatDate(r.publish_date) : t('common.dash')),
      },
    ],
    [t, formatDate],
  );

  return (
    <>
      <Link href="/admin/academic" className="back-link">
        ‹ {t('admin.academicCenter')}
      </Link>
      <PageHeader title={t('academic.resources')} subtitle={t('admin.resourcesListDesc')} actions={
        <div className="row" style={{ gap: 8 }}>
          <ExportButton path={endpoints.admin.resourcesExport} filename="resources.csv" label={t('admin.exportCsv')} />
          <Link className="btn btn--primary btn--sm" href="/admin/resources/new">{t('admin.addResource')}</Link>
        </div>
      } />

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
          <option value="archived">{t('states.archived')}</option>
        </select>
        <input
          className="input"
          placeholder={t('academic.type')}
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
        />
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="📚" title={t('empty.resources')} />}
      >
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(r) => r.id}
              onRowClick={(r) => router.push(`/admin/resources/${r.id}`)}
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
