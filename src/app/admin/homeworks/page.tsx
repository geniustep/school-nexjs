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
import type { AdminHomeworkSummary } from '@/types/homework';
import type { ListParams } from '@/types/api';

const STATES = ['draft', 'published', 'closed', 'archived'] as const;

export default function AdminHomeworksPage() {
  const t = useT();
  const router = useRouter();
  const { formatDate } = useFormat();
  const [page, setPage] = useState(1);
  const [classId, setClassId] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params: ListParams = {
    page,
    page_size: 20,
    search: query || undefined,
    class_id: classId || undefined,
    state: stateFilter || undefined,
  };
  const state = useResource<AdminHomeworkSummary[]>(endpoints.admin.homeworks, params);
  const classesState = useResource<import('@/types/class').SchoolClass[]>(endpoints.admin.classes);
  const pg = state.meta?.pagination;

  const columns: Column<AdminHomeworkSummary>[] = useMemo(
    () => [
      { key: 'name', header: t('academic.homework'), render: (h) => <strong>{h.name}</strong> },
      { key: 'class', header: t('nav.classes'), render: (h) => h.class?.name ?? t('common.dash') },
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (h) => h.subject?.name ?? t('common.dash'),
      },
      {
        key: 'teacher',
        header: t('academic.teacher'),
        render: (h) => h.teacher?.name ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (h) => <WorkflowBadge state={h.state} />,
      },
      {
        key: 'deadline',
        header: t('academic.deadline'),
        render: (h) => (h.deadline ? formatDate(h.deadline) : t('common.dash')),
      },
      {
        key: 'submissions',
        header: t('academic.homeworkSubmissions'),
        render: (h) => h.submission_count ?? 0,
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
        title={t('academic.homework')}
        subtitle={t('admin.homeworkListDesc')}
        actions={
          <div className="row" style={{ gap: 8 }}>
            <ExportButton path={endpoints.admin.homeworksExport} filename="homeworks.csv" label={t('admin.exportCsv')} />
            <Link className="btn btn--primary btn--sm" href="/admin/homeworks/new">{t('admin.addHomework')}</Link>
          </div>
        }
      />

      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(search.trim());
        }}
      >
        <input
          className="input"
          placeholder={t('admin.searchHomework')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allClasses')}</option>
          {(classesState.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className="input" value={stateFilter} onChange={(e) => { setStateFilter(e.target.value); setPage(1); }}>
          <option value="">{t('admin.allStates')}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>{t(`states.${s}`)}</option>
          ))}
        </select>
        <button className="btn btn--primary" type="submit">{t('admin.search')}</button>
      </form>

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(d) => d.length === 0}
        empty={<EmptyState icon="📝" title={t('empty.homework')} />}
      >
        {(rows) => (
          <>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(h) => h.id}
              onRowClick={(h) => router.push(`/admin/homeworks/${h.id}`)}
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
