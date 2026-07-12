'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { EmptyState } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { Badge, Card, InfoBanner, PageHeader } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  AcademicCalendarDuplicateDialog,
  AcademicCalendarEventDialog,
} from '@/features/admin/academic-calendars/components/academic-calendar-dialogs';
import {
  archiveAcademicCalendar,
  createAcademicCalendarEvent,
  deleteAcademicCalendarEvent,
  fetchAcademicCalendarClosureContext,
  fetchAcademicCalendarEffectiveEvents,
  publishAcademicCalendar,
  resetAcademicCalendarToDraft,
  submitAcademicCalendarReview,
  updateAcademicCalendar,
  updateAcademicCalendarEvent,
} from '@/features/admin/academic-calendars/api/academic-calendars-api';
import {
  academicCalendarClosureKindLabelKey,
  academicCalendarDayPartLabelKey,
  academicCalendarEventImpactFlags,
  academicCalendarEventIsProvisional,
  academicCalendarEventTypeLabelKey,
  academicCalendarScopeLabelKey,
  defaultClosureQueryDate,
  mergeCalendarEventsForDisplay,
} from '@/features/admin/academic-calendars/utils/academic-calendar-present';
import {
  academicCalendarAllowsAction,
  academicCalendarStudyDaysDisplay,
} from '@/features/admin/academic-calendars/utils/normalize-academic-calendar';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type {
  AcademicCalendarClosureContext,
  AcademicCalendarDetail,
  AcademicCalendarEvent,
  AcademicCalendarEventPayload,
} from '@/types/academic-calendar';
import '@/features/admin/academic-calendars/academic-calendars.css';

function labelOrFallback(
  t: (key: string) => string,
  key: string,
  fallback: string | null | undefined,
): string {
  const translated = t(key);
  if (translated !== key) return translated;
  return fallback?.trim() || key.split('.').pop() || '—';
}

