'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { AttendanceBadge } from '@/components/badges/attendance-badge';
import { AttendanceCorrectPanel } from '@/features/attendance/attendance-correct';
import { useT } from '@/features/i18n/locale-context';
import {
  ATT_STATUSES,
  attendanceStatusLabelKey,
  summarizeRecords,
  todayIso,
} from './admin-attendance-utils';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import type { SchoolClass } from '@/types/class';

const TONE: Record<AttendanceStatus, string> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export function AdminAttendanceOpsHeader({
  schoolName,
  dateLabel,
  classLabel,
  canCorrect,
  showCorrect,
  onToggleCorrect,
  onRefresh,
  refreshing,
}: {
  schoolName?: string;
  dateLabel: string;
  classLabel: string;
  canCorrect: boolean;
  showCorrect: boolean;
  onToggleCorrect: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}) {
  const t = useT();

  return (
    <header className="admin-att-ops-header">
      <div className="admin-att-ops-header__main">
        <span className="admin-att-ops-header__eyebrow">{schoolName ?? t('admin.cmd.defaultSchool')}</span>
        <h1 className="admin-att-ops-header__title">{t('admin.attendanceList.title')}</h1>
        <p className="admin-att-ops-header__subtitle">{t('admin.attendanceOps.pageSubtitle')}</p>
        <div className="admin-att-ops-header__meta">
          <span>
            <strong>{t('admin.attendanceOps.selectedDate')}:</strong> {dateLabel}
          </span>
          <span>
            <strong>{t('admin.attendanceOps.selectedClass')}:</strong> {classLabel}
          </span>
        </div>
      </div>
      <div className="admin-att-ops-header__actions">
        {canCorrect && (
          <button
            type="button"
            className={cn(
              'btn btn--sm',
              showCorrect ? 'btn--primary admin-att-ops-header__btn--active' : 'btn--ghost',
            )}
            onClick={onToggleCorrect}
          >
            {showCorrect ? t('admin.attendanceList.closeCorrect') : t('admin.attendanceList.correctRecord')}
          </button>
        )}
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? t('common.loading') : t('admin.attendanceOps.refresh')}
        </button>
        <Link href="/admin/dashboard" className="btn btn--ghost btn--sm">
          {t('admin.attendanceOps.backToDashboard')}
        </Link>
      </div>
    </header>
  );
}

export function AdminAttendanceTodaySummary({
  records,
  listTotal,
}: {
  records: AttendanceRecord[];
  listTotal?: number;
}) {
  const t = useT();
  const { counts, total, presentPct } = summarizeRecords(records);
  const pageScoped = listTotal != null && listTotal > records.length;

  if (total === 0) {
    return (
      <div className="admin-att-ops-summary admin-att-ops-summary--empty">
        <p className="admin-att-ops-summary__empty-title">{t('admin.attendanceOps.noRecordsToday')}</p>
        {pageScoped && listTotal === 0 && (
          <p className="admin-att-ops-summary__empty-hint">{t('admin.attendanceList.summaryPageScope')}</p>
        )}
      </div>
    );
  }

  return (
    <section className="admin-att-ops-summary" aria-label={t('admin.attendanceOps.todaySummary')}>
      <div className="admin-att-ops-summary__head">
        <h2 className="admin-att-ops-summary__title">{t('admin.attendanceOps.todaySummary')}</h2>
        {presentPct != null && (
          <span className="admin-att-ops-summary__pct">
            {t('admin.attendanceOps.presentRate', { pct: presentPct })}
          </span>
        )}
      </div>
      <div className="admin-att-ops-summary__grid">
        {ATT_STATUSES.map((s) => (
          <div key={s} className={cn('admin-att-ops-kpi', `admin-att-ops-kpi--${TONE[s]}`)}>
            <span className="admin-att-ops-kpi__value">{counts[s]}</span>
            <span className="admin-att-ops-kpi__label">{t(attendanceStatusLabelKey(s))}</span>
          </div>
        ))}
        <div className="admin-att-ops-kpi admin-att-ops-kpi--total">
          <span className="admin-att-ops-kpi__value">{total}</span>
          <span className="admin-att-ops-kpi__label">{t('admin.totalRecorded')}</span>
        </div>
      </div>
      {pageScoped && (
        <p className="admin-att-ops-summary__scope">{t('admin.attendanceList.summaryPageScope')}</p>
      )}
    </section>
  );
}

