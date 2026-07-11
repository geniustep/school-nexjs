/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader } from '@/components/ui/primitives';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useResource } from '@/lib/hooks/use-resource';
import type { GradebookSummary } from '@/types/gradebook';
import {
  GRADEBOOKS_PAGE_SIZE,
  formatCompletionPercent,
} from '@/features/admin/gradebooks/utils/gradebook-list-present';
import { adaptTeacherGradebookList } from '../utils/teacher-gradebook-present';
import '@/features/admin/gradebooks/gradebook-workspace.css';

export function TeacherGradebooksListPage() {
  const t = useT();
  const [page, setPage] = useState(1);
  const state = useResource<GradebookSummary[]>(endpoints.teacher.gradebooks, {
    page,
    page_size: GRADEBOOKS_PAGE_SIZE,
  });
  const pg = state.meta?.pagination;
  const rows = useMemo(() => adaptTeacherGradebookList(state.data), [state.data]);

  const columns: Column<(typeof rows)[number]>[] = useMemo(
    () => [
      {
        key: 'subject',
        header: t('academic.subject'),
        render: (row) => row.subject ?? t('common.dash'),
      },
      {
        key: 'class',
        header: t('nav.classes'),
        render: (row) => row.className ?? t('common.dash'),
      },
      {
        key: 'term',
        header: t('admin.gradebooks.term'),
        render: (row) => row.term ?? t('common.dash'),
      },
      {
        key: 'state',
        header: t('academic.status'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'completion',
        header: t('admin.gradebooks.completion.label'),
        render: (row) => formatCompletionPercent(row.completionPercent, t('common.dash')),
      },
      {
        key: 'students_count',
        header: t('actions.students'),
        render: (row) => row.studentsCount ?? t('common.dash'),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (row) => (
          <Link href={row.href} className="btn btn--ghost btn--sm">
            {t('common.view')}
          </Link>
        ),
      },
    ],
    [t],
  );

  const emptyState = (
    <EmptyState
      icon="📒"
      title={t('teacher.gradebooks.list.noData.title')}
      description={t('teacher.gradebooks.list.noData.description')}
    />
  );

  return (
    <div className="admin-workspace gradebook-workspace">
      <PageHeader
        title={t('teacher.gradebooks.listTitle')}
        subtitle={
          pg?.total != null
            ? t('teacher.gradebooks.list.subtitleWithCount', { total: pg.total })
            : t('teacher.gradebooks.listSubtitle')
        }
      />

      <ResourceView state={state} empty={emptyState}>
        {() => (
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
    </div>
  );
}
