'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { useResource } from '@/lib/hooks/use-resource';
import { useToast } from '@/components/ui/toast';
import { Card, InfoBanner } from '@/components/ui/primitives';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { PermissionDeniedState } from '@/components/states/states';
import { useStudentSearchQuery } from '@/features/admin/students/hooks/use-student-search-query';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { attendanceStatusLabel } from '@/lib/utils/labels';
import { formatDateTime, isoDate } from '@/lib/utils/format';
import { getStudentDisplayName } from '@/lib/utils/student';
import { cn } from '@/lib/utils/cn';
import {
  buildAdminAttendanceMutationRequest,
  isAttendanceConcurrencyError,
} from './attendance-concurrency';
import type { StudentSearchHit } from '@/types/student-search';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const STATUS_ICON: Record<AttendanceStatus, string> = {
  present: '✓',
  absent: '✕',
  late: '⏱',
  left_early: '↩',
};

type AttendanceTarget = {
  id: number;
  name: string;
  classId: number | null;
  className: string | null;
  levelName: string | null;
};

function targetFromStudent(student: StudentSearchHit): AttendanceTarget {
  return {
    id: student.id,
    name: getStudentDisplayName(student),
    classId: student.class?.id ?? null,
    className: student.class?.name ?? null,
    levelName: student.level?.name ?? null,
  };
}

function targetFromRecord(record: AttendanceRecord): AttendanceTarget {
  return {
    id: record.student.id,
    name: getStudentDisplayName(record.student),
    classId: record.class?.id ?? null,
    className: record.class?.name ?? null,
    levelName: null,
  };
}

