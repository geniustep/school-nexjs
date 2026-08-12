'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useT } from '@/features/i18n/locale-context';
import { duplicateAcademicCalendar } from '@/features/admin/academic-calendars/api/academic-calendars-api';
import {
  ACADEMIC_CALENDAR_DAY_PART_OPTIONS,
  ACADEMIC_CALENDAR_EVENT_TYPE_OPTIONS,
  suggestDuplicateCalendarName,
} from '@/features/admin/academic-calendars/utils/academic-calendar-present';
import type {
  AcademicCalendarDetail,
  AcademicCalendarEventPayload,
  AcademicCalendarSummary,
} from '@/types/academic-calendar';

export function AcademicCalendarDuplicateDialog({
  open,
  calendar,
  onClose,
  onDuplicated,
}: {
  open: boolean;
  calendar: AcademicCalendarSummary | AcademicCalendarDetail;
  onClose: () => void;
  onDuplicated: (calendar: AcademicCalendarDetail) => void;
}) {
  const t = useT();
  const toast = useToast();
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(null);
  const defaultName = useMemo(
    () => suggestDuplicateCalendarName(calendar.name),
    [calendar.name],
  );
  const [name, setName] = useState(defaultName);
  const [yearId, setYearId] = useState(
    calendar.academic_year_id != null ? String(calendar.academic_year_id) : '',
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(suggestDuplicateCalendarName(calendar.name));
    setYearId(calendar.academic_year_id != null ? String(calendar.academic_year_id) : '');
    setSaving(false);
  }, [open, calendar.id, calendar.name, calendar.academic_year_id]);

  async function confirm() {
    if (saving) return;
    setSaving(true);
    const academicYearId = Number(yearId);
    const res = await duplicateAcademicCalendar(calendar.id, {
      name: name.trim() || undefined,
      academic_year_id:
        Number.isFinite(academicYearId) && academicYearId > 0 ? academicYearId : undefined,
    });
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.academicCalendars.lifecycle.duplicateSuccess'));
    onClose();
    onDuplicated(res.data);
  }

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.academicCalendars.lifecycle.duplicate')}
      size="form"
      loading={saving}
      confirmLabel={t('admin.academicCalendars.lifecycle.duplicate')}
      onConfirm={confirm}
      onClose={onClose}
      body={
        <div className="academic-calendar-form">
          <p className="muted">{t('admin.academicCalendars.lifecycle.duplicateHint')}</p>
          <div className="field">
            <label htmlFor="ac-dup-name">{t('admin.academicCalendars.fields.name')}</label>
            <input
              id="ac-dup-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="field">
            <label htmlFor="ac-dup-year">{t('admin.academicCalendars.fields.academicYear')}</label>
            <select
              id="ac-dup-year"
              className="select"
              value={yearId}
              onChange={(e) => setYearId(e.target.value)}
              disabled={saving || yearsLoading}
            >
              <option value="">{t('admin.academicCalendars.filters.yearAll')}</option>
              {yearOptions.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      }
    />
  );
}

type EventDialogValues = {
  name: string;
  event_type: string;
  date_from: string;
  date_to: string;
  day_part: string;
  scope_type: string;
  status: string;
  is_school_closed: boolean;
  blocks_timetable: boolean;
  blocks_attendance: boolean;
  blocks_exams: boolean;
  affects_services: boolean;
  notes: string;
};

const DEFAULT_EVENT_VALUES: EventDialogValues = {
  name: '',
  event_type: 'school_closure',
  date_from: '',
  date_to: '',
  day_part: 'full_day',
  scope_type: 'school',
  status: 'confirmed',
  is_school_closed: true,
  blocks_timetable: true,
  blocks_attendance: true,
  blocks_exams: true,
  affects_services: true,
  notes: '',
};

