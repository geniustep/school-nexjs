'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import {
  TEACHER_DOMAIN_PAGE_SIZE,
  TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS,
  formatPlannedLoad,
} from '@/features/admin/teachers/utils/teacher-domain-present';
import { normalizeAssignmentSummaries } from '@/features/admin/teachers/utils/teacher-domain-normalize';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { statusLabel } from '@/lib/utils/labels';
import type { TeacherAssignmentSummary } from '@/types/teacher-domain';
import '@/features/admin/teachers/teachers-domain.css';

export function TeachingAssignmentsListPage() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTeacherId = searchParams.get('teacher_id') ?? '';

  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState('');
  const debouncedSearch = useDebouncedValue(searchDraft, TEACHER_DOMAIN_SEARCH_DEBOUNCE_MS);
  const [stateFilter, setStateFilter] = useState('');
  const [teacherId, setTeacherId] = useState(initialTeacherId);
  const [operationallyActive, setOperationallyActive] = useState('');

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stateFilter, teacherId, operationallyActive]);

  const query = useMemo(() => {
    const next: Record<string, string | number> = {
      page,
      page_size: TEACHER_DOMAIN_PAGE_SIZE,
    };
    if (debouncedSearch.trim()) next.search = debouncedSearch.trim();
    if (stateFilter) next.state = stateFilter;
    if (teacherId) next.teacher_id = teacherId;
    if (operationallyActive) next.operationally_active = operationallyActive;
    return next;
  }, [page, debouncedSearch, stateFilter, teacherId, operationallyActive]);

  const state = useAdminResource<TeacherAssignmentSummary[]>(
    endpoints.admin.teachingAssignments,
    query,
  );
  const rows = useMemo(
    () => normalizeAssignmentSummaries(state.data ?? []),
    [state.data],
  );
  const pg = state.meta?.pagination;
  const hasFilters = Boolean(
    debouncedSearch.trim() || stateFilter || teacherId || operationallyActive,
  );

  const columns: Column<TeacherAssignmentSummary>[] = useMemo(
    () => [
      {
        key: 'teacher',
        header: t('admin.teacherDomain.assignmentColumns.teacher'),
        render: (row) => (
          <span dir="auto">{row.teacher?.name ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'class',
        header: t('admin.teacherDomain.assignmentColumns.class'),
        render: (row) => <span dir="auto">{row.class?.name ?? t('common.dash')}</span>,
      },
      {
        key: 'subject',
        header: t('admin.teacherDomain.assignmentColumns.subject'),
        render: (row) => <span dir="auto">{row.subject?.name ?? t('common.dash')}</span>,
      },
      {
        key: 'offering',
        header: t('admin.teacherDomain.assignmentColumns.offering'),
        render: (row) => (
          <span dir="auto">
            {row.teaching_offering?.display_name ||
              row.teaching_offering?.name ||
              (row.teaching_offering_id != null
                ? `#${row.teaching_offering_id}`
                : t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'year',
        header: t('admin.teacherDomain.assignmentColumns.year'),
        render: (row) => (
          <span dir="auto">{row.academic_year?.name ?? t('common.dash')}</span>
        ),
      },
      {
        key: 'role',
        header: t('admin.teacherDomain.assignmentColumns.role'),
        render: (row) => <span dir="auto">{row.role ?? t('common.dash')}</span>,
      },
      {
        key: 'state',
        header: t('admin.teacherDomain.assignmentColumns.state'),
        render: (row) => (
          <Badge tone={row.state === 'active' ? 'green' : 'slate'}>
            {statusLabel(t, row.state ?? 'unknown')}
          </Badge>
        ),
      },
      {
        key: 'period',
        header: t('admin.teacherDomain.assignmentColumns.period'),
        render: (row) => (
          <span className="mono" dir="ltr">
            {[row.effective_from, row.effective_to].filter(Boolean).join(' → ') ||
              t('common.dash')}
          </span>
        ),
      },
      {
        key: 'load',
        header: t('admin.teacherDomain.columns.plannedLoad'),
        render: (row) => (
          <span dir="ltr">
            {formatPlannedLoad(row.planned_weekly_load ?? row.weekly_hours, t('common.dash'))}
          </span>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '72px',
        render: (row) => (
          <Link
            href={`/admin/teaching-assignments/${row.id}`}
            className="teachers-list__view-link"
            aria-label={t('common.view')}
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden="true">→</span>
          </Link>
        ),
      },
    ],
    [t],
  );

  const empty =
    hasFilters && (pg?.total ?? 0) === 0 ? (
      <EmptyState
        icon="🔍"
        title={t('admin.teacherDomain.assignments.noMatchTitle')}
        description={t('admin.teacherDomain.assignments.noMatchDesc')}
      />
    ) : (
      <EmptyState
        icon="📘"
        title={t('admin.teacherDomain.assignments.emptyTitle')}
        description={t('admin.teacherDomain.assignments.emptyDesc')}
      />
    );

  return (
    <div className="admin-workspace teaching-assignments-list-page">
      <PageHeader
        title={t('admin.teacherDomain.assignments.title')}
        subtitle={t('admin.teacherDomain.assignments.subtitle')}
        actions={
          <Link href="/admin/settings/academic-setup/assignments" className="btn btn--ghost btn--sm">
            {t('admin.teacherDomain.assignments.openBoard')}
          </Link>
        }
      />

      <div className="teachers-list__filters" role="search">
        <label className="field teachers-list__search">
          <span className="sr-only">{t('common.search')}</span>
          <input
            type="search"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t('admin.teacherDomain.filters.searchPlaceholder')}
            dir="auto"
          />
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.state')}</span>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">{t('admin.teacherDomain.filters.all')}</option>
            <option value="active">{t('admin.teacherDomain.states.active')}</option>
            <option value="suspended">{t('admin.teacherDomain.states.suspended')}</option>
            <option value="ended">{t('admin.teacherDomain.states.ended')}</option>
            <option value="cancelled">{t('admin.teacherDomain.states.cancelled')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.operationallyActive')}</span>
          <select
            value={operationallyActive}
            onChange={(e) => setOperationallyActive(e.target.value)}
          >
            <option value="">{t('admin.teacherDomain.filters.all')}</option>
            <option value="true">{t('common.yes')}</option>
            <option value="false">{t('common.no')}</option>
          </select>
        </label>
        <label className="field">
          <span>{t('admin.teacherDomain.filters.teacherId')}</span>
          <input
            type="text"
            inputMode="numeric"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value.trim())}
            dir="ltr"
          />
        </label>
      </div>

      <ResourceView
        state={{ ...state, data: rows }}
        loadingLabel={t('common.loading')}
        isEmpty={(items) => items.length === 0}
        empty={empty}
      >
        {(items) => (
          <>
            {state.fetching ? (
              <p className="tiny muted" aria-live="polite">
                {t('admin.teacherDomain.list.refetching')}
              </p>
            ) : null}
            <DataTable
              columns={columns}
              rows={items}
              rowKey={(row) => row.id}
              onRowClick={(row) => router.push(`/admin/teaching-assignments/${row.id}`)}
            />
            {pg ? (
              <Pagination
                page={pg.page}
                totalPages={pg.total_pages}
                total={pg.total}
                pageSize={TEACHER_DOMAIN_PAGE_SIZE}
                onPage={setPage}
              />
            ) : null}
          </>
        )}
      </ResourceView>
    </div>
  );
}
