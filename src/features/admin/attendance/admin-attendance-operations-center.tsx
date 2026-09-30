'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { ResourceView } from '@/components/states/resource';
import { useToast } from '@/components/ui/toast';
import { AdminAttendanceCorrectionPanel } from '@/features/admin/attendance/admin-attendance-ops-ui';
import { todayIso } from '@/features/admin/attendance/admin-attendance-utils';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { cn } from '@/lib/utils/cn';
import { formatDateTime } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import type { AcademicContextOptionsResponse } from '@/types/academic-context';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import type {
  AttendanceClassBatchResult,
  AttendanceClassDetails,
  AttendanceOperationStatus,
  AttendanceOperationsOverview,
  AttendanceOverviewClass,
} from './admin-attendance-operations-contract';
import {
  buildAttendanceClassBatchItems,
  buildAttendanceCycleOptions,
  buildAttendanceLevelOptions,
  buildAttendanceRosterDraft,
  classOperationAction,
  classShowsCorrectionAction,
  classShowsRegisteredState,
  classesForAttendanceCycle,
  classesForAttendanceLevel,
  filterAttendanceOperationClasses,
  hasAttendanceBatchConcurrencyFailure,
  isAttendanceRosterRowDirty,
  levelsForAttendanceCycle,
  type AttendanceClassFilter,
  type AttendanceClassIdFilter,
  type AttendanceCycleFilter,
  type AttendanceLevelFilter,
  type AttendanceRosterDraftRow,
} from './admin-attendance-operations-utils';
import './admin-attendance.css';
import './admin-attendance-operations-center.css';

const ATTENDANCE_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];
const CLASS_FILTERS: AttendanceClassFilter[] = [
  'all',
  'completed',
  'in_progress',
  'not_started',
  'closed',
  'empty',
];

type ClassWorkspaceMode = 'record' | 'view' | 'correct';

function overviewPath(): string {
  return `${endpoints.admin.attendance}/overview`;
}

function classPath(classId: number): string {
  return `${endpoints.admin.attendance}/classes/${classId}`;
}

function classBatchPath(classId: number): string {
  return `${classPath(classId)}/batch`;
}

