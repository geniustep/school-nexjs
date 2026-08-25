'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAdminPermission } from '@/components/admin/require-admin-permission';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { Badge, PageHeader } from '@/components/ui/primitives';
import { createAcademicCalendar } from '@/features/admin/academic-calendars/api/academic-calendars-api';
import {
  academicCalendarsListHasActiveQuery,
  ACADEMIC_CALENDARS_PAGE_SIZE,
  filterAcademicCalendarsClient,
  resolveAcademicCalendarsListEmptyVariant,
} from '@/features/admin/academic-calendars/utils/academic-calendar-present';
import { countAcademicCalendarActionableWarnings } from '@/features/admin/academic-calendars/utils/academic-calendar-warning-review';
import { normalizeAcademicCalendars } from '@/features/admin/academic-calendars/utils/normalize-academic-calendar';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useGlobalAcademicYearResource } from '@/features/academic-context/hooks/use-global-academic-year-resource';
import { canShowAcademicListAdd } from '@/lib/permissions/academic-capabilities';
import type { ListParams } from '@/types/api';
import type { AcademicCalendarDetail, AcademicCalendarSummary } from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendars.css';

const STATE_OPTIONS = ['draft', 'under_review', 'published', 'archived'] as const;

function GlobalAcademicCalendarCreateDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (calendar: AcademicCalendarDetail) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeAcademicYearId, academicYearLoading, academicYearError } = useAdminSession();
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName('');
    setNotes('');
    setError(null);
    setSaving(false);
  }

  async function confirm() {
    if (saving) return;
    const trimmed = name.trim();
    if (!trimmed || activeAcademicYearId == null) {
      setError(academicYearError?.message ?? t('admin.academicCalendars.create.missingFields'));
      return;
    }
    setSaving(true);
    setError(null);
    const res = await createAcademicCalendar({
      name: trimmed,
      academic_year_id: activeAcademicYearId,
      notes: notes.trim() || undefined,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error.message);
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.academicCalendars.create.success'));
    reset();
    onClose();
    onCreated(res.data);
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.academicCalendars.create.title')}
      size="form"
      loading={saving || academicYearLoading}
      confirmLabel={t('admin.academicCalendars.create.submit')}
      onConfirm={confirm}
      onClose={() => {
        if (saving) return;
        reset();
        onClose();
      }}
      body={
        <div className="academic-calendar-form">
          {(error || academicYearError) && (
            <p className="form-error">{error ?? academicYearError?.message}</p>
          )}
          <div className="field">
            <label htmlFor="ac-create-name">{t('admin.academicCalendars.fields.name')}</label>
            <input
              id="ac-create-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('admin.academicCalendars.create.namePlaceholder')}
              disabled={saving || academicYearLoading}
            />
          </div>
          <div className="field">
            <label htmlFor="ac-create-notes">{t('admin.academicCalendars.fields.notes')}</label>
            <textarea
              id="ac-create-notes"
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving || academicYearLoading}
            />
          </div>
        </div>
      }
    />
  );
}

