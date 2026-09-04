'use client';

import { useMemo, useState } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import type { AllSchoolsClass } from './all-schools-contract';
import { ALL_SCHOOLS_ENDPOINTS } from './all-schools-contract';
import { useAllSchoolsCopy } from './all-schools-i18n';
import { useOpenSchoolRecord } from './use-open-school-record';

const PAGE_SIZE = 50;

export function AdminAllSchoolsClasses() {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const [page, setPage] = useState(1);
  const { openRecord, opening } = useOpenSchoolRecord();
  const state = useResource<AllSchoolsClass[]>(ALL_SCHOOLS_ENDPOINTS.classes, {
    page,
    page_size: PAGE_SIZE,
  });
  const pg = state.meta?.pagination;

  const columns = useMemo<Column<AllSchoolsClass>[]>(
    () => [
      {
        key: 'school',
        header: copy.school,
        render: (row) => <strong dir="auto">{row.school?.name ?? '—'}</strong>,
      },
      {
        key: 'class',
        header: t('common.class'),
        render: (row) => <strong dir="auto">{row.display_name ?? row.name}</strong>,
      },
      {
        key: 'level',
        header: t('academicContext.fields.level'),
        render: (row) => <span dir="auto">{row.level?.name ?? '—'}</span>,
      },
      {
        key: 'year',
        header: t('academicContext.fields.academicYear'),
        render: (row) => <span dir="auto">{row.academic_year ?? '—'}</span>,
      },
      {
        key: 'students',
        header: t('nav.students'),
        render: (row) => (
          <span className="mono" dir="ltr">{row.assigned_count ?? row.student_count ?? 0}</span>
        ),
      },
    ],
    [copy.school, t],
  );

  return (
    <div className="admin-workspace">
      <PageHeader title={t('nav.classes')} subtitle={copy.readOnly} />
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon="🏫"
            title={t('admin.classesBrowser.noData.title')}
            description={t('admin.classesBrowser.noData.description')}
          />
        }
      >
        {(classes) => (
          <>
            <DataTable
              columns={columns}
              rows={classes}
              rowKey={(row) => row.id}
              onRowClick={(row) => {
                if (!opening) void openRecord(row.school?.id, `/admin/classes/${row.id}`);
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