export function AttendanceCorrectPanel({
  onSuccess,
  selectedDate,
  initialRecord,
}: {
  onSuccess?: () => void;
  selectedDate?: string;
  initialRecord?: AttendanceRecord | null;
}) {
  const t = useT();
  const toast = useToast();
  const date = selectedDate || isoDate();

  const [query, setQuery] = useState('');
  const [target, setTarget] = useState<AttendanceTarget | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('present');
  const [note, setNote] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [conflict, setConflict] = useState(false);

  const search = useStudentSearchQuery(query);
  const lookup = useResource<AttendanceRecord[]>(
    target ? endpoints.admin.attendance : null,
    target
      ? {
          student_id: target.id,
          date,
          page: 1,
          page_size: 2,
        }
      : undefined,
    { keepPreviousData: false },
  );

  const record = lookup.data?.[0] ?? null;
  const lookupResolved = target != null && lookup.data !== null && !lookup.loading;
  const mayCorrectExisting = record?.allowed_actions?.can_correct !== false;

  useEffect(() => {
    if (!initialRecord) return;
    const nextTarget = targetFromRecord(initialRecord);
    setTarget(nextTarget);
    setQuery(nextTarget.name);
    setConflict(false);
  }, [initialRecord]);

  useEffect(() => {
    if (!lookupResolved) return;
    if (record) {
      setStatus(record.status);
      setNote(record.notes ?? record.note ?? '');
    } else {
      setStatus('present');
      setNote('');
    }
    setCorrectionReason('');
  }, [lookupResolved, record?.id, record?.expected_write_date, target?.id, date]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        target &&
          target.classId &&
          lookupResolved &&
          (!record || mayCorrectExisting) &&
          status,
      ) && !submitting,
    [target, lookupResolved, record, mayCorrectExisting, status, submitting],
  );

  function chooseStudent(student: StudentSearchHit) {
    const nextTarget = targetFromStudent(student);
    setTarget(nextTarget);
    setQuery(nextTarget.name);
    setConflict(false);
    setDenied(false);
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (target && value.trim() !== target.name) {
      setTarget(null);
      setConflict(false);
    }
  }

  async function submit() {
    if (!canSubmit || !target?.classId) return;
    setSubmitting(true);
    setConflict(false);

    const payload = buildAdminAttendanceMutationRequest({
      date,
      classId: target.classId,
      studentId: target.id,
      status,
      note,
      correctionReason,
      record,
    });
    const res = await api.post<AttendanceRecord>(endpoints.admin.attendanceCorrect, payload);
    setSubmitting(false);

    if (!res.success) {
      if (isAttendanceConcurrencyError(res.error)) {
        setConflict(true);
        lookup.reload();
        return;
      }
      if (res.error.code === 'permission_denied' || res.error.code === 'forbidden') {
        setDenied(true);
        return;
      }
      if (res.error.code === 'validation_error') {
        toast.error(res.error.message || t('attendance.correctPanel.validationError'));
        return;
      }
      toast.error(res.error.message || t('attendance.correctPanel.saveFailed'));
      return;
    }

    toast.success(
      record
        ? t('attendance.correctPanel.success', { name: target.name, date })
        : t('attendance.correctPanel.registerSuccess', { name: target.name, date }),
    );
    setCorrectionReason('');
    lookup.reload();
    onSuccess?.();
  }

  if (denied) {
    return (
      <Card>
        <PermissionDeniedState description={t('attendance.correctPanel.permissionDesc')} />
      </Card>
    );
  }

  const showSearchResults =
    query.trim().length >= 2 &&
    search.results.length > 0 &&
    (!target || query.trim() !== target.name);

  return (
    <div className="attendance-quick-ops">
      <div className="attendance-quick-ops__stack">
        {conflict ? (
          <InfoBanner
            tone="amber"
            icon="↻"
            title={t('attendance.correctPanel.conflictTitle')}
            description={t('attendance.correctPanel.conflictDesc')}
          />
        ) : null}

        <section className="attendance-quick-step attendance-quick-step--search">
          <div className="attendance-quick-step__head">
            <span className="attendance-quick-step__number" aria-hidden="true">1</span>
            <div>
              <h3 className="attendance-quick-step__title">{t('attendance.correctPanel.stepSearch')}</h3>
              <p className="attendance-quick-step__hint">{t('attendance.correctPanel.searchHelp')}</p>
            </div>
          </div>

          <label className="attendance-quick-ops__search">
            <div className="attendance-search-box">
              <span className="attendance-search-box__icon" aria-hidden="true">⌕</span>
              <input
                className="input attendance-search-box__input"
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder={t('attendance.correctPanel.studentSearchPlaceholder')}
                aria-label={t('attendance.correctPanel.studentSearchLabel')}
                autoComplete="off"
              />
            </div>
          </label>

          {search.loading ? (
            <p className="tiny muted">{t('attendance.correctPanel.searchingStudents')}</p>
          ) : null}
          {search.error ? (
            <p className="form-error">{t('attendance.correctPanel.studentSearchFailed')}</p>
          ) : null}

          {showSearchResults ? (
            <div className="attendance-student-search-results" role="listbox">
              {search.results.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="attendance-student-search-result"
                  onClick={() => chooseStudent(student)}
                >
                  <span className="attendance-student-search-result__avatar" aria-hidden="true">👤</span>
                  <span className="attendance-student-search-result__body">
                    <strong dir="auto">{getStudentDisplayName(student)}</strong>
                    <span className="tiny muted" dir="auto">
                      {[student.class?.name, student.level?.name].filter(Boolean).join(' · ') || t('common.dash')}
                    </span>
                  </span>
                  <span className="attendance-student-search-result__arrow" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          ) : null}

          {target ? (
            <div className="attendance-selected-student">
              <span className="attendance-selected-student__avatar" aria-hidden="true">👤</span>
              <div className="attendance-selected-student__body">
                <span className="attendance-selected-student__eyebrow">
                  {t('attendance.correctPanel.selectedStudent')}
                </span>
                <strong dir="auto">{target.name}</strong>
                <p className="tiny muted" dir="auto">
                  {[target.className, target.levelName].filter(Boolean).join(' · ') || t('common.dash')}
                </p>
              </div>
              <span className="attendance-selected-student__date mono tiny" dir="ltr">{date}</span>
            </div>
          ) : null}

          {target && target.classId == null ? (
            <InfoBanner
              tone="amber"
              title={t('attendance.correctPanel.noCurrentClass')}
              description={t('attendance.correctPanel.noCurrentClassDesc')}
            />
          ) : null}

          {target && lookup.loading ? (
            <p className="tiny muted">{t('attendance.correctPanel.loadingAttendance')}</p>
          ) : null}

          {lookup.error ? (
            <p className="form-error">{lookup.error.message || t('attendance.correctPanel.lookupFailed')}</p>
          ) : null}
        </section>

        {lookupResolved && target?.classId ? (
          <>
            <section className="attendance-quick-step">
              <div className="attendance-quick-step__head">
                <span className="attendance-quick-step__number" aria-hidden="true">2</span>
                <div>
                  <h3 className="attendance-quick-step__title">{t('attendance.correctPanel.stepStatus')}</h3>
                  <p className="attendance-quick-step__hint">{t('attendance.correctPanel.statusHelp')}</p>
                </div>
              </div>

              {record ? (
                <div className="attendance-current-record">
                  <div className="attendance-current-record__head">
                    <span className="tiny muted">{t('attendance.correctPanel.currentStatus')}</span>
                    <AttendanceBadge status={record.status} />
                  </div>
                  <div className="attendance-current-record__meta">
                    <span>
                      {t('attendance.correctPanel.lastModified')}: {' '}
                      <strong dir="auto">{record.last_modified_by?.name ?? record.recorded_by?.name ?? t('common.dash')}</strong>
                    </span>
                    <span dir="ltr">{formatDateTime(record.last_modified_at ?? record.recorded_date)}</span>
                  </div>
                </div>
              ) : (
                <div className="attendance-not-recorded">
                  <span className="attendance-not-recorded__icon" aria-hidden="true">○</span>
                  <div>
                    <strong>{t('attendance.notRecorded')}</strong>
                    <p>{t('attendance.correctPanel.notRecordedDesc')}</p>
                  </div>
                </div>
              )}

              {record && !mayCorrectExisting ? (
                <InfoBanner
                  tone="amber"
                  title={t('attendance.correctPanel.permissionDesc')}
                />
              ) : (
                <>
                  <div className="attendance-status-grid" role="group" aria-label={t('attendance.statusColumn')}>
                    {STATUSES.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={cn(
                          'attendance-status-choice',
                          `attendance-status-choice--${item}`,
                          status === item && 'attendance-status-choice--active',
                        )}
                        aria-pressed={status === item}
                        onClick={() => setStatus(item)}
                      >
                        <span className="attendance-status-choice__icon" aria-hidden="true">
                          {STATUS_ICON[item]}
                        </span>
                        <span>{attendanceStatusLabel(t, item)}</span>
                      </button>
                    ))}
                  </div>

                  <div className="attendance-quick-ops__fields">
                    <label className="attendance-quick-ops__field">
                      <span className="admin-att-field__label">{t('attendance.correctPanel.noteLabel')}</span>
                      <input
                        className="input"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder={t('attendance.correctPanel.notePlaceholder')}
                      />
                    </label>

                    {record ? (
                      <label className="attendance-quick-ops__field">
                        <span className="admin-att-field__label">{t('attendance.correctPanel.correctionReason')}</span>
                        <input
                          className="input"
                          value={correctionReason}
                          onChange={(event) => setCorrectionReason(event.target.value)}
                          placeholder={t('attendance.correctPanel.correctionReasonPlaceholder')}
                        />
                      </label>
                    ) : null}
                  </div>
                </>
              )}
            </section>

            {!record || mayCorrectExisting ? (
              <section className="attendance-quick-step attendance-quick-step--save">
                <div className="attendance-quick-step__head">
                  <span className="attendance-quick-step__number" aria-hidden="true">3</span>
                  <div>
                    <h3 className="attendance-quick-step__title">{t('attendance.correctPanel.stepSave')}</h3>
                    <p className="attendance-quick-step__hint">{t('attendance.correctPanel.saveHelp')}</p>
                  </div>
                </div>
                <div className="attendance-quick-ops__actions">
                  <button
                    className="btn btn--primary attendance-quick-ops__submit"
                    type="button"
                    onClick={submit}
                    disabled={!canSubmit}
                  >
                    {submitting
                      ? t('common.saving')
                      : record
                        ? t('attendance.correctPanel.saveCorrection')
                        : t('attendance.correctPanel.registerStatus')}
                  </button>
                  <span className="tiny muted">{t('attendance.correctPanel.scopeHint')}</span>
                </div>
              </section>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
