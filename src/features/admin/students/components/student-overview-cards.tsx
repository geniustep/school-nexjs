'use client';

import type { ReactNode } from 'react';
import { Card, SectionHead } from '@/components/ui/primitives';
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

function OverviewFact({
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
    <div className="student-overview-card__fact">
      <dt>{label}</dt>
      <dd className={muted ? 'student-overview-card__value--muted' : undefined} dir={dir}>
        {value}
      </dd>
    </div>
  );
}

function CardEmpty({ children }: { children: ReactNode }) {
  return <p className="student-overview-card__empty">{children}</p>;
}

function OverviewCard({
  title,
  sparse = false,
  children,
}: {
  title: string;
  sparse?: boolean;
  children: ReactNode;
}) {
  const className = [
    'student-360-section-card',
    'student-overview-card',
    sparse ? 'student-overview-card--sparse' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <Card className={className} pad={false}>
      <SectionHead title={title} />
      <div className="student-overview-card__body">{children}</div>
    </Card>
  );
}

function OverviewFacts({ children }: { children: ReactNode }) {
  return <dl className="student-overview-card__facts">{children}</dl>;
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
        className="student-overview-cards student-overview-cards--loading"
        aria-busy="true"
        aria-label={t('admin.student360.overview.activityTitle')}
      >
        <div className="student-overview-cards__grid student-overview-cards__grid--activity">
          {Array.from({ length: OVERVIEW_SKELETON_CARD_COUNT }, (_, index) => (
            <div key={index} className="student-overview-card-skeleton card" aria-hidden="true">
              <div className="student-overview-card-skeleton__head" />
              <div className="student-overview-card-skeleton__line" />
              <div className="student-overview-card-skeleton__line student-overview-card-skeleton__line--short" />
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
    <section className="student-overview-cards" aria-label={t('admin.student360.overview.activityTitle')}>
      <h2 className="student-overview-cards__heading">{t('admin.student360.overview.activityTitle')}</h2>
      <div className="student-overview-cards__grid student-overview-cards__grid--activity">
        {showAttendance ? (
          <OverviewCard title={t('admin.student360.overview.cards.attendance')} sparse={attendanceEmpty}>
            {attendanceEmpty ? (
              <CardEmpty>{t('admin.student360.overview.attendance.noDataYet')}</CardEmpty>
            ) : (
              <OverviewFacts>
                {(() => {
                  const absences = formatOptional(t, attendance?.absences_this_month);
                  const late = formatOptional(t, attendance?.late_this_month);
                  const lastStatus =
                    attendance?.last_status_label ||
                    (attendance?.last_status ? statusLabel(t, attendance.last_status) : null);
                  const last = formatOptional(t, lastStatus);
                  return (
                    <>
                      <OverviewFact
                        label={t('admin.student360.overview.attendance.absencesMonth')}
                        value={absences.text}
                        muted={absences.muted}
                      />
                      <OverviewFact
                        label={t('admin.student360.overview.attendance.lateMonth')}
                        value={late.text}
                        muted={late.muted}
                      />
                      <OverviewFact
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
              </OverviewFacts>
            )}
          </OverviewCard>
        ) : null}

        {showAcademic ? (
          <OverviewCard title={t('admin.student360.overview.cards.academic')} sparse={academicEmpty}>
            {academicEmpty ? (
              <CardEmpty>{t('admin.student360.overview.academic.noRecentData')}</CardEmpty>
            ) : (
              <OverviewFacts>
                {(() => {
                  const homework = formatOptional(t, academic?.open_homework_count);
                  const exams = formatOptional(t, academic?.upcoming_exams_count);
                  const result = academic?.last_result_label
                    ? { text: academic.last_result_label, muted: false }
                    : formatOptional(t, academic?.last_result);
                  return (
                    <>
                      <OverviewFact
                        label={t('admin.student360.overview.academic.openHomework')}
                        value={homework.text}
                        muted={homework.muted}
                      />
                      <OverviewFact
                        label={t('admin.student360.overview.academic.upcomingExams')}
                        value={exams.text}
                        muted={exams.muted}
                      />
                      <OverviewFact
                        label={t('admin.student360.overview.academic.lastResult')}
                        value={result.text}
                        muted={result.muted}
                        dir="auto"
                      />
                    </>
                  );
                })()}
              </OverviewFacts>
            )}
          </OverviewCard>
        ) : null}
      </div>
    </section>
  );
}
