'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Admin operational timetable — DataTable + client filters + inline create/update.
 * Scheduling semantics, payloads, conflict validation, and endpoints are unchanged.
 */

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { ResourceView } from '@/components/states/resource';
import { EmptyState } from '@/components/states/states';
import { Card, SectionHead } from '@/components/ui/primitives';
import { DataTable, type Column } from '@/components/tables/data-table';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { ConfirmActionButton } from '@/features/admin/confirm-action-button';
import { useAcademicContextOptions } from '@/features/academic-context';
import { endpoints } from '@/lib/api/endpoints';
import {
  TIMETABLE_ADMIN_DAYS,
  filterTimetableSlots,
  presentTimetableDay,
  presentTimetableTimeRange,
  resolveTimetableEmptyVariant,
  timetableHasActiveFilters,
} from '@/features/admin/timetable/utils/timetable-list-present';
import type { TimetableSlot } from '@/types/timetable';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';
import '@/features/admin/timetable/admin-timetable.css';

export function AdminTimetablePanel() {
  const user = useSession();
  const t = useT();
  const toast = useToast();
  const canManage = hasPermission(user, 'manage_timetable');
  const state = useAdminResource<TimetableSlot[]>(endpoints.admin.timetable);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const teachersState = useAdminResource<Teacher[]>(endpoints.admin.teachers, {
    page_size: 100,
  });

  const [classFilter, setClassFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [offeringId, setOfferingId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [day, setDay] = useState<(typeof TIMETABLE_ADMIN_DAYS)[number]>('monday');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  const context = useAcademicContextOptions({
    scope: 'timetable',
    enabled: Boolean(classId),
    initialSelection: { classId },
  });

  useEffect(() => {
    if (context.selection.classId !== classId) {
      context.setField('class', classId);
    }
    // Only sync class → context; avoid loops on subject.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional class-driven sync
  }, [classId]);

  useEffect(() => {
    if (!classId) {
      setSubjectId('');
      setOfferingId('');
      return;
    }
    if (subjectId && context.selection.subjectId !== subjectId) {
      context.setField('subject', subjectId);
    }
    // Re-apply subject after class sync so offerings load for edit/create.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subject sync after class
  }, [classId, subjectId]);

  const subjects = context.options?.subjects ?? [];
  const offerings = context.options?.offerings ?? [];
  const selectedOffering = offerings.find((o) => String(o.id) === offeringId) ?? null;

  const hasActiveFilters = timetableHasActiveFilters({
    classFilter,
    teacherFilter,
    dayFilter,
  });

  function resetFilters() {
    setClassFilter('');
    setTeacherFilter('');
    setDayFilter('');
  }

  function resetFormFields() {
    setClassId('');
    setSubjectId('');
    setOfferingId('');
    setTeacherId('');
    setDay('monday');
    setStartTime('08:30');
    setEndTime('10:00');
    setRoom('');
  }

  function startEdit(slot: TimetableSlot) {
    setEditId(slot.id);
    setShowForm(false);
    setClassId(String(slot.class?.id ?? ''));
    setSubjectId(String(slot.subject?.id ?? ''));
    setOfferingId(
      String(
        (slot as TimetableSlot & { teaching_offering_id?: number | null }).teaching_offering_id ??
          '',
      ),
    );
    setTeacherId(String(slot.teacher?.id ?? ''));
    setDay((slot.day as typeof day) ?? 'monday');
    setStartTime(slot.start_time ?? '08:30');
    setEndTime(slot.end_time ?? '10:00');
    setRoom(slot.room ?? '');
  }

  function cancelEdit() {
    setEditId(null);
    resetFormFields();
  }

  function toggleCreateForm() {
    setShowForm((open) => {
      const next = !open;
      if (next) {
        setEditId(null);
        resetFormFields();
      }
      return next;
    });
  }

  async function updateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const res = await api.post(endpoints.admin.timetableSlotUpdate(editId), {
      class_id: classId ? Number(classId) : undefined,
      subject_id: subjectId ? Number(subjectId) : undefined,
      teaching_offering_id: offeringId ? Number(offeringId) : undefined,
      teacher_id: teacherId ? Number(teacherId) : undefined,
      day,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.saveSuccess'));
      setEditId(null);
      resetFormFields();
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  async function createSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!classId || !subjectId || !teacherId) {
      toast.error(t('errors.validationFailed'));
      return;
    }
    setSaving(true);
    const res = await api.post(endpoints.admin.timetableSlots, {
      class_id: Number(classId),
      subject_id: Number(subjectId),
      teaching_offering_id: offeringId ? Number(offeringId) : undefined,
      teacher_id: Number(teacherId),
      day,
      start_time: startTime,
      end_time: endTime,
      room: room.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      toast.success(t('admin.saveSuccess'));
      setShowForm(false);
      resetFormFields();
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  const filtered = useMemo(
    () =>
      filterTimetableSlots(state.data ?? [], {
        classFilter,
        teacherFilter,
        dayFilter,
      }),
    [state.data, classFilter, teacherFilter, dayFilter],
  );

  const emptyVariant = resolveTimetableEmptyVariant({ hasActiveFilters });

  const columns: Column<TimetableSlot>[] = [
    {
      key: 'day',
      header: t('academic.date'),
      render: (s) => (
        <span className="admin-timetable-panel__day" dir="auto" title={presentTimetableDay(s, t, t('common.dash'))}>
          {presentTimetableDay(s, t, t('common.dash'))}
        </span>
      ),
    },
    {
      key: 'time',
      header: t('academic.time'),
      render: (s) => (
        <span className="admin-timetable-panel__time mono" dir="ltr">
          {presentTimetableTimeRange(s.start_time, s.end_time, t('common.dash'))}
        </span>
      ),
    },
    {
      key: 'class',
      header: t('nav.classes'),
      render: (s) => (
        <span className="admin-timetable-panel__name" dir="auto" title={s.class?.name ?? undefined}>
          {s.class?.name ?? t('common.dash')}
        </span>
      ),
    },
    {
      key: 'subject',
      header: t('academic.subject'),
      render: (s) => (
        <span className="admin-timetable-panel__name" dir="auto" title={s.subject?.name ?? undefined}>
          {s.subject?.name ?? t('common.dash')}
        </span>
      ),
    },
    {
      key: 'teacher',
      header: t('academic.teacher'),
      render: (s) => (
        <span className="admin-timetable-panel__name" dir="auto" title={s.teacher?.name ?? undefined}>
          {s.teacher?.name ?? t('common.dash')}
        </span>
      ),
    },
    {
      key: 'room',
      header: t('academic.room'),
      render: (s) => (
        <span className="admin-timetable-panel__room" dir="auto">
          {s.room ?? t('common.dash')}
        </span>
      ),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: t('admin.actions'),
            render: (s: TimetableSlot) => (
              <div className="admin-timetable-panel__row-actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => startEdit(s)}
                >
                  {t('common.edit')}
                </button>
                <ConfirmActionButton
                  label={t('admin.archive')}
                  confirmMessage={t('admin.confirmArchiveSlot')}
                  path={endpoints.admin.timetableSlotArchive(s.id)}
                  variant="danger"
                  onSuccess={() => state.reload()}
                />
              </div>
            ),
          } as Column<TimetableSlot>,
        ]
      : []),
  ];

  const classes = classesState.data ?? [];
  const teachers = teachersState.data ?? [];

  const listEmpty =
    emptyVariant === 'no-match' ? (
      <EmptyState
        icon="📅"
        title={t('admin.timetableList.noMatch.title')}
        description={t('admin.timetableList.noMatch.description')}
        action={
          <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
            {t('admin.timetableList.resetFilters')}
          </button>
        }
      />
    ) : (
      <EmptyState
        icon="📅"
        title={t('admin.timetableList.noData.title')}
        description={t('admin.timetableList.noData.description')}
      />
    );

  function renderSlotForm(mode: 'create' | 'edit') {
    const onSubmit = mode === 'create' ? createSlot : updateSlot;
    const requireCore = mode === 'create';

    return (
      <Card className="admin-timetable-panel__form-card">
        <SectionHead title={mode === 'create' ? t('admin.addSlot') : t('admin.editSlot')} />
        <form className="admin-timetable-panel__form" onSubmit={onSubmit}>
          <div className="admin-timetable-panel__form-grid">
            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-class`}>
                {t('admin.selectClass')}
                {requireCore ? <span className="admin-timetable-panel__required" aria-hidden>*</span> : null}
              </label>
              <select
                id={`timetable-${mode}-class`}
                className="input"
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSubjectId('');
                  setOfferingId('');
                }}
                required={requireCore}
              >
                <option value="">{t('admin.selectClass')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-subject`}>
                {t('admin.selectSubject')}
                {requireCore ? <span className="admin-timetable-panel__required" aria-hidden>*</span> : null}
              </label>
              <select
                id={`timetable-${mode}-subject`}
                className="input"
                value={subjectId}
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setOfferingId('');
                  context.setField('subject', e.target.value);
                }}
                required={requireCore}
                disabled={!classId}
              >
                <option value="">
                  {classId
                    ? t('admin.selectSubject')
                    : t('academicContext.hints.chooseLevelOrClassFirst')}
                </option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-offering`}>
                {t('academicContext.fields.offering')}
              </label>
              <select
                id={`timetable-${mode}-offering`}
                className="input"
                value={offeringId}
                onChange={(e) => {
                  setOfferingId(e.target.value);
                  context.setField('offering', e.target.value);
                }}
                disabled={!subjectId}
              >
                <option value="">
                  {offerings.length > 1
                    ? t('academicContext.placeholders.offeringRequired')
                    : t('academicContext.placeholders.offering')}
                </option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.display_label || o.name}
                  </option>
                ))}
              </select>
              {classId && context.loading ? (
                <p className="admin-timetable-panel__context-status" role="status">
                  {t('academicContext.loading')}
                </p>
              ) : null}
              {classId && context.permissionDenied ? (
                <p className="admin-timetable-panel__context-status" role="status">
                  {t('academicContext.permissionDenied')}
                </p>
              ) : null}
              {classId && context.error ? (
                <p className="admin-timetable-panel__context-status" role="alert">
                  {context.error.message}
                </p>
              ) : null}
              {editId && !offeringId ? (
                <p className="admin-timetable-panel__context-status" role="status">
                  {t('academicContext.hints.legacyMissingOffering')}
                </p>
              ) : null}
              {selectedOffering ? (
                <div
                  className="admin-timetable-panel__offering-context"
                  role="status"
                  aria-live="polite"
                >
                  {selectedOffering.teaching_language?.name ? (
                    <p dir="auto">
                      {t('academicContext.language.derivedFromOffering', {
                        language: selectedOffering.teaching_language.name,
                      })}
                    </p>
                  ) : null}
                  {selectedOffering.track?.name ? (
                    <p dir="auto">
                      {t('academicContext.fields.track')}: {selectedOffering.track.name}
                    </p>
                  ) : null}
                  {selectedOffering.teaching_reference?.name ? (
                    <p dir="auto">
                      {t('academicContext.fields.reference')}:{' '}
                      {selectedOffering.teaching_reference.name}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-teacher`}>
                {t('admin.selectTeacher')}
                {requireCore ? <span className="admin-timetable-panel__required" aria-hidden>*</span> : null}
              </label>
              <select
                id={`timetable-${mode}-teacher`}
                className="input"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required={requireCore}
              >
                <option value="">{t('admin.selectTeacher')}</option>
                {teachers.map((te) => (
                  <option key={te.id} value={te.id}>
                    {te.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-day`}>{t('admin.timetableList.day')}</label>
              <select
                id={`timetable-${mode}-day`}
                className="input"
                value={day}
                onChange={(e) => setDay(e.target.value as typeof day)}
              >
                {TIMETABLE_ADMIN_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {t(`days.${d}`)}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-start`}>{t('academic.startTime')}</label>
              <input
                id={`timetable-${mode}-start`}
                className="input"
                type="time"
                dir="ltr"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-end`}>{t('academic.endTime')}</label>
              <input
                id={`timetable-${mode}-end`}
                className="input"
                type="time"
                dir="ltr"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>

            <div className="admin-timetable-panel__form-field">
              <label htmlFor={`timetable-${mode}-room`}>{t('academic.room')}</label>
              <input
                id={`timetable-${mode}-room`}
                className="input"
                dir="auto"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder={t('academic.room')}
              />
            </div>
          </div>

          <div className="admin-timetable-panel__form-actions">
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={saving}
              onClick={() => {
                if (mode === 'create') {
                  setShowForm(false);
                  resetFormFields();
                } else {
                  cancelEdit();
                }
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <div className="admin-timetable-panel">
      <div className="admin-timetable-panel__context">
        <div className="admin-timetable-panel__context-meta">
          <span className="admin-timetable-panel__count" dir="ltr">
            {t('admin.timetableList.slotsCount', { count: filtered.length })}
          </span>
        </div>
      </div>

      <div className="admin-timetable-panel__filters toolbar" role="group" aria-label={t('admin.timetableList.filtersLabel')}>
        <div className="admin-timetable-panel__filter">
          <label htmlFor="timetable-filter-class">{t('nav.classes')}</label>
          <select
            id="timetable-filter-class"
            className="input"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">{t('admin.allClasses')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-timetable-panel__filter">
          <label htmlFor="timetable-filter-teacher">{t('nav.teachers')}</label>
          <select
            id="timetable-filter-teacher"
            className="input"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
          >
            <option value="">{t('admin.allTeachers')}</option>
            {teachers.map((te) => (
              <option key={te.id} value={te.id}>
                {te.name}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-timetable-panel__filter">
          <label htmlFor="timetable-filter-day">{t('admin.timetableList.day')}</label>
          <select
            id="timetable-filter-day"
            className="input"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
          >
            <option value="">{t('admin.allDays')}</option>
            {TIMETABLE_ADMIN_DAYS.map((d) => (
              <option key={d} value={d}>
                {t(`days.${d}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="admin-timetable-panel__filter-actions">
          {hasActiveFilters ? (
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetFilters}>
              {t('admin.timetableList.resetFilters')}
            </button>
          ) : null}
          {canManage ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={toggleCreateForm}
              aria-expanded={showForm}
            >
              {showForm ? t('common.cancel') : t('admin.addSlot')}
            </button>
          ) : null}
        </div>
      </div>

      {editId ? renderSlotForm('edit') : null}
      {canManage && showForm ? renderSlotForm('create') : null}

      <ResourceView
        state={state}
        loadingLabel={t('timetable.loadingWeek')}
        isEmpty={() => filtered.length === 0}
        empty={listEmpty}
      >
        {() => (
          <Card pad={false} className="admin-timetable-panel__table-wrap">
            <DataTable columns={columns} rows={filtered} rowKey={(s) => s.id} />
          </Card>
        )}
      </ResourceView>
    </div>
  );
}
