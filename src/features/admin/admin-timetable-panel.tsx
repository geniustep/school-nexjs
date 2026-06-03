'use client';

import { useMemo, useState } from 'react';
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
import { endpoints } from '@/lib/api/endpoints';
import { formatTimeRange } from '@/features/timetable/utils';
import type { TimetableSlot } from '@/types/timetable';
import type { Ref } from '@/types/api';
import type { SchoolClass } from '@/types/class';
import type { Teacher } from '@/types/teacher';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

export function AdminTimetablePanel() {
  const user = useSession();
  const t = useT();
  const toast = useToast();
  const canManage = hasPermission(user, 'manage_timetable');
  const state = useAdminResource<TimetableSlot[]>(endpoints.admin.timetable);
  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes);
  const subjectsState = useAdminResource<Ref[]>(endpoints.admin.subjects);
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
  const [teacherId, setTeacherId] = useState('');
  const [day, setDay] = useState<(typeof DAYS)[number]>('monday');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [editId, setEditId] = useState<number | null>(null);

  function startEdit(slot: TimetableSlot) {
    setEditId(slot.id);
    setShowForm(false);
    setClassId(String(slot.class?.id ?? ''));
    setSubjectId(String(slot.subject?.id ?? ''));
    setTeacherId(String(slot.teacher?.id ?? ''));
    setDay((slot.day as typeof day) ?? 'monday');
    setStartTime(slot.start_time ?? '08:30');
    setEndTime(slot.end_time ?? '10:00');
    setRoom(slot.room ?? '');
  }

  async function updateSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    const res = await api.post(endpoints.admin.timetableSlotUpdate(editId), {
      class_id: classId ? Number(classId) : undefined,
      subject_id: subjectId ? Number(subjectId) : undefined,
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
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  const filtered = useMemo(() => {
    const rows = state.data ?? [];
    return rows.filter((slot) => {
      if (classFilter && String(slot.class?.id) !== classFilter) return false;
      if (teacherFilter && String(slot.teacher?.id) !== teacherFilter) return false;
      if (dayFilter && slot.day !== dayFilter) return false;
      return true;
    });
  }, [state.data, classFilter, teacherFilter, dayFilter]);

  const columns: Column<TimetableSlot>[] = [
    {
      key: 'day',
      header: t('academic.date'),
      render: (s) => s.day_label ?? s.day ?? t('common.dash'),
    },
    {
      key: 'time',
      header: t('academic.time'),
      render: (s) => formatTimeRange(s.start_time, s.end_time),
    },
    { key: 'class', header: t('nav.classes'), render: (s) => s.class?.name ?? t('common.dash') },
    {
      key: 'subject',
      header: t('academic.subject'),
      render: (s) => s.subject?.name ?? t('common.dash'),
    },
    {
      key: 'teacher',
      header: t('academic.teacher'),
      render: (s) => s.teacher?.name ?? t('common.dash'),
    },
    { key: 'room', header: t('academic.room'), render: (s) => s.room ?? t('common.dash') },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: t('admin.actions'),
            render: (s: TimetableSlot) => (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => startEdit(s)}>
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
      state.reload();
    } else {
      toast.error(res.error.message);
    }
  }

  const classes = classesState.data ?? [];
  const subjects = subjectsState.data ?? [];
  const teachers = teachersState.data ?? [];

  return (
    <>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <select className="input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="">{t('admin.allClasses')}</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
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
        <select className="input" value={dayFilter} onChange={(e) => setDayFilter(e.target.value)}>
          <option value="">{t('admin.allDays')}</option>
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {t(`days.${d}`)}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? t('common.cancel') : t('admin.addSlot')}
        </button>
      </form>

      {editId && (
        <Card className="mb-2">
          <SectionHead title={t('admin.editSlot')} />
          <form className="col mt-2" style={{ gap: 12 }} onSubmit={updateSlot}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">{t('admin.selectClass')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select className="input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">{t('admin.selectSubject')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <select className="input" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                <option value="">{t('admin.selectTeacher')}</option>
                {teachers.map((te) => (
                  <option key={te.id} value={te.id}>{te.name}</option>
                ))}
              </select>
              <select className="input" value={day} onChange={(e) => setDay(e.target.value as typeof day)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>{t(`days.${d}`)}</option>
                ))}
              </select>
              <input className="input" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <input className="input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              <input className="input" placeholder={t('academic.room')} value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditId(null)}>
                {t('common.cancel')}
              </button>
            </div>
          </form>
        </Card>
      )}

      {canManage && showForm && (
        <Card className="mb-2">
          <SectionHead title={t('admin.addSlot')} />
          <form className="col mt-2" style={{ gap: 12 }} onSubmit={createSlot}>
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              <select className="input" value={classId} onChange={(e) => setClassId(e.target.value)} required>
                <option value="">{t('admin.selectClass')}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="">{t('admin.selectSubject')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className="input"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
              >
                <option value="">{t('admin.selectTeacher')}</option>
                {teachers.map((te) => (
                  <option key={te.id} value={te.id}>
                    {te.name}
                  </option>
                ))}
              </select>
              <select className="input" value={day} onChange={(e) => setDay(e.target.value as typeof day)}>
                {DAYS.map((d) => (
                  <option key={d} value={d}>
                    {t(`days.${d}`)}
                  </option>
                ))}
              </select>
              <input
                className="input"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <input
                className="input"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <input
                className="input"
                placeholder={t('academic.room')}
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--primary btn--sm" disabled={saving}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </form>
        </Card>
      )}

      <ResourceView
        state={state}
        loadingLabel={t('timetable.loadingWeek')}
        isEmpty={() => filtered.length === 0}
        empty={<EmptyState icon="📅" title={t('empty.timetableWeek')} />}
      >
        {() => (
          <Card pad={false}>
            <DataTable columns={columns} rows={filtered} rowKey={(s) => s.id} />
          </Card>
        )}
      </ResourceView>
    </>
  );
}