export function AcademicCalendarDetailView({
  calendar,
  onReload,
}: {
  calendar: AcademicCalendarDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { formatDate } = useFormat();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(calendar.name);
  const [editNotes, setEditNotes] = useState(calendar.notes ?? '');
  const [editSaving, setEditSaving] = useState(false);

  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDialogMode, setEventDialogMode] = useState<'create' | 'edit'>('create');
  const [editingEvent, setEditingEvent] = useState<AcademicCalendarEvent | null>(null);
  const [eventSaving, setEventSaving] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  const [deleteEvent, setDeleteEvent] = useState<AcademicCalendarEvent | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    'submit_review' | 'reset_to_draft' | 'publish' | 'archive' | null
  >(null);
  const [lifecycleSaving, setLifecycleSaving] = useState(false);

  const [effectiveEvents, setEffectiveEvents] = useState<AcademicCalendarEvent[] | null>(null);
  const [effectiveLoading, setEffectiveLoading] = useState(false);
  const [effectiveError, setEffectiveError] = useState<string | null>(null);
  const [includeProvisionalEffective, setIncludeProvisionalEffective] = useState(true);

  const [closureDate, setClosureDate] = useState(() => defaultClosureQueryDate(calendar));
  const [includeProvisionalClosure, setIncludeProvisionalClosure] = useState(true);
  const [closureContext, setClosureContext] = useState<AcademicCalendarClosureContext | null>(null);
  const [closureLoading, setClosureLoading] = useState(false);
  const [closureError, setClosureError] = useState<string | null>(null);

  useEffect(() => {
    setEditName(calendar.name);
    setEditNotes(calendar.notes ?? '');
    setClosureDate(defaultClosureQueryDate(calendar));
  }, [calendar.id, calendar.name, calendar.notes, calendar.effective_from, calendar.events]);

  const events = useMemo(
    () => mergeCalendarEventsForDisplay(calendar.events, calendar.provisional_events),
    [calendar.events, calendar.provisional_events],
  );

  const canEdit = academicCalendarAllowsAction(calendar, 'edit');
  const canCreateEvent = academicCalendarAllowsAction(calendar, 'add_event');
  const canUpdateEvent = academicCalendarAllowsAction(calendar, 'edit_event');
  const canDeleteEvent = academicCalendarAllowsAction(calendar, 'delete_event');
  const canSubmitReview = academicCalendarAllowsAction(calendar, 'submit_review');
  const canReset = academicCalendarAllowsAction(calendar, 'reset_to_draft');
  const canPublish = academicCalendarAllowsAction(calendar, 'publish');
  const canDuplicate = academicCalendarAllowsAction(calendar, 'duplicate');
  const canArchive = academicCalendarAllowsAction(calendar, 'archive');

  const loadEffectiveEvents = useCallback(async () => {
    const yearId = calendar.academic_year_id;
    if (yearId == null) {
      setEffectiveError(t('admin.academicCalendars.effectiveEvents.missingYear'));
      setEffectiveEvents(null);
      return;
    }
    setEffectiveLoading(true);
    setEffectiveError(null);
    const res = await fetchAcademicCalendarEffectiveEvents({
      academic_year_id: yearId,
      school_id: calendar.school_id ?? undefined,
      date_from: calendar.effective_from ?? undefined,
      date_to: calendar.effective_to ?? undefined,
      include_provisional: includeProvisionalEffective,
    });
    setEffectiveLoading(false);
    if (!res.success) {
      setEffectiveError(res.error.message);
      setEffectiveEvents(null);
      return;
    }
    setEffectiveEvents(res.data.events);
  }, [
    calendar.academic_year_id,
    calendar.school_id,
    calendar.effective_from,
    calendar.effective_to,
    includeProvisionalEffective,
    t,
  ]);

  const loadClosureContext = useCallback(async () => {
    if (!closureDate) {
      setClosureError(t('admin.academicCalendars.closureContext.missingDate'));
      setClosureContext(null);
      return;
    }
    setClosureLoading(true);
    setClosureError(null);
    const res = await fetchAcademicCalendarClosureContext({
      date: closureDate,
      calendar_id: calendar.id,
      include_provisional: includeProvisionalClosure,
    });
    setClosureLoading(false);
    if (!res.success) {
      setClosureError(res.error.message);
      setClosureContext(null);
      return;
    }
    setClosureContext(res.data);
  }, [calendar.id, closureDate, includeProvisionalClosure, t]);

  useEffect(() => {
    void loadEffectiveEvents();
  }, [loadEffectiveEvents]);

  useEffect(() => {
    void loadClosureContext();
  }, [loadClosureContext]);

  const summary = calendar.summary;
  const warnings = calendar.warnings ?? summary?.warnings ?? [];
  const studyDays = academicCalendarStudyDaysDisplay(summary);
  const studyDaysUnreliable = summary?.study_day_count_reliable === false;

  async function saveCalendarEdit() {
    if (!canEdit || editSaving) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setEditSaving(true);
    const res = await updateAcademicCalendar(calendar.id, {
      name: trimmed,
      notes: editNotes.trim() || undefined,
    });
    setEditSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.academicCalendars.edit.success'));
    setEditOpen(false);
    onReload();
  }

  async function saveEvent(values: AcademicCalendarEventPayload) {
    if (eventSaving) return;
    if (!values.name || !values.date_from) {
      setEventError(t('admin.academicCalendars.events.missingFields'));
      return;
    }
    setEventSaving(true);
    setEventError(null);
    const payload: AcademicCalendarEventPayload = {
      ...values,
      date_to: values.date_to || values.date_from,
    };
    const res =
      eventDialogMode === 'create'
        ? await createAcademicCalendarEvent(calendar.id, payload)
        : editingEvent
          ? await updateAcademicCalendarEvent(calendar.id, editingEvent.id, payload)
          : null;
    setEventSaving(false);
    if (!res) return;
    if (!res.success) {
      setEventError(res.error.message);
      toast.error(res.error.message);
      return;
    }
    toast.success(
      eventDialogMode === 'create'
        ? t('admin.academicCalendars.events.createSuccess')
        : t('admin.academicCalendars.events.editSuccess'),
    );
    setEventDialogOpen(false);
    setEditingEvent(null);
    onReload();
  }

  async function confirmDeleteEvent() {
    if (!deleteEvent || deleteSaving || !canDeleteEvent) return;
    setDeleteSaving(true);
    const res = await deleteAcademicCalendarEvent(calendar.id, deleteEvent.id);
    setDeleteSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.academicCalendars.events.deleteSuccess'));
    setDeleteEvent(null);
    onReload();
  }

  async function runLifecycle() {
    if (!confirmAction || lifecycleSaving) return;
    setLifecycleSaving(true);
    const runners = {
      submit_review: () => submitAcademicCalendarReview(calendar.id),
      reset_to_draft: () => resetAcademicCalendarToDraft(calendar.id),
      publish: () => publishAcademicCalendar(calendar.id),
      archive: () => archiveAcademicCalendar(calendar.id),
    } as const;
    const res = await runners[confirmAction]();
    setLifecycleSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t(`admin.academicCalendars.lifecycle.${confirmAction}Success`));
    setConfirmAction(null);
    onReload();
  }

  const eventColumns: Column<AcademicCalendarEvent>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('admin.academicCalendars.columns.event'),
        render: (event) => (
          <div className="academic-calendar-detail__event-name">
            <strong dir="auto">{event.name}</strong>
            <span className="muted tiny">
              {labelOrFallback(
                t,
                academicCalendarEventTypeLabelKey(event.event_type),
                event.event_type,
              )}
            </span>
          </div>
        ),
      },
      {
        key: 'dates',
        header: t('admin.academicCalendars.columns.period'),
        render: (event) => {
          const start = event.date_from ? formatDate(event.date_from) : t('common.dash');
          const end = event.date_to ? formatDate(event.date_to) : start;
          return `${start} – ${end}`;
        },
      },
      {
        key: 'scope',
        header: t('admin.academicCalendars.columns.scope'),
        render: (event) => {
          const scopeName =
            event.class?.name || event.level?.name || event.cycle?.name || null;
          if (scopeName) return scopeName;
          if (event.scope_type) {
            return labelOrFallback(
              t,
              academicCalendarScopeLabelKey(event.scope_type),
              event.scope_type,
            );
          }
          return t('common.dash');
        },
      },
      {
        key: 'impact',
        header: t('admin.academicCalendars.columns.impact'),
        render: (event) => academicCalendarEventImpactFlags(event, t) || t('common.dash'),
      },
      {
        key: 'status',
        header: t('admin.academicCalendars.columns.confirmation'),
        render: (event) =>
          academicCalendarEventIsProvisional(event) ? (
            <Badge tone="amber">{t('admin.academicCalendars.provisional')}</Badge>
          ) : (
            <Badge tone="green">{t('admin.academicCalendars.confirmed')}</Badge>
          ),
      },
      {
        key: 'actions',
        header: t('common.actions'),
        render: (event) => {
          if (!canUpdateEvent && !canDeleteEvent) return t('common.dash');
          return (
            <div className="academic-calendar-detail__event-actions">
              {canUpdateEvent ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(event);
                    setEventDialogMode('edit');
                    setEventError(null);
                    setEventDialogOpen(true);
                  }}
                >
                  {t('common.edit')}
                </button>
              ) : null}
              {canDeleteEvent ? (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteEvent(event);
                  }}
                >
                  {t('common.delete')}
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, formatDate, canUpdateEvent, canDeleteEvent],
  );

  const lifecycleConfirmCopy = {
    submit_review: {
      title: t('admin.academicCalendars.lifecycle.submitReview'),
      body: t('admin.academicCalendars.lifecycle.submitReviewConfirm'),
    },
    reset_to_draft: {
      title: t('admin.academicCalendars.lifecycle.resetToDraft'),
      body: t('admin.academicCalendars.lifecycle.resetToDraftConfirm'),
    },
    publish: {
      title: t('admin.academicCalendars.lifecycle.publish'),
      body: t('admin.academicCalendars.lifecycle.publishConfirm'),
    },
    archive: {
      title: t('admin.academicCalendars.lifecycle.archive'),
      body: t('admin.academicCalendars.lifecycle.archiveConfirm'),
    },
  } as const;

  return (
    <div className="academic-calendar-detail">
      <nav
        className="academic-calendar-detail__breadcrumb"
        aria-label={t('admin.academicCalendars.detailBreadcrumb')}
      >
        <Link href="/admin/academic-calendars">{t('admin.academicCalendars.title')}</Link>
        <span className="academic-calendar-detail__breadcrumb-sep" aria-hidden="true">
          /
        </span>
        <span>{calendar.name}</span>
      </nav>

      <Link href="/admin/academic-calendars" className="back-link">
        ‹ {t('admin.academicCalendars.backToList')}
      </Link>

      <PageHeader
        title={calendar.name}
        subtitle={
          calendar.academic_year_name
            ? t('admin.academicCalendars.detailSubtitle', { year: calendar.academic_year_name })
            : t('admin.academicCalendars.subtitle')
        }
        actions={
          <div className="academic-calendar-detail__actions">
            {canEdit ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setEditOpen(true)}
              >
                {t('common.edit')}
              </button>
            ) : null}
            {canSubmitReview ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAction('submit_review')}
              >
                {t('admin.academicCalendars.lifecycle.submitReview')}
              </button>
            ) : null}
            {canReset ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAction('reset_to_draft')}
              >
                {t('admin.academicCalendars.lifecycle.resetToDraft')}
              </button>
            ) : null}
            {canPublish ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => setConfirmAction('publish')}
              >
                {t('admin.academicCalendars.lifecycle.publish')}
              </button>
            ) : null}
            {canDuplicate ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setDuplicateOpen(true)}
              >
                {t('admin.academicCalendars.lifecycle.duplicate')}
              </button>
            ) : null}
            {canArchive ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setConfirmAction('archive')}
              >
                {t('admin.academicCalendars.lifecycle.archive')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="academic-calendar-detail__header-meta">
        <WorkflowBadge state={calendar.state} />
        {calendar.version_number != null ? (
          <Badge tone="blue">
            {t('admin.academicCalendars.versionLabel', { version: calendar.version_number })}
          </Badge>
        ) : null}
        {calendar.effective_from || calendar.effective_to ? (
          <span className="muted">
            {(calendar.effective_from ? formatDate(calendar.effective_from) : t('common.dash')) +
              ' – ' +
              (calendar.effective_to ? formatDate(calendar.effective_to) : t('common.dash'))}
          </span>
        ) : null}
      </div>

      {(warnings.length > 0 || studyDaysUnreliable) && (
        <div className="academic-calendar-detail__warnings">
          {studyDaysUnreliable ? (
            <InfoBanner
              tone="amber"
              icon="⚠"
              title={t('admin.academicCalendars.studyDaysUnreliableTitle')}
              description={t('admin.academicCalendars.studyDaysUnreliableDesc')}
            />
          ) : null}
          {warnings.map((warning, index) => (
            <InfoBanner
              key={`${warning.code ?? 'w'}-${index}`}
              tone={warning.severity === 'error' ? 'amber' : warning.severity === 'info' ? 'blue' : 'amber'}
              icon="⚠"
              title={warning.code ? warning.code : t('admin.academicCalendars.warningTitle')}
              description={warning.message}
            />
          ))}
        </div>
      )}

      {summary ? (
        <div className="academic-calendar-detail__summary-grid">
          {summary.calendar_day_count != null ? (
            <div className="academic-calendar-detail__summary-item">
              <span>{t('admin.academicCalendars.summary.calendarDays')}</span>
              <strong>{summary.calendar_day_count}</strong>
            </div>
          ) : null}
          <div className="academic-calendar-detail__summary-item">
            <span>{t('admin.academicCalendars.summary.studyDays')}</span>
            <strong>
              {studyDays.reliable && studyDays.value != null
                ? studyDays.value
                : t('admin.academicCalendars.summary.studyDaysUnreliableValue')}
            </strong>
          </div>
          {summary.event_count != null ? (
            <div className="academic-calendar-detail__summary-item">
              <span>{t('admin.academicCalendars.summary.events')}</span>
              <strong>{summary.event_count}</strong>
            </div>
          ) : null}
          {summary.confirmed_event_count != null ? (
            <div className="academic-calendar-detail__summary-item">
              <span>{t('admin.academicCalendars.summary.confirmedEvents')}</span>
              <strong>{summary.confirmed_event_count}</strong>
            </div>
          ) : null}
          {summary.provisional_event_count != null ? (
            <div className="academic-calendar-detail__summary-item">
              <span>{t('admin.academicCalendars.summary.provisionalEvents')}</span>
              <strong>{summary.provisional_event_count}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {calendar.notes ? (
        <Card>
          <h2 style={{ marginTop: 0, fontSize: 15 }}>{t('admin.academicCalendars.fields.notes')}</h2>
          <p className="muted" style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
            {calendar.notes}
          </p>
        </Card>
      ) : null}

      <Card pad={false}>
        <div className="card--pad academic-calendar-detail__section-head">
          <h2>{t('admin.academicCalendars.events.title')}</h2>
          {canCreateEvent ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setEditingEvent(null);
                setEventDialogMode('create');
                setEventError(null);
                setEventDialogOpen(true);
              }}
            >
              {t('admin.academicCalendars.events.createOpen')}
            </button>
          ) : null}
        </div>
        {events.length === 0 ? (
          <div className="card--pad">
            <EmptyState
              compact
              icon="📌"
              title={t('admin.academicCalendars.events.emptyTitle')}
              description={t('admin.academicCalendars.events.emptyDesc')}
            />
          </div>
        ) : (
          <DataTable columns={eventColumns} rows={events} rowKey={(row) => row.id} />
        )}
      </Card>

      <Card>
        <div className="academic-calendar-detail__section-head">
          <h2>{t('admin.academicCalendars.effectiveEvents.title')}</h2>
          <div className="academic-calendar-detail__section-tools">
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={includeProvisionalEffective}
                onChange={(e) => setIncludeProvisionalEffective(e.target.checked)}
              />
              <span className="tiny">{t('admin.academicCalendars.effectiveEvents.includeProvisional')}</span>
            </label>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={effectiveLoading}
              onClick={() => void loadEffectiveEvents()}
            >
              {effectiveLoading ? t('common.loading') : t('common.refresh')}
            </button>
          </div>
        </div>
        {effectiveError ? <p className="form-error">{effectiveError}</p> : null}
        {effectiveEvents && effectiveEvents.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {effectiveEvents.map((event) => (
              <li key={`eff-${event.id}`} className="between" style={{ padding: '8px 0' }}>
                <div>
                  <strong dir="auto">{event.name}</strong>
                  <div className="muted tiny">
                    {(event.date_from ? formatDate(event.date_from) : '—') +
                      ' – ' +
                      (event.date_to ? formatDate(event.date_to) : '—')}
                    {academicCalendarEventIsProvisional(event)
                      ? ` · ${t('admin.academicCalendars.provisional')}`
                      : ` · ${t('admin.academicCalendars.confirmed')}`}
                  </div>
                </div>
                <span className="muted tiny">{academicCalendarEventImpactFlags(event, t)}</span>
              </li>
            ))}
          </ul>
        ) : !effectiveLoading && !effectiveError ? (
          <p className="muted">{t('admin.academicCalendars.effectiveEvents.empty')}</p>
        ) : null}
      </Card>

      <Card>
        <div className="academic-calendar-detail__section-head">
          <h2>{t('admin.academicCalendars.closureContext.title')}</h2>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={closureLoading}
            onClick={() => void loadClosureContext()}
          >
            {closureLoading ? t('common.loading') : t('common.refresh')}
          </button>
        </div>
        <div className="academic-calendar-form" style={{ marginBottom: 12 }}>
          <div className="academic-calendar-form__row">
            <div className="field">
              <label>{t('admin.academicCalendars.closureContext.date')}</label>
              <DatePickerInput
                value={closureDate}
                onChange={setClosureDate}
                disabled={closureLoading}
                presets={false}
              />
            </div>
            <label className="row" style={{ gap: 8, alignItems: 'center', marginTop: 24 }}>
              <input
                type="checkbox"
                checked={includeProvisionalClosure}
                onChange={(e) => setIncludeProvisionalClosure(e.target.checked)}
                disabled={closureLoading}
              />
              <span>{t('admin.academicCalendars.closureContext.includeProvisional')}</span>
            </label>
          </div>
        </div>
        {closureError ? <p className="form-error">{closureError}</p> : null}
        {closureContext ? (
          <>
            {(closureContext.warnings ?? []).map((warning, index) => (
              <InfoBanner
                key={`closure-w-${index}`}
                tone="amber"
                icon="⚠"
                title={t('admin.academicCalendars.warningTitle')}
                description={warning.message}
              />
            ))}
            <dl className="academic-calendar-detail__dl">
              <dt>{t('admin.academicCalendars.closureContext.isClosed')}</dt>
              <dd>
                {closureContext.is_closed
                  ? t('admin.academicCalendars.closureContext.closedYes')
                  : t('admin.academicCalendars.closureContext.closedNo')}
              </dd>
              <dt>{t('admin.academicCalendars.closureContext.kind')}</dt>
              <dd>
                {labelOrFallback(
                  t,
                  academicCalendarClosureKindLabelKey(closureContext.closure_kind),
                  closureContext.closure_kind,
                )}
              </dd>
              <dt>{t('admin.academicCalendars.fields.dayPart')}</dt>
              <dd>
                {closureContext.day_part
                  ? labelOrFallback(
                      t,
                      academicCalendarDayPartLabelKey(closureContext.day_part),
                      closureContext.day_part,
                    )
                  : t('common.dash')}
              </dd>
              <dt>{t('admin.academicCalendars.columns.confirmation')}</dt>
              <dd>
                {closureContext.status
                  ? closureContext.status === 'provisional'
                    ? t('admin.academicCalendars.provisional')
                    : t('admin.academicCalendars.confirmed')
                  : t('common.dash')}
              </dd>
              <dt>{t('admin.academicCalendars.closureContext.causingEvent')}</dt>
              <dd>
                {closureContext.causing_event?.name
                  ? closureContext.causing_event.name
                  : t('common.dash')}
              </dd>
            </dl>
            {closureContext.provisional_only ? (
              <div style={{ marginTop: 12 }}>
                <InfoBanner
                  tone="amber"
                  icon="⚠"
                  title={t('admin.academicCalendars.closureContext.provisionalOnlyTitle')}
                  description={t('admin.academicCalendars.closureContext.provisionalOnlyDesc')}
                />
              </div>
            ) : null}
          </>
        ) : !closureLoading && !closureError ? (
          <p className="muted">{t('admin.academicCalendars.closureContext.empty')}</p>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={editOpen}
        title={t('admin.academicCalendars.edit.title')}
        size="form"
        loading={editSaving}
        confirmLabel={t('common.save')}
        onConfirm={saveCalendarEdit}
        onClose={() => setEditOpen(false)}
        body={
          <div className="academic-calendar-form">
            <div className="field">
              <label htmlFor="ac-edit-name">{t('admin.academicCalendars.fields.name')}</label>
              <input
                id="ac-edit-name"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={editSaving}
              />
            </div>
            <div className="field">
              <label htmlFor="ac-edit-notes">{t('admin.academicCalendars.fields.notes')}</label>
              <textarea
                id="ac-edit-notes"
                className="textarea"
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSaving}
              />
            </div>
          </div>
        }
      />

      <AcademicCalendarEventDialog
        open={eventDialogOpen}
        mode={eventDialogMode}
        initial={
          editingEvent
            ? {
                name: editingEvent.name,
                event_type: editingEvent.event_type,
                date_from: editingEvent.date_from,
                date_to: editingEvent.date_to,
                day_part: editingEvent.day_part || 'full_day',
                scope_type: editingEvent.scope_type || 'school',
                status: editingEvent.status || 'confirmed',
                is_school_closed: editingEvent.is_school_closed !== false,
                blocks_timetable: editingEvent.blocks_timetable !== false,
                blocks_attendance: editingEvent.blocks_attendance !== false,
                blocks_exams: editingEvent.blocks_exams !== false,
                affects_services: editingEvent.affects_services !== false,
                notes: editingEvent.notes || '',
              }
            : undefined
        }
        saving={eventSaving}
        error={eventError}
        onClose={() => {
          if (eventSaving) return;
          setEventDialogOpen(false);
          setEditingEvent(null);
        }}
        onSubmit={saveEvent}
      />

      <ConfirmationDialog
        open={deleteEvent != null}
        title={t('admin.academicCalendars.events.deleteTitle')}
        body={t('admin.academicCalendars.events.deleteConfirm', {
          name: deleteEvent?.name ?? '',
        })}
        variant="danger"
        loading={deleteSaving}
        confirmLabel={t('common.delete')}
        onConfirm={confirmDeleteEvent}
        onClose={() => setDeleteEvent(null)}
      />

      <ConfirmationDialog
        open={confirmAction != null}
        title={confirmAction ? lifecycleConfirmCopy[confirmAction].title : ''}
        body={confirmAction ? lifecycleConfirmCopy[confirmAction].body : ''}
        variant={confirmAction === 'archive' ? 'danger' : 'primary'}
        loading={lifecycleSaving}
        confirmLabel={confirmAction ? lifecycleConfirmCopy[confirmAction].title : undefined}
        onConfirm={runLifecycle}
        onClose={() => setConfirmAction(null)}
      />

      <AcademicCalendarDuplicateDialog
        open={duplicateOpen}
        calendar={calendar}
        onClose={() => setDuplicateOpen(false)}
        onDuplicated={(created) => {
          setDuplicateOpen(false);
          router.push(`/admin/academic-calendars/${created.id}`);
        }}
      />
    </div>
  );
}
