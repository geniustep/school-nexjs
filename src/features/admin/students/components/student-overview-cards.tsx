'use client';

import type { ReactNode } from 'react';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { statusLabel } from '@/lib/utils/labels';
import type { StudentOverviewData } from '@/types/student-overview';

const OVERVIEW_SKELETON_CARD_COUNT = 2;

function notProvided(t: (k: string) => string): string {
  return t('admin.student360.overview.notProvided');
}

function isMissing(value: string | number | null | undefined): boolean {
  return value == null || value === '';
}

function formatOptional(
  t: (k: string) => string,
  value: string | number | null | undefined,
): { text: string; muted: boolean } {
  if (isMissing(value)) return { text: notProvided(t), muted: true };
  return { text: String(value), muted: false };
}

function ActivityMetric({
  label,
  value,
  muted = false,
  dir,
}: {
  label: string;
  value: string;
  muted?: boolean;
  dir?: 'auto';
}) {
  return (
    <div className={`student-activity-metric${muted ? ' student-activity-metric--muted' : ''}`}>
      <span className="student-activity-metric__label">{label}</span>
      <span className="student-activity-metric__value" dir={dir}>
        {value}
      </span>
    </div>
  );
}

function ActivityEmpty({
  glyph,
  title,
  description,
}: {
  glyph: string;
  title: string;
  description: string;
}) {
  return (
    <div className="student-activity-card__empty">
      <span className="student-activity-card__empty-glyph" aria-hidden="true">
        {glyph}
      </span>
      <p className="student-activity-card__empty-title">{title}</p>
      <p className="student-activity-card__empty-desc">{description}</p>
    </div>
  );
}

function ActivityCard({
  glyph,
  title,
  sparse = false,
  children,
}: {
  glyph: string;
  title: string;
  sparse?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={[
        'student-activity-card',
        sparse ? 'student-activity-card--sparse' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="student-activity-card__head">
        <span className="student-activity-card__glyph" aria-hidden="true">
          {glyph}
        </span>
        <h3 className="student-activity-card__title">{title}</h3>
      </header>
      <div className="student-activity-card__body">{children}</div>
    </article>
  );
}

export function StudentOverviewCards({
  overview,
  loading,
  endpointUnavailable,
}: {
  overview: StudentOverviewData | null;
  loading: boolean;
  endpointUnavailable: boolean;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (loading && !overview) {
    return (
      <section
        className="student-activity-section student-activity-section--loading"
        aria-busy="true"
        aria-label={t('admin.student360.overview.activityTitle')}
      >
        <header className="student-activity-section__head">
          <div className="student-activity-section__head-main">
            <span className="student-activity-section__glyph" aria-hidden="true">
              ◷
            </span>
            <div>
              <h2 className="student-activity-section__title">{t('admin.student360.overview.activityTitle')}</h2>
              <p className="student-activity-section__desc">{t('admin.student360.overview.activityDesc')}</p>
            </div>
          </div>
        </header>
        <div className="student-activity-section__grid">
          {Array.from({ length: OVERVIEW_SKELETON_CARD_COUNT }, (_, index) => (
            <div key={index} className="student-activity-card-skeleton" aria-hidden="true">
              <div className="student-activity-card-skeleton__head" />
              <div className="student-activity-card-skeleton__line" />
              <div className="student-activity-card-skeleton__line student-activity-card-skeleton__line--short" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (endpointUnavailable || overview?.available === false) {
    return null;
  }

  if (!overview) return null;

  const attendance = overview.attendance_summary;
  const academic = overview.academic_summary;

  const showAttendance = attendance?.available !== false;
  const showAcademic = academic?.available !== false;

  if (!showAttendance && !showAcademic) return null;

  const attendanceEmpty =
    isMissing(attendance?.absences_this_month) &&
    isMissing(attendance?.late_this_month) &&
    isMissing(attendance?.last_status) &&
    isMissing(attendance?.last_status_label);

  const academicEmpty =
    isMissing(academic?.open_homework_count) &&
    isMissing(academic?.upcoming_exams_count) &&
    isMissing(academic?.last_result) &&
    isMissing(academic?.last_result_label);

  return (
    <section className="student-activity-section" aria-label={t('admin.student360.overview.activityTitle')}>
      <header className="student-activity-section__head">
        <div className="student-activity-section__head-main">
          <span className="student-activity-section__glyph" aria-hidden="true">
            ◷
          </span>
          <div>
            <h2 className="student-activity-section__title">{t('admin.student360.overview.activityTitle')}</h2>
            <p className="student-activity-section__desc">{t('admin.student360.overview.activityDesc')}</p>
          </div>
        </div>
      </header>

      <div className="student-activity-section__grid">
        {showAttendance ? (
          <ActivityCard
            glyph="✓"
            title={t('admin.student360.overview.cards.attendance')}
            sparse={attendanceEmpty}
          >
            {attendanceEmpty ? (
              <ActivityEmpty
                glyph="◌"
                title={t('admin.student360.overview.attendance.noDataYet')}
                description={t('admin.student360.overview.attendance.emptyDesc')}
              />
            ) : (
              <div className="student-activity-card__metrics">
                {(() => {
                  const absences = formatOptional(t, attendance?.absences_this_month);
                  const late = formatOptional(t, attendance?.late_this_month);
                  const lastStatus =
                    attendance?.last_status_label ||
                    (attendance?.last_status ? statusLabel(t, attendance.last_status) : null);
                  const last = formatOptional(t, lastStatus);
                  return (
                    <>
                      <ActivityMetric
                        label={t('admin.student360.overview.attendance.absencesMonth')}
                        value={absences.text}
                        muted={absences.muted}
                      />
                      <ActivityMetric
                        label={t('admin.student360.overview.attendance.lateMonth')}
                        value={late.text}
                        muted={late.muted}
                      />
                      <ActivityMetric
                        label={t('admin.student360.overview.attendance.lastStatus')}
                        value={
                          last.muted
                            ? last.text
                            : `${last.text}${attendance?.last_status_date ? ` · ${formatDate(attendance.last_status_date)}` : ''}`
                        }
                        muted={last.muted}
                        dir="auto"
                      />
                    </>
                  );
                })()}
              </div>
            )}
          </ActivityCard>
        ) : null}

        {showAcademic ? (
          <ActivityCard
            glyph="▤"
            title={t('admin.student360.overview.cards.academic')}
            sparse={academicEmpty}
          >
            {academicEmpty ? (
              <ActivityEmpty
                glyph="◇"
                title={t('admin.student360.overview.academic.noRecentData')}
                description={t('admin.student360.overview.academic.emptyDesc')}
              />
            ) : (
              <div className="student-activity-card__metrics">
                {(() => {
                  const homework = formatOptional(t, academic?.open_homework_count);
                  const exams = formatOptional(t, academic?.upcoming_exams_count);
                  const result = academic?.last_result_label
                    ? { text: academic.last_result_label, muted: false }
                    : formatOptional(t, academic?.last_result);
                  return (
                    <>
                      <ActivityMetric
                        label={t('admin.student360.overview.academic.openHomework')}
                        value={homework.text}
                        muted={homework.muted}
                      />
                      <ActivityMetric
                        label={t('admin.student360.overview.academic.upcomingExams')}
                        value={exams.text}
                        muted={exams.muted}
                      />
                      <ActivityMetric
                        label={t('admin.student360.overview.academic.lastResult')}
                        value={result.text}
                        muted={result.muted}
                        dir="auto"
                      />
                    </>
                  );
                })()}
              </div>
            )}
          </ActivityCard>
        ) : null}
      </div>
    </section>
  );
}