export function AdminAttendanceFiltersCard({
  date,
  classId,
  status,
  classes,
  onDateChange,
  onClassChange,
  onStatusChange,
  onReset,
  showReset,
}: {
  date: string;
  classId: string;
  status: string;
  classes: SchoolClass[];
  onDateChange: (v: string) => void;
  onClassChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onReset: () => void;
  showReset: boolean;
}) {
  const t = useT();

  return (
    <section className="admin-att-ops-filters" aria-label={t('admin.attendanceOps.filtersTitle')}>
      <h2 className="admin-att-ops-filters__title">{t('admin.attendanceOps.filtersTitle')}</h2>
      <div className="admin-att-ops-filters__row toolbar">
        <label className="admin-att-ops-field">
          <span className="admin-att-ops-field__label">{t('attendance.dateLabel')}</span>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>
        <label className="admin-att-ops-field">
          <span className="admin-att-ops-field__label">{t('nav.classes')}</span>
          <select className="select" value={classId} onChange={(e) => onClassChange(e.target.value)}>
            <option value="">{t('admin.allClasses')}</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-att-ops-field">
          <span className="admin-att-ops-field__label">{t('attendance.statusColumn')}</span>
          <select className="select" value={status} onChange={(e) => onStatusChange(e.target.value)}>
            <option value="">{t('admin.attendanceList.allStatuses')}</option>
            {ATT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(attendanceStatusLabelKey(s))}
              </option>
            ))}
          </select>
        </label>
        {showReset && (
          <button type="button" className="btn btn--ghost btn--sm admin-att-ops-filters__reset" onClick={onReset}>
            {t('admin.attendanceOps.resetFilters')}
          </button>
        )}
      </div>
    </section>
  );
}

export function AdminAttendanceCorrectionPanel({
  open,
  onSuccess,
}: {
  open: boolean;
  onSuccess: () => void;
}) {
  const t = useT();
  if (!open) return null;

  return (
    <section className="admin-att-ops-correction" aria-label={t('admin.attendanceOps.correctionMode')}>
      <div className="admin-att-ops-correction__banner">
        <span className="admin-att-ops-correction__badge">{t('admin.attendanceOps.correctionMode')}</span>
        <p className="admin-att-ops-correction__hint">{t('admin.attendanceOps.correctionHint')}</p>
      </div>
      <AttendanceCorrectPanel onSuccess={onSuccess} />
    </section>
  );
}

export function AdminAttendanceEmptyFiltered({ onReset }: { onReset: () => void }) {
  const t = useT();

  return (
    <div className="admin-att-ops-empty">
      <span className="admin-att-ops-empty__icon" aria-hidden="true">
        🗓️
      </span>
      <p className="admin-att-ops-empty__title">{t('admin.attendanceOps.emptyFiltered')}</p>
      <p className="admin-att-ops-empty__desc">{t('admin.attendanceOps.emptyFilteredDesc')}</p>
      <button type="button" className="btn btn--primary btn--sm" onClick={onReset}>
        {t('admin.attendanceOps.resetFilters')}
      </button>
    </div>
  );
}

export function AdminAttendanceTableSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="admin-att-ops-table-section">
      <h2 className="admin-att-ops-table-section__title">{title}</h2>
      <div className="admin-att-ops-table-wrap">{children}</div>
    </section>
  );
}

export function AdminAttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return <AttendanceBadge status={status} />;
}
