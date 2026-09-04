'use client';

import { useEffect, useMemo, useState } from 'react';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { PageHeader } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import { useT } from '@/features/i18n/locale-context';
import { useResource } from '@/lib/hooks/use-resource';
import type { AllSchoolsStudent } from './all-schools-contract';
import { ALL_SCHOOLS_ENDPOINTS } from './all-schools-contract';
import { useAllSchoolsCopy } from './all-schools-i18n';
import { useOpenSchoolRecord } from './use-open-school-record';

const PAGE_SIZE = 50;

function studentName(student: AllSchoolsStudent): string {
  if (student.display_name?.trim()) return student.display_name.trim();
  if (student.name?.trim()) return student.name.trim();
  const ar = [student.first_name_ar, student.last_name_ar].filter(Boolean).join(' ').trim();
  if (ar) return ar;
  return [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || '—';
}

export function AdminAllSchoolsStudents() {
  const t = useT();
  const copy = useAllSchoolsCopy();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 400);
  const { openRecord, opening } = useOpenSchoolRecord();

  useEffect(() => setPage(1), [debouncedSearch]);

  const state = useResource<AllSchoolsStudent[]>(ALL_SCHOOLS_ENDPOINTS.students, {
    page,
    page_size: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
  });
  const pg = state.meta?.pagination;

  const columns = useMemo<Column<AllSchoolsStudent>[]>(
    () => [
      {
        key: 'school',
        header: copy.school,
        render: (student) => <strong dir="auto">{student.school?.name ?? '—'}</strong>,
      },
      {
        key: 'student',
        header: t('admin.studentsList.columnStudent'),
        render: (student) => <strong dir="auto">{studentName(student)}</strong>,
      },
      {
        key: 'class',
        header: t('common.class'),
        render: (student) => <span dir="auto">{student.class?.name ?? '—'}</span>,
      },
      {
        key: 'level',
        header: t('academicContext.fields.level'),
        render: (student) => <span dir="auto">{student.level?.name ?? '—'}</span>,
      },
      {
        key: 'massar',
        header: copy.massar,
        render: (student) => <span dir="ltr" className="mono">{student.massar_code ?? '—'}</span>,
      },
    ],
    [copy.massar, copy.school, t],
  );

  return (
    <div className="admin-workspace">
      <PageHeader title={t('nav.students')} subtitle={copy.readOnly} />
      <div className="toolbar">
        <input
          type="search"
          className="input"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('admin.searchStudents')}
          aria-label={t('admin.searchStudents')}
        />
      </div>
      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(rows) => rows.length === 0}
        empty={
          <EmptyState
            icon="🔍"
            title={t('admin.studentsList.noMatch.title')}
            description={t('admin.studentsList.noMatch.description')}
          />
        }
      >
        {(students) => (
          <>
            <DataTable
              columns={columns}
              rows={students}
              rowKey={(student) => student.id}
              onRowClick={(student) => {
                if (!opening) void openRecord(student.school?.id, `/admin/students/${student.id}`);
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