function shiftIsoDay(value: string, days: number): string {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function pct(value: number | null): string {
  return value == null ? '—' : `${value}%`;
}

function operationStatusKey(status: AttendanceOperationStatus): string {
  return `admin.attendanceCenter.status.${status}`;
}

function actionKey(row: AttendanceOverviewClass): string {
  return `admin.attendanceCenter.action.${classOperationAction(row)}`;
}

function statusTone(status: AttendanceOperationStatus): string {
  if (status === 'completed') return 'success';
  if (status === 'in_progress') return 'progress';
  if (status === 'not_started') return 'idle';
  if (status === 'closed') return 'closed';
  return 'empty';
}

function Kpi({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <article className="attendance-center-kpi">
      <span className="attendance-center-kpi__label">{label}</span>
      <strong className="attendance-center-kpi__value">{value}</strong>
      {hint ? <span className="attendance-center-kpi__hint">{hint}</span> : null}
    </article>
  );
}

function ClassCard({
  row,
  onOpen,
}: {
  row: AttendanceOverviewClass;
  onOpen: (classId: number, mode: ClassWorkspaceMode) => void;
}) {
  const t = useT();
  const recordedBy = row.last_recorded_by?.name ?? null;
  const recordedAt = row.last_recorded_at;
  const lastActor = row.last_modified_by?.name ?? row.last_recorded_by?.name ?? null;
  const lastAt = row.last_modified_at ?? row.last_recorded_at;

  return (
    <article className="attendance-center-class-card">
      <div className="attendance-center-class-card__top">
        <div>
          <h3 dir="auto">{row.name}</h3>
          <p className="muted" dir="auto">{row.level?.name ?? t('common.dash')}</p>
        </div>
        <span className={cn('attendance-center-state', `attendance-center-state--${statusTone(row.operation_status)}`)}>
          {t(operationStatusKey(row.operation_status))}
        </span>
      </div>

      <div className="attendance-center-class-card__progress" aria-label={t('admin.attendanceCenter.recordingCompletion')}>
        <div className="attendance-center-progress-track" aria-hidden="true">
          <span style={{ width: `${Math.min(Math.max(row.completion_pct, 0), 100)}%` }} />
        </div>
        <div className="attendance-center-class-card__progress-copy">
          <strong>{pct(row.completion_pct)}</strong>
          <span>{t('admin.attendanceCenter.recordedOfExpected', { recorded: row.recorded_students, expected: row.expected_students })}</span>
        </div>
      </div>

      <div className="attendance-center-class-card__counts">
        <span>{t('attendance.present')}: <strong>{row.counts.present}</strong></span>
        <span>{t('attendance.absent')}: <strong>{row.counts.absent}</strong></span>
        <span>{t('attendance.late')}: <strong>{row.counts.late}</strong></span>
        <span>{t('attendance.notRecorded')}: <strong>{row.unrecorded_students}</strong></span>
      </div>

      <div className="attendance-center-class-card__footer">
        <div className="attendance-center-class-card__activity">
          {recordedBy || recordedAt ? (
            <>
              <span>{t('admin.attendanceCenter.recordedBy')}</span>
              <small>
                {recordedBy ? <strong dir="auto">{recordedBy}</strong> : null}
                {recordedBy && recordedAt ? ' · ' : null}
                {recordedAt ? <span dir="ltr">{formatDateTime(recordedAt)}</span> : null}
              </small>
            </>
          ) : (
            <>
              <span>{t('admin.attendanceCenter.lastActivity')}</span>
              {lastActor || lastAt ? (
                <small>
                  {lastActor ? <span dir="auto">{lastActor}</span> : null}
                  {lastActor && lastAt ? ' · ' : null}
                  {lastAt ? <span dir="ltr">{formatDateTime(lastAt)}</span> : null}
                </small>
              ) : (
                <small>{t('admin.attendanceCenter.noActivity')}</small>
              )}
            </>
          )}
        </div>
        <div className="attendance-center-class-card__actions">
          {classShowsRegisteredState(row) ? (
            <span className="attendance-center-registered-badge">
              {t('admin.attendanceCenter.attendanceRegistered')}
            </span>
          ) : (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => onOpen(
                row.id,
                classOperationAction(row) === 'view' ? 'view' : 'record',
              )}
              disabled={row.allowed_actions.can_open_class === false}
            >
              {t(actionKey(row))}
            </button>
          )}

          {classShowsCorrectionAction(row) ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onOpen(row.id, 'correct')}
              disabled={row.allowed_actions.can_open_class === false}
            >
              {t('admin.attendanceCenter.correctAttendance')}
            </button>
          ) : classShowsRegisteredState(row) ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => onOpen(row.id, 'view')}
              disabled={row.allowed_actions.can_open_class === false}
            >
              {t('admin.attendanceCenter.viewAttendance')}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RosterStatusEditor({
  row,
  enabled,
  onStatus,
  onNote,
  onCorrect,
}: {
  row: AttendanceRosterDraftRow;
  enabled: boolean;
  onStatus: (status: AttendanceStatus) => void;
  onNote: (note: string) => void;
  onCorrect?: () => void;
}) {
  const t = useT();
  return (
    <div className={cn('attendance-center-roster-row', isAttendanceRosterRowDirty(row) && 'attendance-center-roster-row--dirty')}>
      <div className="attendance-center-roster-row__student">
        <strong dir="auto">{row.name}</strong>
        {row.baselineStatus === null ? (
          <span className="attendance-center-neutral-badge">{t('attendance.notRecorded')}</span>
        ) : (
          <AttendanceBadge status={row.baselineStatus} />
        )}
      </div>

      <div className="attendance-center-roster-row__statuses" role="group" aria-label={t('attendance.statusColumn')}>
        {ATTENDANCE_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={cn('attendance-center-status-button', row.status === status && 'attendance-center-status-button--active')}
            aria-pressed={row.status === status}
            disabled={!enabled}
            onClick={() => onStatus(status)}
          >
            {t(status === 'left_early' ? 'attendance.leftEarly' : `attendance.${status}`)}
          </button>
        ))}
      </div>

      <div className="attendance-center-roster-row__note">
        {enabled ? (
          <input
            className="input"
            value={row.note}
            onChange={(event) => onNote(event.target.value)}
            placeholder={t('attendance.optionalNote')}
            disabled={row.status === null}
          />
        ) : row.note ? (
          <span dir="auto">{row.note}</span>
        ) : (
          <span className="muted">{t('common.dash')}</span>
        )}
      </div>

      {!enabled && onCorrect && row.record ? (
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCorrect}>
          {t('admin.attendanceCenter.correctRecord')}
        </button>
      ) : null}
    </div>
  );
}

