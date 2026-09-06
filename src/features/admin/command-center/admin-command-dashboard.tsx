'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { useAllSchoolsCopy } from '@/features/admin/all-schools/all-schools-i18n';
import {
  resolveDashboardVariant,
  resolveDashboardWidgets,
  type AdminQuickActionId,
} from '@/lib/admin/dashboard-registry';
import { isAllSchoolsReadMode } from '@/lib/admin/all-schools-read-mode';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import type { AdminDashboard } from '@/types/dashboard';
import type { AttendanceStatus } from '@/types/attendance';
import type { CurrentUser } from '@/types/user';
import {
  AdminSection,
  AdminCommandHero,
  AdminHeroKpi,
  AdminHeroButton,
  AdminOperationCard,
  AdminKpiStrip,
  AdminActionList,
  AdminSchoolStrip,
  AdminQuickAction,
} from './primitives';
import {
  ATT_KEYS,
  attendancePercent,
  buildDashboardActionItems,
  buildDataQualityItems,
  todayIso,
} from '@/features/admin/dashboard/dashboard-interventions';

const ATT_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

export function AdminCommandDashboard({
  data: d,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDate, formatDateTime } = useFormat();
  const session = useSession();
  const effectiveUser = user ?? session;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const allSchoolsCopy = useAllSchoolsCopy();
  const allSchools = isAllSchoolsReadMode(pathname, searchParams);

  const today = todayIso();
  const att = d.attendance_today;
  const pct = attendancePercent(att);
  const totalRecorded = att?.total_recorded ?? att?.total ?? 0;
  const hasAttendance = totalRecorded > 0;

  const variant = resolveDashboardVariant(effectiveUser);
  const widgets = resolveDashboardWidgets(effectiveUser);
  const hideSchoolWideKpis = variant.hideSchoolWideKpis;
  const scopedMode = variant.scopedMode;
  const staffMode = variant.id === 'admin_staff';

  const actionItems = useMemo(() => buildDashboardActionItems(d, t, locale), [d, t, locale]);
  const dataQualityItems = useMemo(() => buildDataQualityItems(d, t, locale), [d, t, locale]);
  const hasDataQualityIssues = dataQualityItems.length > 0;
  const hasInterventionIssues = actionItems.length > 0 || hasDataQualityIssues;
  const hasClickableInterventions =
    actionItems.some((item) => !!item.href) || hasDataQualityIssues;
  const interventionDescription = hideSchoolWideKpis
    ? hasClickableInterventions
      ? t('admin.cmd.scopedInterventionDesc')
      : t('admin.cmd.scopedInterventionDescNeutral')
    : hasClickableInterventions
      ? t('admin.cmd.interventionDesc')
      : t('admin.cmd.interventionDescNeutral');
  const schoolName = allSchools
    ? allSchoolsCopy.allSchools
    : formatSchoolLabel(effectiveUser.school, t);

  const quickActions = useMemo(() => {
    const catalog: Record<
      AdminQuickActionId,
      { href: string; icon: string; label: string }
    > = {
      'add-student': {
        href: '/admin/students/new',
        icon: '🎓',
        label: t('admin.addStudent'),
      },
      attendance: {
        href: '/admin/attendance?date=today',
        icon: '🗓️',
        label: t('nav.attendance'),
      },
      classes: {
        href: '/admin/classes',
        icon: '🏫',
        label: t('nav.classes'),
      },
      'import-csv': {
        href: '/admin/students',
        icon: '📥',
        label: t('admin.importCsv'),
      },
      channels: {
        href: '/admin/channels',
        icon: '💬',
        label: t('nav.channels'),
      },
      settings: {
        href: '/admin/settings',
        icon: '⚙️',
        label: t('admin.settings.title'),
      },
    };
    return widgets.quickActions.map((id) => ({ id, ...catalog[id] }));
  }, [widgets.quickActions, t]);

  const structureCells = [
    widgets.schoolStructureStudents && {
      href: '/admin/students',
      label: t('nav.students'),
      value: d.total_students,
      icon: '🎓',
    },
    widgets.schoolStructureTeachers && {
      href: '/admin/teachers',
      label: t('nav.teachers'),
      value: d.total_teachers,
      icon: '👩‍🏫',
    },
    widgets.schoolStructureParents && {
      href: '/admin/parents',
      label: t('nav.parents'),
      value: d.total_parents,
      icon: '👪',
    },
    widgets.schoolStructureClasses && {
      href: '/admin/classes',
      label: t('nav.classes'),
      value: d.total_classes,
      icon: '🏫',
    },
  ].filter(Boolean) as { href: string; label: string; value: number | undefined; icon: string }[];

  const attendanceOperation = widgets.attendanceOperations ? (
    <AdminOperationCard
      title={t('admin.cmd.attendanceOpsTitle')}
      description={t('admin.cmd.attendanceOpsDesc')}
      accent
      footer={
        <Link className="admin-section__action" href="/admin/attendance?date=today">
          {t('common.viewAll')} →
        </Link>
      }
    >
      {hasAttendance ? (
        <AdminKpiStrip
          items={ATT_KEYS.map((k) => ({
            key: k,
            label: t(`attendance.${k === 'left_early' ? 'leftEarly' : k}`),
            value: att?.[k] ?? 0,
            tone: ATT_TONE[k],
          }))}
          foot={
            <>
              <span>
                {t('admin.totalRecorded')}: <strong>{totalRecorded}</strong>
              </span>
              {pct != null && (
                <span className="admin-kpi-strip__pct">
                  {t('admin.cmd.presentRate', { pct })}
                </span>
              )}
              {((att?.absent ?? 0) > 0 || (att?.late ?? 0) > 0) && (
                <span>
                  {t('admin.cmd.attendanceHighlights', {
                    absent: att?.absent ?? 0,
                    late: att?.late ?? 0,
                  })}
                </span>
              )}
            </>
          }
        />
      ) : (
        <p className="admin-empty-hint">{t('admin.cmd.attendanceUnavailable')}</p>
      )}
    </AdminOperationCard>
  ) : null;

  const interventionOperation = (
    <div
      className={cn(
        'admin-intervention-card',
        hasInterventionIssues
          ? 'admin-intervention-card--active'
          : 'admin-intervention-card--neutral',
      )}
    >
      <AdminOperationCard
        title={t('admin.cmd.interventionTitle')}
        description={interventionDescription}
        intervention={hasInterventionIssues}
      >
        <div className="admin-intervention-section">
          <p className="admin-intervention-section__label">{t('admin.cmd.urgentSectionLabel')}</p>
          <AdminActionList items={actionItems} emptyLabel={t('admin.cmd.noInterventions')} />
        </div>

        {widgets.dataQuality && (
          <div className="admin-intervention-dq">
            <p className="admin-intervention-section__label">{t('admin.cmd.dataQualitySectionLabel')}</p>
            {hasDataQualityIssues ? (
              <AdminActionList
                items={dataQualityItems}
                emptyLabel={t('admin.cmd.noSpecificReviewItems')}
              />
            ) : (
              <p className="admin-empty-hint">{t('admin.cmd.noDataQualityIssuesFromDashboard')}</p>
            )}
            <Link href="/admin/students" className="admin-card__secondary-link admin-intervention-dq__link">
              {t('admin.cmd.openStudentsList')}
            </Link>
          </div>
        )}
      </AdminOperationCard>
    </div>
  );

  return (
    <>
      {!staffMode && (
        <AdminCommandHero
          eyebrow={t('admin.cmd.operationsEyebrow')}
          title={t('admin.cmd.operationsTitle')}
          meta={
            <>
              <span>{schoolName}</span>
              <span>{formatDate(today)}</span>
            </>
          }
          summary={scopedMode ? t('admin.cmd.scopedOperationsSummary') : t('admin.cmd.operationsSummary')}
          kpis={
            widgets.heroAttendance && hasAttendance ? (
              widgets.attendanceOperations ? (
                <span className="admin-hero__kpi admin-hero__kpi--summary">
                  {pct != null ? (
                    t('admin.cmd.presentRate', { pct: Math.round(pct) })
                  ) : (
                    <>
                      <strong>{totalRecorded}</strong>
                      <span>{t('admin.totalRecorded')}</span>
                    </>
                  )}
                </span>
              ) : (
                <>
                  {ATT_KEYS.map((k) => (
                    <AdminHeroKpi
                      key={k}
                      label={t(`attendance.${k === 'left_early' ? 'leftEarly' : k}`)}
                      value={att?.[k] ?? 0}
                      tone={ATT_TONE[k]}
                    />
                  ))}
                  <AdminHeroKpi label={t('admin.totalRecorded')} value={totalRecorded} tone="none" />
                </>
              )
            ) : (
              <span className="admin-hero__kpi">
                {widgets.heroAttendance ? t('admin.cmd.attendanceUnavailable') : t('admin.cmd.attendanceNoAccess')}
              </span>
            )
          }
          primaryAction={
            widgets.heroAttendance ? (
              <AdminHeroButton href="/admin/attendance?date=today" variant="primary">
                {t('admin.cmd.openAttendance')}
              </AdminHeroButton>
            ) : undefined
          }
          secondaryAction={
            widgets.heroCorrectAttendance ? (
              <AdminHeroButton href="/admin/attendance?date=today&correct=1" variant="ghost">
                {t('admin.cmd.correctAttendance')}
              </AdminHeroButton>
            ) : undefined
          }
        />
      )}

      <div className="admin-ops-grid">
        {staffMode ? (
          <>
            {interventionOperation}
            {attendanceOperation}
          </>
        ) : (
          <>
            {attendanceOperation}
            {interventionOperation}
          </>
        )}
      </div>

      {widgets.schoolStructure && (
        <AdminSection title={t('admin.cmd.schoolStructureTitle')}>
          {staffMode ? (
            <div className="admin-quick-row">
              {structureCells.map((cell) => (
                <Link key={cell.href} href={cell.href} className="admin-quick-action">
                  <span aria-hidden="true">{cell.icon}</span>
                  <strong>{cell.value ?? '—'}</strong>
                  <span>{cell.label}</span>
                </Link>
              ))}
            </div>
          ) : (
            <AdminSchoolStrip cells={structureCells} />
          )}
        </AdminSection>
      )}

      <div className="admin-dashboard-tail">
      {widgets.academicActivity && (
        <AdminSection
          className="admin-section--academic"
          title={t('admin.cmd.academicActivityTitle')}
          action={
            <Link className="admin-section__action" href="/admin/exams">
              {t('nav.exams')} →
            </Link>
          }
        >
          <div className="admin-card">
            <div className="admin-academic-grid">
              <Link href="/admin/homeworks" className="admin-academic-metric">
                <span>{t('dashboard.publishedHomeworks')}</span>
                <strong>{d.published_homeworks ?? '—'}</strong>
              </Link>
              <Link href="/admin/resources" className="admin-academic-metric">
                <span>{t('dashboard.publishedResources')}</span>
                <strong>{d.published_resources ?? '—'}</strong>
              </Link>
              <Link href="/admin/exams" className="admin-academic-metric">
                <span>{t('dashboard.upcomingExams')}</span>
                <strong>{d.upcoming_exams_count ?? '—'}</strong>
              </Link>
              <Link
                href="/admin/exam-results"
                className={cn(
                  'admin-academic-metric',
                  (d.draft_exam_results_count ?? 0) > 0 && 'admin-academic-metric--warn',
                )}
              >
                <span>{t('dashboard.draftExamResults')}</span>
                <strong>{d.draft_exam_results_count ?? '—'}</strong>
              </Link>
              <Link href="/admin/exam-results" className="admin-academic-metric">
                <span>{t('dashboard.publishedExamResults')}</span>
                <strong>{d.published_exam_results_count ?? '—'}</strong>
              </Link>
              <Link
                href="/admin/exams"
                className={cn(
                  'admin-academic-metric',
                  (d.exams_missing_results ?? 0) > 0 && 'admin-academic-metric--warn',
                )}
              >
                <span>{t('dashboard.examsMissingResults')}</span>
                <strong>{d.exams_missing_results ?? '—'}</strong>
              </Link>
            </div>
            {d.next_exam && (
              <div className="admin-next-exam">
                <div>
                  <strong>{d.next_exam.name}</strong>
                  <p className="tiny muted mt-2">
                    {d.next_exam.class?.name}
                    {d.next_exam.exam_date && ` · ${formatDate(d.next_exam.exam_date)}`}
                  </p>
                </div>
                <Link className="btn btn--ghost btn--sm" href={`/admin/exams/${d.next_exam.id}`}>
                  {t('dashboard.details')}
                </Link>
              </div>
            )}
          </div>
        </AdminSection>
      )}

      {widgets.latestMessages && (
        <AdminSection
          className="admin-section--messages"
          title={t('dashboard.latestMessages')}
          action={
            <Link className="admin-section__action" href="/admin/channels">
              {t('dashboard.allChannels')} →
            </Link>
          }
        >
          {d.latest_messages?.length ? (
            <Card pad={false}>
              <div className="msg-feed">
                {d.latest_messages.map((m) => (
                  <div key={m.id} className="msg-feed__item">
                    <div className="msg-feed__meta">
                      <span className="msg-feed__channel">{m.channel}</span>
                      <span className="msg-feed__time">{formatDateTime(m.created_at)}</span>
                    </div>
                    <div className="msg-feed__sender">{m.sender}</div>
                    <div className="msg-feed__body">{m.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <p className="admin-empty-hint">{t('empty.messages')}</p>
          )}
        </AdminSection>
      )}

      {quickActions.length > 0 && (
        <AdminSection className="admin-section--quick-ops" title={t('admin.cmd.quickOpsTitle')}>
          <div className="admin-quick-row">
            {quickActions.map((a) => (
              <AdminQuickAction key={a.id} href={a.href} icon={a.icon} label={a.label} />
            ))}
          </div>
        </AdminSection>
      )}
      </div>
    </>
  );
}
