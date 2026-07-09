'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { PageHeader, Badge } from '@/components/ui/primitives';
import { AdminListActions } from '@/features/admin/admin-list-actions';
import { CsvImportPanel } from '@/features/admin/csv-import-panel';
import {
  formatTeacherRefList,
  TEACHERS_PAGE_SIZE,
} from '@/features/admin/teachers/utils/teachers-list-present';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import { statusLabel } from '@/lib/utils/labels';
import type { Teacher } from '@/types/teacher';
import '@/features/admin/teachers/teachers-list.css';

export function TeachersListPage() {
  const router = useRouter();
  const t = useT();
  const user = useSession();
  const [page, setPage] = useState(1);
  const [importOpen, setImportOpen] = useState(false);
  const state = useAdminResource<Teacher[]>(endpoints.admin.teachers, {
    page,
    page_size: TEACHERS_PAGE_SIZE,
  });
  const pg = state.meta?.pagination;

  const canAddTeacher = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_teachers',
    capability: 'manage_teachers',
  });

  const listEmptyState = (
    <EmptyState
      icon="👩‍🏫"
      title={t('admin.academicSetup.teachersEmptyTitle')}
      description={t('admin.academicSetup.teachersEmptyDesc')}
      action={
        canAddTeacher ? (
          <Link href="/admin/teachers/new" className="btn btn--primary btn--sm">
            {t('admin.addTeacher')}
          </Link>
        ) : undefined
      }
    />
  );

  const columns: Column<Teacher>[] = useMemo(
    () => [
      {
        key: 'teacher',
        header: t('admin.fullName'),
        render: (teacher) => (
          <div className="teachers-list__identity">
            <strong className="teachers-list__name" dir="auto" title={teacher.name}>
              {teacher.name}
            </strong>
            <span className="teachers-list__code mono muted" dir="auto">
              {teacher.code ?? t('common.dash')}
            </span>
          </div>
        ),
      },
      {
        key: 'classes',
        header: t('nav.classes'),
        className: 'teachers-list__academic-col',
        render: (teacher) => {
          const label = formatTeacherRefList(teacher.classes, t('common.dash'));
          return (
            <span className="teachers-list__academic" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'subjects',
        header: t('nav.subjects'),
        className: 'teachers-list__academic-col',
        render: (teacher) => {
          const label = formatTeacherRefList(teacher.subjects, t('common.dash'));
          return (
            <span className="teachers-list__academic" dir="auto" title={label}>
              {label}
            </span>
          );
        },
      },
      {
        key: 'status',
        header: t('academic.status'),
        render: (teacher) => (
          <Badge tone={teacher.status === 'active' ? 'green' : 'slate'}>
            {statusLabel(t, teacher.status)}
          </Badge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '88px',
        render: (teacher) => (
          <div className="teachers-list__row-actions" onClick={(event) => event.stopPropagation()}>
            <Link
              href={`/admin/teachers/${teacher.id}`}
              className="teachers-list__view-link"
              aria-label={t('common.view')}
              title={t('common.view')}
            >
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="admin-workspace teachers-list-page">
      <PageHeader
        title={t('nav.teachers')}
        subtitle={t('admin.teachersListDesc')}
        actions={
          <div className="teachers-list__header-actions">
            <AdminListActions
              addHref="/admin/teachers/new"
              addLabel={t('admin.addTeacher')}
              addCapability="manage_teachers"
              managePermission="manage_teachers"
              exportPath={endpoints.admin.teachersExport}
              exportFilename="teachers.csv"
              showImport
              importOpen={importOpen}
              onToggleImport={() => setImportOpen((v) => !v)}
            />
          </div>
        }
      />

      {importOpen ? (
        <CsvImportPanel importPath={endpoints.admin.teachersImport} onDone={() => state.reload()} />
      ) : null}

      <ResourceView
        state={state}
        loadingLabel={t('common.loading')}
        isEmpty={(teachers) => teachers.length === 0}
        empty={listEmptyState}
      >
        {(teachers) => (
          <>
            <DataTable
              columns={columns}
              rows={teachers}
              rowKey={(teacher) => teacher.id}
              onRowClick={(teacher) => router.push(`/admin/teachers/${teacher.id}`)}
            />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                pageSize={TEACHERS_PAGE_SIZE}
                onPage={setPage}
              />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