function ClassWorkspace({
  classId,
  date,
  mode,
  initialCorrectionRecord,
  onClose,
  onReloadOverview,
}: {
  classId: number;
  date: string;
  mode: ClassWorkspaceMode;
  initialCorrectionRecord?: AttendanceRecord | null;
  onClose: () => void;
  onReloadOverview: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const { activeSchoolId } = useAdminSession();
  const state = useAdminResource<AttendanceClassDetails>(classPath(classId), { date }, { keepPreviousData: false });
  const [rows, setRows] = useState<AttendanceRosterDraftRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [showCorrection, setShowCorrection] = useState(false);
  const [correctionRecord, setCorrectionRecord] = useState<AttendanceRosterDraftRow['record']>(null);

  useEffect(() => {
    if (state.data) {
      const defaultsToPresent = (
        mode === 'record'
        && state.data.recording_allowed
        && state.data.allowed_actions.can_record_today
      );
      setRows(buildAttendanceRosterDraft(
        state.data,
        defaultsToPresent ? 'present' : null,
      ));
      setConflict(false);
    }
  }, [state.data, mode]);

  useEffect(() => {
    setShowCorrection(mode === 'correct');
    setCorrectionRecord(mode === 'correct' ? initialCorrectionRecord ?? null : null);
  }, [mode, classId, date, initialCorrectionRecord]);

  const dirtyItems = useMemo(() => buildAttendanceClassBatchItems(rows), [rows]);

  function updateRow(studentId: number, patch: Partial<AttendanceRosterDraftRow>) {
    setRows((current) => current.map((row) => row.studentId === studentId ? { ...row, ...patch } : row));
  }

  async function save() {
    if (!state.data?.recording_allowed || dirtyItems.length === 0 || saving) return;
    setSaving(true);
    setConflict(false);
    const res = await api.post<AttendanceClassBatchResult>(
      classBatchPath(classId),
      { date, items: dirtyItems },
      activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined,
    );
    setSaving(false);

    if (!res.success) {
      if (res.error.code === 'permission_denied' || res.error.code === 'forbidden') {
        toast.error(t('admin.attendanceCenter.permissionDenied'));
      } else if (res.error.code === 'validation_error' && res.error.details?.policy === 'admin_batch_today_only') {
        toast.error(t('attendance.todayOnlyError'));
      } else {
        toast.error(res.error.message || t('attendance.saveFailed'));
      }
      return;
    }

    if (hasAttendanceBatchConcurrencyFailure(res.data.errors ?? [])) {
      setConflict(true);
      toast.warning(t('admin.attendanceCenter.conflictTitle'));
      state.reload();
      onReloadOverview();
      return;
    }

    if (res.data.failed > 0) {
      toast.error(t('attendance.partialSave', { saved: res.data.saved, failed: res.data.failed }));
    } else {
      toast.success(t('attendance.saveSuccess', { count: res.data.saved }));
    }
    state.reload();
    onReloadOverview();
  }

  return (
    <section className="attendance-center-class-workspace" aria-label={t('admin.attendanceCenter.classWorkspace')}>
      <ResourceView state={state} loadingLabel={t('attendance.loadingRoster')}>
        {(details) => {
          const writable = (
            mode !== 'correct'
            && details.recording_allowed
            && details.allowed_actions.can_record_today
            && details.summary.unrecorded_students > 0
          );
          return (
            <>
              <div className="attendance-center-class-workspace__head">
                <div>
                  <span className="attendance-center-eyebrow">{t('admin.attendanceCenter.classWorkspace')}</span>
                  <h2 dir="auto">{details.class_name}</h2>
                  <p className="muted" dir="auto">{details.level?.name ?? t('common.dash')} · <span dir="ltr">{details.date}</span></p>
                </div>
                <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
                  {t('admin.attendanceCenter.closeClass')}
                </button>
              </div>

              <div className="attendance-center-class-summary">
                <Kpi label={t('admin.attendanceCenter.recordedStudents')} value={details.summary.recorded_students} />
                <Kpi label={t('admin.attendanceCenter.unrecordedStudents')} value={details.summary.unrecorded_students} />
                <Kpi label={t('admin.attendanceCenter.recordingCompletion')} value={pct(details.summary.recording_completion_pct)} />
                <Kpi label={t('admin.attendanceCenter.attendanceRate')} value={pct(details.summary.attendance_rate)} />
                <Kpi label={t('admin.attendanceCenter.absenceRate')} value={pct(details.summary.absence_rate)} />
              </div>

              {!writable && mode !== 'correct' ? (
                <div className="attendance-center-info-banner" role="status">
                  <strong>{t('admin.attendanceCenter.readOnlyTitle')}</strong>
                  <span>
                    {date !== todayIso()
                      ? t('admin.attendanceCenter.historicalReadOnly')
                      : !details.allowed_actions.can_record_today && !details.allowed_actions.can_correct
                        ? t('admin.attendanceCenter.viewOnlyPermission')
                        : details.calendar_gate.hard_blocked || details.calendar_gate.allowed === false
                          ? t('admin.attendanceCenter.calendarBlocked')
                          : t('admin.attendanceCenter.viewOnlyPermission')}
                  </span>
                </div>
              ) : null}

              {conflict ? (
                <div className="attendance-center-conflict" role="alert">
                  <div>
                    <strong>{t('admin.attendanceCenter.conflictTitle')}</strong>
                    <p>{t('admin.attendanceCenter.conflictDesc')}</p>
                  </div>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => state.reload()}>
                    {t('admin.attendanceCenter.reloadLatest')}
                  </button>
                </div>
              ) : null}

              {writable && details.summary.unrecorded_students > 0 ? (
                <div className="attendance-center-roster-toolbar">
                  <span>{t('admin.attendanceCenter.unrecordedHint', { count: details.summary.unrecorded_students })}</span>
                </div>
              ) : null}

              <div className="attendance-center-roster" aria-busy={saving || undefined}>
                {rows.map((row) => (
                  <RosterStatusEditor
                    key={row.studentId}
                    row={row}
                    enabled={writable}
                    onStatus={(status) => updateRow(row.studentId, { status })}
                    onNote={(note) => updateRow(row.studentId, { note })}
                    onCorrect={
                      !writable && details.allowed_actions.can_correct && row.record
                        ? () => {
                            setCorrectionRecord(row.record);
                            setShowCorrection(true);
                          }
                        : undefined
                    }
                  />
                ))}
              </div>

              {rows.length === 0 ? <p className="attendance-center-empty">{t('attendance.noStudents')}</p> : null}

              {writable ? (
                <div className="attendance-center-savebar">
                  <span>{dirtyItems.length > 0 ? t('admin.attendanceCenter.pendingChanges', { count: dirtyItems.length }) : t('admin.attendanceCenter.noChanges')}</span>
                  <button type="button" className="btn btn--primary" disabled={dirtyItems.length === 0 || saving} onClick={save}>
                    {saving ? t('common.saving') : t('attendance.saveAttendance')}
                  </button>
                </div>
              ) : mode !== 'correct' && details.allowed_actions.can_correct ? (
                <div className="attendance-center-correction-entry">
                  <button
                    type="button"
                    className="btn btn--primary btn--sm"
                    onClick={() => {
                      setCorrectionRecord(null);
                      setShowCorrection((value) => !value);
                    }}
                  >
                    {t('admin.attendanceCenter.correctAttendance')}
                  </button>
                </div>
              ) : null}

              {details.allowed_actions.can_correct ? (
                <AdminAttendanceCorrectionPanel
                  open={showCorrection}
                  selectedDate={date}
                  selectedClassId={classId}
                  selectedClassName={details.class_name}
                  initialRecord={correctionRecord}
                  onSuccess={() => {
                    setShowCorrection(false);
                    setCorrectionRecord(null);
                    state.reload();
                    onReloadOverview();
                  }}
                />
              ) : null}
            </>
          );
        }}
      </ResourceView>
    </section>
  );
}