export function AcademicCalendarEventDialog({
  open,
  mode,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  initial?: EventDialogValues;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: AcademicCalendarEventPayload) => void | Promise<void>;
}) {
  const t = useT();
  const [name, setName] = useState(initial?.name ?? DEFAULT_EVENT_VALUES.name);
  const [eventType, setEventType] = useState(
    initial?.event_type ?? DEFAULT_EVENT_VALUES.event_type,
  );
  const [dateFrom, setDateFrom] = useState(initial?.date_from ?? '');
  const [dateTo, setDateTo] = useState(initial?.date_to ?? '');
  const [dayPart, setDayPart] = useState(initial?.day_part ?? 'full_day');
  const [scopeType, setScopeType] = useState(initial?.scope_type ?? 'school');
  const [status, setStatus] = useState(initial?.status ?? 'confirmed');
  const [isSchoolClosed, setIsSchoolClosed] = useState(initial?.is_school_closed ?? true);
  const [blocksTimetable, setBlocksTimetable] = useState(initial?.blocks_timetable ?? true);
  const [blocksAttendance, setBlocksAttendance] = useState(initial?.blocks_attendance ?? true);
  const [blocksExams, setBlocksExams] = useState(initial?.blocks_exams ?? true);
  const [affectsServices, setAffectsServices] = useState(initial?.affects_services ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  useEffect(() => {
    if (!open) return;
    const src = initial ?? DEFAULT_EVENT_VALUES;
    setName(src.name);
    setEventType(src.event_type);
    setDateFrom(src.date_from);
    setDateTo(src.date_to);
    setDayPart(src.day_part);
    setScopeType(src.scope_type);
    setStatus(src.status);
    setIsSchoolClosed(src.is_school_closed);
    setBlocksTimetable(src.blocks_timetable);
    setBlocksAttendance(src.blocks_attendance);
    setBlocksExams(src.blocks_exams);
    setAffectsServices(src.affects_services);
    setNotes(src.notes);
  }, [open, mode, initial]);

  return (
    <ConfirmationDialog
      open={open}
      title={
        mode === 'create'
          ? t('admin.academicCalendars.events.createTitle')
          : t('admin.academicCalendars.events.editTitle')
      }
      size="form"
      loading={saving}
      confirmLabel={
        mode === 'create'
          ? t('admin.academicCalendars.events.createSubmit')
          : t('admin.academicCalendars.events.editSubmit')
      }
      onConfirm={() =>
        onSubmit({
          name: name.trim(),
          event_type: eventType,
          date_from: dateFrom,
          date_to: dateTo || dateFrom,
          day_part: dayPart,
          scope_type: scopeType,
          status,
          is_school_closed: isSchoolClosed,
          blocks_timetable: blocksTimetable,
          blocks_attendance: blocksAttendance,
          blocks_exams: blocksExams,
          affects_services: affectsServices,
          notes: notes.trim() || null,
        })
      }
      onClose={onClose}
      body={
        <div className="academic-calendar-form">
          {error && <p className="form-error">{error}</p>}
          <div className="field">
            <label htmlFor="ac-event-name">{t('admin.academicCalendars.fields.eventName')}</label>
            <input
              id="ac-event-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
            />
          </div>
          <div className="academic-calendar-form__row">
            <div className="field">
              <label htmlFor="ac-event-type">{t('admin.academicCalendars.fields.eventType')}</label>
              <select
                id="ac-event-type"
                className="select"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={saving}
              >
                {ACADEMIC_CALENDAR_EVENT_TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {t(`admin.academicCalendars.eventTypes.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ac-event-scope">{t('admin.academicCalendars.fields.scope')}</label>
              <select
                id="ac-event-scope"
                className="select"
                value={scopeType}
                onChange={(e) => setScopeType(e.target.value)}
                disabled={saving}
              >
                <option value="school">{t('admin.academicCalendars.scopeTypes.school')}</option>
                <option value="cycle">{t('admin.academicCalendars.scopeTypes.cycle')}</option>
                <option value="level">{t('admin.academicCalendars.scopeTypes.level')}</option>
                <option value="class">{t('admin.academicCalendars.scopeTypes.class')}</option>
              </select>
            </div>
          </div>
          <div className="academic-calendar-form__row">
            <div className="field">
              <label>{t('admin.academicCalendars.fields.dateFrom')}</label>
              <DatePickerInput
                value={dateFrom}
                onChange={setDateFrom}
                disabled={saving}
                presets={false}
              />
            </div>
            <div className="field">
              <label>{t('admin.academicCalendars.fields.dateTo')}</label>
              <DatePickerInput
                value={dateTo}
                onChange={setDateTo}
                disabled={saving}
                presets={false}
                min={dateFrom || undefined}
              />
            </div>
          </div>
          <div className="academic-calendar-form__row">
            <div className="field">
              <label htmlFor="ac-event-day-part">{t('admin.academicCalendars.fields.dayPart')}</label>
              <select
                id="ac-event-day-part"
                className="select"
                value={dayPart}
                onChange={(e) => setDayPart(e.target.value)}
                disabled={saving}
              >
                {ACADEMIC_CALENDAR_DAY_PART_OPTIONS.map((part) => (
                  <option key={part} value={part}>
                    {t(`admin.academicCalendars.dayParts.${part}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ac-event-status">{t('admin.academicCalendars.fields.status')}</label>
              <select
                id="ac-event-status"
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
              >
                <option value="confirmed">{t('admin.academicCalendars.confirmed')}</option>
                <option value="provisional">{t('admin.academicCalendars.provisional')}</option>
              </select>
            </div>
          </div>
          <div className="academic-calendar-form__flags">
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={isSchoolClosed}
                onChange={(e) => setIsSchoolClosed(e.target.checked)}
                disabled={saving}
              />
              <span>{t('admin.academicCalendars.impactFlags.schoolClosed')}</span>
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={blocksTimetable}
                onChange={(e) => setBlocksTimetable(e.target.checked)}
                disabled={saving}
              />
              <span>{t('admin.academicCalendars.impactFlags.blocksTimetable')}</span>
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={blocksAttendance}
                onChange={(e) => setBlocksAttendance(e.target.checked)}
                disabled={saving}
              />
              <span>{t('admin.academicCalendars.impactFlags.blocksAttendance')}</span>
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={blocksExams}
                onChange={(e) => setBlocksExams(e.target.checked)}
                disabled={saving}
              />
              <span>{t('admin.academicCalendars.impactFlags.blocksExams')}</span>
            </label>
            <label className="row" style={{ gap: 8, alignItems: 'center' }}>
              <input
                type="checkbox"
                checked={affectsServices}
                onChange={(e) => setAffectsServices(e.target.checked)}
                disabled={saving}
              />
              <span>{t('admin.academicCalendars.impactFlags.affectsServices')}</span>
            </label>
          </div>
          <div className="field">
            <label htmlFor="ac-event-notes">{t('admin.academicCalendars.fields.notes')}</label>
            <textarea
              id="ac-event-notes"
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>
      }
    />
  );
}