export function AcademicCalendarsListPage() {
  const t = useT();
  const router = useRouter();
  const user = useSession();
  const { formatDate } = useFormat();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [stateFilter, search]);

  const hasActiveQuery = academicCalendarsListHasActiveQuery({
    yearId: '',
    stateFilter,
    search,
  });
  const emptyVariant = resolveAcademicCalendarsListEmptyVariant({ hasActiveQuery });

  const params: ListParams = useMemo(
    () => ({
      page,
      page_size: ACADEMIC_CALENDARS_PAGE_SIZE,
      state: stateFilter || undefined,
    }),
    [page, stateFilter],
  );

  const state = useGlobalAcademicYearResource<AcademicCalendarSummary[]>(
    endpoints.admin.academicCalendars,
    params,
  );
  const rows = useMemo(
    () => filterAcademicCalendarsClient(normalizeAcademicCalendars(state.data), { search }),
    [state.data, search],
  );
  const pg = state.meta?.pagination;

  const canCreate = canShowAcademicListAdd(user, {
    legacyPermission: 'manage_timetable',
    capability: 'manage_timetable',
  });

  const resetFilters = useCallback(() => {
    setSearch('');
    setStateFilter('');
    setPage(1);
  }, []);

  const columns: Column<AcademicCalendarSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.academicCalendars.columns.name'),
        render: (row) => {
          const actionableWarningCount = countAcademicCalendarActionableWarnings(row.warnings);
          return (
            <div className="academic-calendars-page__title-cell">
              <strong dir="auto" title={row.name}>
                {row.name}
              </strong>
              {actionableWarningCount > 0 ? (
                <Badge tone="amber">
                  {t('admin.academicCalendars.warningsCount', { count: actionableWarningCount })}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
      {
        key: 'year',
        header: t('admin.academicCalendars.columns.academicYear'),
        render: (row) => row.academic_year_name || t('common.dash'),
      },
      {
        key: 'state',
        header: t('admin.academicCalendars.columns.state'),
        render: (row) => <WorkflowBadge state={row.state} />,
      },
      {
        key: 'version',
        header: t('admin.academicCalendars.columns.version'),
        render: (row) =>
          row.version_number != null
            ? t('admin.academicCalendars.versionLabel', { version: row.version_number })
            : t('common.dash'),
      },
      {
        key: 'events',
        header: t('admin.academicCalendars.columns.events'),
        render: (row) => {
          const total = row.event_count;
          const provisional = row.provisional_event_count;
          if (total == null && provisional == null) return t('common.dash');
          if (provisional != null && provisional > 0) {
            return t('admin.academicCalendars.eventsWithProvisional', {
              total: total ?? 0,
              provisional,
            });
          }
          return String(total ?? 0);
        },
      },
      {
        key: 'dates',
        header: t('admin.academicCalendars.columns.period'),
        render: (row) => {
          if (!row.effective_from && !row.effective_to) return t('common.dash');
          const start = row.effective_from ? formatDate(row.effective_from) : t('common.dash');
          const end = row.effective_to ? formatDate(row.effective_to) : t('common.dash');
          return `${start} – ${end}`;
        },
      },
    ],
    [t, formatDate],
  );

  const listEmptyState =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="🔍"
        title={t('admin.academicCalendars.list.noMatch.title')}
        description={t('admin.academicCalendars.list.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.academicCalendars.filters.reset')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📅"
        title={t('admin.academicCalendars.list.noData.title')}
        description={t('admin.academicCalendars.list.noData.description')}
        action={
          canCreate ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setCreateOpen(true)}
            >
              {t('admin.academicCalendars.create.open')}
            </button>
          ) : undefined
        }
      />
    );

  return (
    <RequireAdminPermission permission="view_timetable">
      <div className="admin-workspace academic-calendars-page">
        <PageHeader
          title={t('admin.academicCalendars.title')}
          subtitle={t('admin.academicCalendars.subtitle')}
          actions={
            canCreate ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setCreateOpen(true)}
              >
                {t('admin.academicCalendars.create.open')}
              </button>
            ) : undefined
          }
        />

        <div className="toolbar academic-calendars-page__toolbar">
          <input
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.academicCalendars.filters.searchPlaceholder')}
            aria-label={t('admin.academicCalendars.filters.searchPlaceholder')}
          />
          <select
            className="select"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            aria-label={t('admin.academicCalendars.columns.state')}
          >
            <option value="">{t('admin.academicCalendars.filters.stateAll')}</option>
            {STATE_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {t(`states.${value}`) === `states.${value}`
                  ? t(`admin.academicCalendars.states.${value}`)
                  : t(`states.${value}`)}
              </option>
            ))}
          </select>
          <div className="spacer" />
          {hasActiveQuery ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.academicCalendars.filters.reset')}
            </button>
          ) : null}
        </div>

        <ResourceView state={{ ...state, data: rows }} loadingLabel={t('common.loading')}>
          {(data) =>
            data.length === 0 ? (
              listEmptyState
            ) : (
              <>
                <DataTable
                  columns={columns}
                  rows={data}
                  rowKey={(row) => row.id}
                  onRowClick={(row) => router.push(`/admin/academic-calendars/${row.id}`)}
                />
                {pg ? (
                  <Pagination
                    page={pg.page ?? page}
                    pageSize={pg.page_size ?? ACADEMIC_CALENDARS_PAGE_SIZE}
                    total={pg.total ?? data.length}
                    totalPages={
                      pg.total_pages ??
                      Math.max(
                        1,
                        Math.ceil((pg.total ?? data.length) / (pg.page_size ?? ACADEMIC_CALENDARS_PAGE_SIZE)),
                      )
                    }
                    onPage={setPage}
                  />
                ) : null}
              </>
            )
          }
        </ResourceView>

        <GlobalAcademicCalendarCreateDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={(calendar) => {
            setCreateOpen(false);
            router.push(`/admin/academic-calendars/${calendar.id}`);
          }}
        />
      </div>
    </RequireAdminPermission>
  );
}