export function AdminAttendanceOperationsCenter() {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [search, setSearch] = useState('');
  const [studentView, setStudentView] = useState<'classes' | 'absent'>('classes');
  const [statusFilter, setStatusFilter] = useState<AttendanceClassFilter>('all');
  const [cycleFilter, setCycleFilter] = useState<AttendanceCycleFilter>('all');
  const [levelFilter, setLevelFilter] = useState<AttendanceLevelFilter>('all');
  const [classFilter, setClassFilter] = useState<AttendanceClassIdFilter>('all');
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<ClassWorkspaceMode>('view');
  const [selectedCorrectionRecord, setSelectedCorrectionRecord] = useState<AttendanceRecord | null>(null);
  const [absentRows, setAbsentRows] = useState<AttendanceRecord[]>([]);
  const [absentLoading, setAbsentLoading] = useState(false);
  const [absentLoadFailed, setAbsentLoadFailed] = useState(false);
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const state = useAdminResource<AttendanceOperationsOverview>(overviewPath(), { date }, { keepPreviousData: true });
  const academicContextState = useAdminResource<AcademicContextOptionsResponse>(
    endpoints.admin.academicContextOptions,
    undefined,
    { keepPreviousData: true },
  );
  const overview = state.data;
  const levelOptions = useMemo(
    () => buildAttendanceLevelOptions(
      overview?.classes ?? [],
      academicContextState.data?.levels ?? [],
    ),
    [overview?.classes, academicContextState.data?.levels],
  );
  const cycleOptions = useMemo(
    () => buildAttendanceCycleOptions(
      levelOptions,
      academicContextState.data?.cycles ?? [],
    ),
    [levelOptions, academicContextState.data?.cycles],
  );
  const visibleLevelOptions = useMemo(
    () => levelsForAttendanceCycle(levelOptions, cycleFilter),
    [levelOptions, cycleFilter],
  );
  const cycleClasses = useMemo(
    () => classesForAttendanceCycle(
      overview?.classes ?? [],
      cycleFilter,
      levelOptions,
    ),
    [overview?.classes, cycleFilter, levelOptions],
  );
  const classOptions = useMemo(
    () => classesForAttendanceLevel(cycleClasses, levelFilter),
    [cycleClasses, levelFilter],
  );
  const classes = useMemo(
    () => filterAttendanceOperationClasses(
      cycleClasses,
      studentView === 'classes' ? search : '',
      statusFilter,
      levelFilter,
      classFilter,
    ),
    [cycleClasses, search, statusFilter, levelFilter, classFilter, studentView],
  );

  useEffect(() => {
    if (studentView !== 'absent') {
      setAbsentRows([]);
      setAbsentLoading(false);
      setAbsentLoadFailed(false);
      return;
    }

    const candidates = classes.filter(
      (row) => row.counts.absent > 0 && row.allowed_actions.can_open_class !== false,
    );
    if (candidates.length === 0) {
      setAbsentRows([]);
      setAbsentLoading(false);
      setAbsentLoadFailed(false);
      return;
    }

    const controller = new AbortController();
    setAbsentLoading(true);
    setAbsentLoadFailed(false);

    Promise.all(
      candidates.map((row) =>
        api.get<AttendanceClassDetails>(
          classPath(row.id),
          {
            date,
            ...(activeSchoolId != null ? { active_school_id: activeSchoolId } : {}),
          },
          { signal: controller.signal },
        ),
      ),
    )
      .then((results) => {
        if (controller.signal.aborted) return;
        const failed = results.some((result) => !result.success);
        const rows = results
          .flatMap((result) =>
            result.success
              ? result.data.recorded.filter((record) => record.status === 'absent')
              : [],
          )
          .sort((a, b) => getStudentDisplayName(a.student).localeCompare(getStudentDisplayName(b.student)));
        setAbsentRows(rows);
        setAbsentLoadFailed(failed);
        setAbsentLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAbsentRows([]);
        setAbsentLoadFailed(true);
        setAbsentLoading(false);
      });

    return () => controller.abort();
  }, [activeSchoolId, classes, date, studentView]);

  const visibleAbsentRows = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return absentRows;
    return absentRows.filter((record) => {
      const haystack = [
        getStudentDisplayName(record.student),
        record.class?.name ?? '',
      ].join(' ').toLocaleLowerCase();
      return haystack.includes(needle);
    });
  }, [absentRows, search]);

  useEffect(() => {
    if (selectedClassId == null || !overview) return;
    if (!overview.classes.some((row) => row.id === selectedClassId)) setSelectedClassId(null);
  }, [overview, selectedClassId]);

  useEffect(() => {
    if (selectedClassId == null) return;
    const frame = window.requestAnimationFrame(() => {
      workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      workspaceRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedClassId, workspaceMode]);

  useEffect(() => {
    if (cycleFilter === 'all') return;
    if (!cycleOptions.some((row) => row.id === cycleFilter)) {
      setCycleFilter('all');
      setLevelFilter('all');
      setClassFilter('all');
    }
  }, [cycleFilter, cycleOptions]);

  useEffect(() => {
    if (levelFilter === 'all') return;
    if (!visibleLevelOptions.some((row) => row.id === levelFilter)) {
      setLevelFilter('all');
      setClassFilter('all');
    }
  }, [levelFilter, visibleLevelOptions]);

  useEffect(() => {
    if (classFilter === 'all') return;
    if (!classOptions.some((row) => row.id === classFilter)) setClassFilter('all');
  }, [classFilter, classOptions]);

  function chooseCycle(cycle: AttendanceCycleFilter) {
    setCycleFilter(cycle);
    setLevelFilter('all');
    setClassFilter('all');
    setSelectedClassId(null);
  }

  function chooseLevel(level: AttendanceLevelFilter) {
    setLevelFilter(level);
    setClassFilter('all');
    setSearch('');
    setSelectedClassId(null);
  }

  function chooseClass(value: string) {
    const next: AttendanceClassIdFilter = value === 'all' ? 'all' : Number(value);
    setClassFilter(next);
    setSelectedClassId(null);
  }

  function openClass(classId: number, mode: ClassWorkspaceMode) {
    setSelectedCorrectionRecord(null);
    setSelectedClassId(classId);
    setWorkspaceMode(mode);
  }

  function openCorrectionRecord(record: AttendanceRecord) {
    const classId = record.class?.id;
    if (!classId) return;
    setSelectedCorrectionRecord(record);
    setSelectedClassId(classId);
    setWorkspaceMode('correct');
  }

  function closeClass() {
    setSelectedCorrectionRecord(null);
    setSelectedClassId(null);
    setWorkspaceMode('view');
  }

  return (
    <div className="admin-workspace attendance-center-page">
      <header className="attendance-center-header">
        <div>
          <span className="attendance-center-eyebrow">{overview?.academic_year?.name ?? t('attendance.title')}</span>
          <h1>{t('admin.attendanceCenter.title')}</h1>
          <p>{t('admin.attendanceCenter.subtitle')}</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => state.reload()} disabled={state.fetching}>
          {state.fetching ? t('common.loading') : t('admin.attendanceOps.refresh')}
        </button>
      </header>

      <section className="attendance-center-datebar" aria-label={t('attendance.dateLabel')}>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDate((value) => shiftIsoDay(value, -1))}>
          {t('admin.attendanceCenter.previousDay')}
        </button>
        <input className="input attendance-center-datebar__input" type="date" value={date} max={today} dir="ltr" onChange={(event) => setDate(event.target.value || today)} />
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDate((value) => shiftIsoDay(value, 1))} disabled={date >= today}>
          {t('admin.attendanceCenter.nextDay')}
        </button>
        <button type="button" className={cn('btn btn--sm', date === today ? 'btn--primary' : 'btn--ghost')} onClick={() => setDate(today)}>
          {t('attendance.today')}
        </button>
      </section>

      <ResourceView state={state} loadingLabel={t('admin.attendanceCenter.loading')}>
        {(data) => (
          <>
            <section className="attendance-center-summary" aria-label={t('admin.attendanceCenter.summaryTitle')}>
              <div className="attendance-center-summary__group">
                <div className="attendance-center-summary__head">
                  <h2>{t('admin.attendanceCenter.recordingGroup')}</h2>
                  <strong>{pct(data.summary.recording_completion_pct)}</strong>
                </div>
                <div className="attendance-center-kpi-grid">
                  <Kpi label={t('admin.attendanceCenter.expectedStudents')} value={data.summary.expected_students} />
                  <Kpi label={t('admin.attendanceCenter.recordedStudents')} value={data.summary.recorded_students} />
                  <Kpi label={t('admin.attendanceCenter.unrecordedStudents')} value={data.summary.unrecorded_students} hint={t('admin.attendanceCenter.unrecordedIsNotAbsent')} />
                </div>
              </div>

              <div className="attendance-center-summary__group">
                <div className="attendance-center-summary__head">
                  <h2>{t('admin.attendanceCenter.attendanceGroup')}</h2>
                  <span>{t('admin.attendanceCenter.recordedOnlyRates')}</span>
                </div>
                <div className="attendance-center-kpi-grid attendance-center-kpi-grid--four">
                  <Kpi label={t('attendance.present')} value={data.summary.present} hint={pct(data.summary.attendance_rate)} />
                  <Kpi label={t('attendance.absent')} value={data.summary.absent} hint={pct(data.summary.absence_rate)} />
                  <Kpi label={t('attendance.late')} value={data.summary.late} hint={pct(data.summary.late_rate)} />
                  <Kpi label={t('attendance.leftEarly')} value={data.summary.left_early} />
                </div>
              </div>
            </section>

            <section className="attendance-center-classes-section">
              <div className="attendance-center-section-head">
                <div>
                  <span className="attendance-center-eyebrow">{t('admin.attendanceCenter.classesEyebrow')}</span>
                  <h2>{t('admin.attendanceCenter.classesTitle')}</h2>
                  <p>{t('admin.attendanceCenter.classesSubtitle', { total: data.summary.classes_total })}</p>
                </div>
                <div className="attendance-center-class-totals">
                  <span>{t('admin.attendanceCenter.status.completed')}: <strong>{data.summary.classes_completed}</strong></span>
                  <span>{t('admin.attendanceCenter.status.in_progress')}: <strong>{data.summary.classes_in_progress}</strong></span>
                  <span>{t('admin.attendanceCenter.status.not_started')}: <strong>{data.summary.classes_not_started}</strong></span>
                  {data.summary.classes_closed > 0 ? <span>{t('admin.attendanceCenter.status.closed')}: <strong>{data.summary.classes_closed}</strong></span> : null}
                </div>
              </div>

              <div className="attendance-center-filter-stack attendance-center-filter-stack--compact">
                <section className="attendance-center-filter-stage attendance-center-filter-stage--compact">
                  <div className="attendance-center-compact-filters">
                    <label className="attendance-center-compact-field">
                      <span>{t('academicContext.fields.cycle')}</span>
                      <select
                        className="input"
                        value={String(cycleFilter)}
                        onChange={(event) => chooseCycle(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                      >
                        <option value="all">{t('admin.attendanceCenter.filterAll')}</option>
                        {cycleOptions.map((cycle) => (
                          <option key={cycle.id} value={cycle.id}>{cycle.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="attendance-center-compact-field">
                      <span>{t('admin.attendanceCenter.levelsFilterTitle')}</span>
                      <select
                        className="input"
                        value={String(levelFilter)}
                        onChange={(event) => chooseLevel(event.target.value === 'all' ? 'all' : Number(event.target.value))}
                      >
                        <option value="all">{t('admin.attendanceCenter.allLevels')}</option>
                        {visibleLevelOptions.map((level) => (
                          <option key={level.id} value={level.id}>{level.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="attendance-center-compact-field">
                      <span>{t('admin.attendanceCenter.classFilterTitle')}</span>
                      <select
                        className="input"
                        value={String(classFilter)}
                        onChange={(event) => chooseClass(event.target.value)}
                      >
                        <option value="all">{t('admin.attendanceCenter.allClasses')}</option>
                        {classOptions.map((row) => (
                          <option key={row.id} value={row.id}>{row.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="attendance-center-compact-field">
                      <span>{studentView === 'absent' ? t('attendance.student') : t('admin.attendanceCenter.classFilterTitle')}</span>
                      <input
                        className="input"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder={
                          studentView === 'absent'
                            ? t('attendance.correctPanel.studentSearchPlaceholder')
                            : t('admin.attendanceCenter.searchWithinClasses')
                        }
                      />
                    </label>
                  </div>
                </section>

                <section className="attendance-center-filter-stage attendance-center-filter-stage--compact">
                  <div className="attendance-center-filter-stage__head">
                    <div>
                      <strong>{t('admin.attendanceCenter.statusFilterTitle')}</strong>
                    </div>
                    <span>{t('admin.attendanceCenter.visibleClassesCount', { visible: classes.length, total: classOptions.length })}</span>
                  </div>
                  <div className="attendance-center-filter-chips" role="group" aria-label={t('admin.attendanceOps.filtersTitle')}>
                    {CLASS_FILTERS.map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        className={cn('attendance-center-filter-chip', statusFilter === filter && 'attendance-center-filter-chip--active')}
                        aria-pressed={statusFilter === filter}
                        onClick={() => setStatusFilter(filter)}
                      >
                        {filter === 'all' ? t('admin.attendanceCenter.filterAll') : t(operationStatusKey(filter))}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="attendance-center-view-switch" aria-label={t('attendance.statusColumn')}>
                  <button
                    type="button"
                    className={cn('attendance-center-view-switch__button', studentView === 'classes' && 'attendance-center-view-switch__button--active')}
                    aria-pressed={studentView === 'classes'}
                    onClick={() => setStudentView('classes')}
                  >
                    {t('admin.attendanceCenter.classesEyebrow')}
                  </button>
                  <button
                    type="button"
                    className={cn('attendance-center-view-switch__button', studentView === 'absent' && 'attendance-center-view-switch__button--active')}
                    aria-pressed={studentView === 'absent'}
                    onClick={() => setStudentView('absent')}
                  >
                    {t('attendance.absent')} · {data.summary.absent}
                  </button>
                </section>
              </div>

              {selectedClassId != null ? (
                <div
                  ref={workspaceRef}
                  className="attendance-center-workspace-anchor"
                  tabIndex={-1}
                >
                  <ClassWorkspace
                    key={`${selectedClassId}:${workspaceMode}:${date}:${selectedCorrectionRecord?.id ?? 'none'}`}
                    classId={selectedClassId}
                    date={date}
                    mode={workspaceMode}
                    initialCorrectionRecord={selectedCorrectionRecord}
                    onClose={closeClass}
                    onReloadOverview={() => state.reload()}
                  />
                </div>
              ) : null}

              {studentView === 'absent' ? (
                absentLoading ? (
                  <p className="attendance-center-empty">{t('attendance.loadingRoster')}</p>
                ) : absentLoadFailed && absentRows.length === 0 ? (
                  <p className="attendance-center-empty">{t('attendance.correctPanel.lookupFailed')}</p>
                ) : visibleAbsentRows.length === 0 ? (
                  <p className="attendance-center-empty">{t('admin.attendanceCenter.noMatches')}</p>
                ) : (
                  <div className="attendance-center-absent-list">
                    {absentLoadFailed ? (
                      <p className="attendance-center-absent-list__warning">{t('attendance.correctPanel.lookupFailed')}</p>
                    ) : null}
                    {visibleAbsentRows.map((record) => {
                      const note = record.notes?.trim() || record.note?.trim() || '';
                      return (
                        <article key={record.id} className="attendance-center-absent-row">
                          <div className="attendance-center-absent-row__student">
                            <strong dir="auto">{getStudentDisplayName(record.student)}</strong>
                            <span dir="auto">{record.class?.name ?? t('common.dash')}</span>
                          </div>
                          <AttendanceBadge status={record.status} />
                          <span className="attendance-center-absent-row__note" dir="auto">
                            {note || t('common.dash')}
                          </span>
                          {record.allowed_actions?.can_correct === true ? (
                            <button
                              type="button"
                              className="btn btn--ghost btn--sm"
                              onClick={() => openCorrectionRecord(record)}
                            >
                              {t('admin.attendanceCenter.correctRecord')}
                            </button>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                )
              ) : data.classes.length === 0 ? (
                <p className="attendance-center-empty">{t('admin.attendanceCenter.noClasses')}</p>
              ) : classes.length === 0 ? (
                <p className="attendance-center-empty">{t('admin.attendanceCenter.noMatches')}</p>
              ) : (
                <div className="attendance-center-class-grid">
                  {classes.map((row) => <ClassCard key={row.id} row={row} onOpen={openClass} />)}
                </div>
              )}
            </section>

            <section className="attendance-center-attention">
              <div className="attendance-center-section-head">
                <div>
                  <span className="attendance-center-eyebrow">{t('admin.attendanceCenter.attentionEyebrow')}</span>
                  <h2>{t('admin.attendanceCenter.attentionTitle')}</h2>
                  <p>{t('admin.attendanceCenter.attentionSubtitle')}</p>
                </div>
              </div>
              {data.attention.long_absences.length === 0 ? (
                <p className="attendance-center-attention__empty">{t('admin.attendanceCenter.attentionNone')}</p>
              ) : (
                <div className="attendance-center-attention__list">
                  {data.attention.long_absences.map((row) => (
                    <article key={row.student.id} className="attendance-center-attention-row">
                      <div>
                        <strong dir="auto">{getStudentDisplayName(row.student) || t('common.dash')}</strong>
                        <span dir="auto">{row.class?.name ?? t('common.dash')}</span>
                      </div>
                      <div>
                        <strong>{t('admin.attendanceCenter.consecutiveAbsences', { count: row.consecutive_absence_records })}</strong>
                        <span>{t('admin.attendanceCenter.absencesInWindow', { count: row.absences_in_window, days: row.window_days })}</span>
                      </div>
                      <span>{t('admin.attendanceCenter.lastPresent')}: <b dir="ltr">{row.last_present_date ?? t('common.dash')}</b></span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </ResourceView>
    </div>
  );
}
