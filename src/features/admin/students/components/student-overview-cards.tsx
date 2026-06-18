'use client';

import Link from 'next/link';
import { Card, SectionHead } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { formatMoney } from '@/lib/utils/finance';
import { statusLabel } from '@/lib/utils/labels';
import { studentClassLabel, studentLevelLabel, refOrStringLabel } from '../utils/student-academic-labels';
import { buildStudent360TabHref } from '../utils/student-360-tabs';
import type { Student360TabId } from '../utils/student-360-tabs';
import type { AcademicClassOption, AcademicLevelOption } from '@/types/student-360';
import type { StudentOverviewData } from '@/types/student-overview';

const CONSENT_KEYS = [
  'trip_participation',
  'photo_publish',
  'social_media_publish',
  'emergency_treatment',
  'school_transport',
  'pickup_authorization',
] as const;

function dash(t: (k: string) => string, value: string | number | null | undefined): string {
  if (value == null || value === '') return t('common.dash');
  return String(value);
}

function consentLabel(t: (k: string) => string, status: string | null | undefined): string {
  if (!status) return t('common.dash');
  const key = `admin.student360.overview.consents.status.${status}`;
  const label = t(key);
  return label === key ? status : label;
}

export function StudentOverviewCards({
  studentId,
  overview,
  loading,
  endpointUnavailable,
  showDocuments,
  showFinance,
  onOpenTab,
}: {
  studentId: string;
  overview: StudentOverviewData | null;
  loading: boolean;
  endpointUnavailable: boolean;
  showDocuments: boolean;
  showFinance: boolean;
  onOpenTab?: (tab: Student360TabId) => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();

  if (loading && !overview) {
    return (
      <section className="student-overview-cards student-overview-cards--loading" aria-busy="true">
        <p className="muted">{t('admin.student360.overview.loading')}</p>
      </section>
    );
  }

  if (endpointUnavailable || overview?.available === false) {
    return (
      <section className="student-overview-cards student-overview-cards--unavailable">
        <Card className="student-360-section-card student-overview-card student-overview-card--empty" pad={false}>
          <div className="student-overview-card__body">
            <p className="student-overview-card__empty-title">{t('admin.student360.overview.unavailableTitle')}</p>
            <p className="muted">{t('admin.student360.overview.unavailableDesc')}</p>
          </div>
        </Card>
      </section>
    );
  }

  if (!overview) return null;

  const schooling = overview.schooling;
  const family = overview.family;
  const documents = overview.documents_summary;
  const consents = overview.consents_summary;
  const attendance = overview.attendance_summary;
  const finance = overview.finance_summary;
  const academic = overview.academic_summary;

  const openTab = (tab: Student360TabId) => onOpenTab?.(tab);

  return (
    <section className="student-overview-cards" aria-label={t('admin.student360.overview.cardsTitle')}>
      <div className="student-overview-cards__grid">
        {schooling?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead title={t('admin.student360.overview.cards.schooling')} />
            <div className="student-overview-card__body">
              <dl className="student-overview-card__facts">
                <div className="student-overview-card__fact">
                  <dt>{t('admin.finance.activeSchool')}</dt>
                  <dd dir="auto">{refOrStringLabel(schooling?.school) || t('common.dash')}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('admin.academicYearId')}</dt>
                  <dd dir="auto">{refOrStringLabel(schooling?.academic_year) || t('common.dash')}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('nav.levels')}</dt>
                  <dd dir="auto">
                    {schooling?.level
                      ? studentLevelLabel(schooling.level as AcademicLevelOption)
                      : t('common.dash')}
                  </dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('nav.classes')}</dt>
                  <dd dir="auto">
                    {schooling?.class
                      ? studentClassLabel(schooling.class as AcademicClassOption)
                      : t('common.dash')}
                  </dd>
                </div>
              </dl>
              {(schooling?.gaps?.length ?? 0) > 0 || (schooling?.warnings?.length ?? 0) > 0 ? (
                <ul className="student-overview-card__warnings">
                  {[...(schooling?.gaps ?? []), ...(schooling?.warnings ?? [])].map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
        ) : null}

        {family?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead
              title={t('admin.student360.overview.cards.family')}
              action={
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => openTab('guardians')}>
                  {t('common.view')}
                </button>
              }
            />
            <div className="student-overview-card__body">
              {family?.has_guardian ? (
                <dl className="student-overview-card__facts">
                  <div className="student-overview-card__fact">
                    <dt>{t('admin.student360.overview.family.guardian')}</dt>
                    <dd dir="auto">{dash(t, family.primary_guardian_name)}</dd>
                  </div>
                  <div className="student-overview-card__fact">
                    <dt>{t('admin.phone')}</dt>
                    <dd dir="auto">{dash(t, family.primary_guardian_phone)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="student-overview-card__alert">{t('admin.student360.overview.family.noGuardian')}</p>
              )}
            </div>
          </Card>
        ) : null}

        {showDocuments && documents?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead
              title={t('admin.student360.overview.cards.documents')}
              action={
                <Link href={buildStudent360TabHref(studentId, 'documents')} className="btn btn--ghost btn--sm">
                  {t('admin.student360.overview.viewDocuments')}
                </Link>
              }
            />
            <div className="student-overview-card__body">
              <dl className="student-overview-card__metrics">
                <div>
                  <dt>{t('admin.student360.overview.documents.total')}</dt>
                  <dd>{dash(t, documents?.total)}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.overview.documents.missing')}</dt>
                  <dd>{dash(t, documents?.missing)}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.overview.documents.pendingReview')}</dt>
                  <dd>{dash(t, documents?.pending_review)}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.overview.documents.accepted')}</dt>
                  <dd>{dash(t, documents?.accepted)}</dd>
                </div>
                <div>
                  <dt>{t('admin.student360.overview.documents.rejected')}</dt>
                  <dd>{dash(t, documents?.rejected)}</dd>
                </div>
              </dl>
            </div>
          </Card>
        ) : null}

        {consents?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead title={t('admin.student360.overview.cards.consents')} />
            <div className="student-overview-card__body">
              {consents?.can_view === true ? (
                <dl className="student-overview-card__facts">
                  {CONSENT_KEYS.map((key) => (
                    <div key={key} className="student-overview-card__fact">
                      <dt>{t(`admin.student360.overview.consents.${key}`)}</dt>
                      <dd>{consentLabel(t, consents[key])}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="muted">{t('admin.student360.overview.consents.restricted')}</p>
              )}
            </div>
          </Card>
        ) : null}

        {attendance?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead title={t('admin.student360.overview.cards.attendance')} />
            <div className="student-overview-card__body">
              <dl className="student-overview-card__facts">
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.attendance.absencesMonth')}</dt>
                  <dd>{dash(t, attendance?.absences_this_month)}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.attendance.lateMonth')}</dt>
                  <dd>{dash(t, attendance?.late_this_month)}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.attendance.lastStatus')}</dt>
                  <dd dir="auto">
                    {attendance?.last_status_label ||
                      (attendance?.last_status ? statusLabel(t, attendance.last_status) : t('common.dash'))}
                    {attendance?.last_status_date ? (
                      <span className="student-overview-card__sub muted">
                        {' '}
                        · {formatDate(attendance.last_status_date)}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
        ) : null}

        {showFinance ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead
              title={t('admin.student360.overview.cards.finance')}
              action={
                finance?.available === true ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => openTab('finance')}>
                    {t('common.view')}
                  </button>
                ) : null
              }
            />
            <div className="student-overview-card__body">
              {finance?.available === true ? (
                <dl className="student-overview-card__facts">
                  {finance.status_label ? (
                    <div className="student-overview-card__fact">
                      <dt>{t('admin.student360.studentStatus')}</dt>
                      <dd>{finance.status_label}</dd>
                    </div>
                  ) : null}
                  <div className="student-overview-card__fact">
                    <dt>{t('admin.student360.overview.finance.outstanding')}</dt>
                    <dd>{formatMoney(finance.total_outstanding, finance.currency)}</dd>
                  </div>
                  <div className="student-overview-card__fact">
                    <dt>{t('admin.student360.overview.finance.overdue')}</dt>
                    <dd>{formatMoney(finance.total_overdue, finance.currency)}</dd>
                  </div>
                  <div className="student-overview-card__fact">
                    <dt>{t('admin.student360.overview.finance.paid')}</dt>
                    <dd>{formatMoney(finance.total_paid, finance.currency)}</dd>
                  </div>
                  {finance.next_due_date ? (
                    <div className="student-overview-card__fact">
                      <dt>{t('admin.student360.overview.finance.nextDue')}</dt>
                      <dd>{formatDate(finance.next_due_date)}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <p className="muted">{t('admin.student360.overview.finance.unavailable')}</p>
              )}
            </div>
          </Card>
        ) : null}

        {academic?.available !== false ? (
          <Card className="student-360-section-card student-overview-card" pad={false}>
            <SectionHead title={t('admin.student360.overview.cards.academic')} />
            <div className="student-overview-card__body">
              <dl className="student-overview-card__facts">
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.academic.openHomework')}</dt>
                  <dd>{dash(t, academic?.open_homework_count)}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.academic.upcomingExams')}</dt>
                  <dd>{dash(t, academic?.upcoming_exams_count)}</dd>
                </div>
                <div className="student-overview-card__fact">
                  <dt>{t('admin.student360.overview.academic.lastResult')}</dt>
                  <dd dir="auto">
                    {academic?.last_result_label || dash(t, academic?.last_result)}
                  </dd>
                </div>
              </dl>
            </div>
          </Card>
        ) : null}
      </div>
    </section>
  );
}
