'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import type { AllSchoolsParent } from './all-schools-contract';
import { ALL_SCHOOLS_ENDPOINTS } from './all-schools-contract';
import { useAllSchoolsCopy } from './all-schools-i18n';
import { useOpenSchoolRecord } from './use-open-school-record';

const PAGE_SIZE = 50;

export function AdminAllSchoolsParents() {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { openRecord, opening } = useOpenSchoolRecord();

  useEffect(() => setPage(1), [debouncedSearch]);

  const state = useResource<AllSchoolsParent[]>(ALL_SCHOOLS_ENDPOINTS.parents, {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
  });
  const pg = state.meta?.pagination;

  const columns = useMemo<Column<AllSchoolsParent>[]>(
    () => [
      {
        key: 'school',
        header: copy.school,
        render: (row) => <strong dir="auto">{row.school?.name ?? '—'}</strong>,
      },
      {
        key: 'parent',
        header: t('nav.parents'),
        render: (row) => <strong dir="auto">{row.display_name ?? row.name ?? '—'}</strong>,
      },
      {
        key: 'phone',
        header: copy.phone,
        render: (row) => <span dir="ltr">{row.phone ?? row.mobile ?? '—'}</span>,
      },
      {
        key: 'children',
        header: t('admin.linkedChildren'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {row.linked_students_count ?? row.children?.length ?? 0}
          </span>
        ),
      },
    ],
    [copy.phone, copy.school, t],
  );

  return (
    <div className="admin-workspace">
      <PageHeader title={t('nav.parents')} subtitle={copy.readOnly} />
      <div className="toolbar">
        <input
          type="search"
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.searchParents}
          aria-label={copy.searchParents}
        />
      </div>
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon="👪"
            title={t('admin.parentsList.noMatch.title')}
            description={t('admin.parentsList.noMatch.description')}
          />
        }
      >
        {(parents) => (
          <>
            <DataTable
              columns={columns}
              rows={parents}
              rowKey={(row) => row.id}
              onRowClick={(row) => {
                if (!opening) void openRecord(row.school?.id, `/admin/parents/${row.id}`);
              }}
            />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                pageSize={PAGE_SIZE}
                onPage={setPage}
              />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
