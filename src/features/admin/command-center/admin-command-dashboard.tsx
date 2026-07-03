'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/primitives';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { canSeeChannels, canSeeStudentData } from '@/lib/permissions/scope';
import { shouldHideSchoolWideDashboardKpis } from '@/lib/admin/admin-ux';
import { canViewAcademicSetup } from '@/lib/permissions/academic-setup';
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
  type AdminActionItem,
} from './primitives';

const ATT_KEYS: AttendanceStatus[] = ['present', 'absent', 'late', 'left_early'];

const ATT_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function attendancePercent(att: AdminDashboard['attendance_today']): number | null {
  if (!att) return null;
  const total = att.total_recorded ?? att.total ?? 0;
  if (total <= 0) return null;
  return Math.round((att.present / total) * 100);
}

function buildActionItems(d: AdminDashboard, t: (k: string, p?: Record<string, string | number>) => string): AdminActionItem[] {
  const items: AdminActionItem[] = [];

  if (Array.isArray(d.important_alerts)) {
    d.important_alerts.forEach((a, i) => {
      const text = String(a).trim();
      if (text) {
        items.push({ id: `alert-${i}`, label: text, icon: '⚠️', tone: 'amber' });
      }
    });
  }

  const missing = d.exams_missing_results ?? 0;
  if (missing > 0) {
    items.push({
      id: 'exams-missing-results',
      label: t('admin.cmd.examsMissingResults', { count: missing }),
      href: '/admin/exams',
      icon: '📋',
      tone: 'amber',
    });
  }

  const drafts = d.draft_exam_results_count ?? 0;
  if (drafts > 0) {
    items.push({
      id: 'draft-results',
      label: t('admin.cmd.draftResultsPending', { count: drafts }),
      href: '/admin/exam-results',
      icon: '✏️',
      tone: 'amber',
    });
  }

  if (d.next_exam && missing > 0) {
    items.push({
      id: 'next-exam',
      label: t('admin.cmd.reviewNextExam', { name: d.next_exam.name }),
      hint: d.next_exam.class?.name,
      href: `/admin/exams/${d.next_exam.id}`,
      icon: '📅',
    });
  }

  return items;
}

/** Optional dashboard counters — read when backend exposes them without a contract change here. */
function readStudentDataQualityCounts(d: AdminDashboard): {
  withoutClass: number;
  withoutParent: number;
  withoutAcademicYear: number;
  incompleteProfile: number;
} {
  const raw = d as AdminDashboard & {
    data_quality?: {
      students_without_class?: number;
      students_without_parent?: number;
      students_without_academic_year?: number;
      students_incomplete_profile?: number;
    };
    students_without_class?: number;
    students_without_parent?: number;
    students_without_academic_year?: number;
    students_incomplete_profile?: number;
  };
  const bucket = raw.data_quality ?? raw;
  return {
    withoutClass: bucket.students_without_class ?? 0,
    withoutParent: bucket.students_without_parent ?? 0,
    withoutAcademicYear: bucket.students_without_academic_year ?? 0,
    incompleteProfile: bucket.students_incomplete_profile ?? 0,
  };
}

function buildDataQualityItems(
  d: AdminDashboard,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const counts = readStudentDataQualityCounts(d);
  const items: AdminActionItem[] = [];
  const studentsHref = '/admin/students';

  if (counts.withoutClass > 0) {
    items.push({
      id: 'dq-without-class',
      label: t('admin.cmd.studentsWithoutClassCount', { count: counts.withoutClass }),
      href: studentsHref,
      icon: '🏫',
      tone: 'amber',
    });
  }
  if (counts.withoutParent > 0) {
    items.push({
      id: 'dq-without-parent',
      label: t('admin.cmd.studentsWithoutParentCount', { count: counts.withoutParent }),
      href: studentsHref,
      icon: '👪',
      tone: 'amber',
    });
  }
  if (counts.withoutAcademicYear > 0) {
    items.push({
      id: 'dq-without-year',
      label: t('admin.cmd.studentsWithoutAcademicYearCount', { count: counts.withoutAcademicYear }),
      href: studentsHref,
      icon: '📅',
      tone: 'amber',
    });
  }
  if (counts.incompleteProfile > 0) {
    items.push({
      id: 'dq-incomplete-profile',
      label: t('admin.cmd.studentsIncompleteProfileCount', { count: counts.incompleteProfile }),
      href: studentsHref,
      icon: '📝',
      tone: 'amber',
    });
  }

  return items;
}

export function AdminCommandDashboard({
  data: d,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const session = useSession();
  const effectiveUser = user ?? session;

  const today = todayIso();
  const att = d.attendance_today;
  const pct = attendancePercent(att);
  const totalRecorded = att?.total_recorded ?? att?.total ?? 0;
  const hasAttendance = totalRecorded > 0;

  const canViewAttendance =
    canSeeStudentData(effectiveUser) && hasPermission(effectiveUser, 'view_attendance');
  const canCorrectAttendance =
    canSeeStudentData(effectiveUser) && hasPermission(effectiveUser, 'manage_attendance');
  const canViewChannels =
    canSeeChannels(effectiveUser) && hasPermission(effectiveUser, 'view_channels');
  const hideSchoolWideKpis = shouldHideSchoolWideDashboardKpis(effectiveUser);
  const scopedMode = shouldHideSchoolWideDashboardKpis(effectiveUser);

  const actionItems = useMemo(() => buildActionItems(d, t), [d, t]);
  const dataQualityItems = useMemo(() => buildDataQualityItems(d, t), [d, t]);
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
  const canOpenStudents =
    canSeeStudentData(effectiveUser) && hasPermission(effectiveUser, 'view_students');

  const schoolName = formatSchoolLabel(effectiveUser.school, t);

  const quickActions = useMemo(() => {
    const actions: { id: string; href: string; icon: string; label: string; show: boolean }[] = [
      {
        id: 'add-student',
        href: '/admin/students/new',
        icon: '🎓',
        label: t('admin.addStudent'),
        show:
          hasPermission(effectiveUser, 'manage_students') &&
          hasPermission(effectiveUser, 'view_students'),
      },
      {
        id: 'attendance',
        href: '/admin/attendance?date=today',
        icon: '🗓️',
        label: t('nav.attendance'),
        show: canViewAttendance,
      },
      {
        id: 'classes',
        href: '/admin/classes',
        icon: '🏫',
        label: t('nav.classes'),
        show: hasPermission(effectiveUser, 'view_classes'),
      },
      {
        id: 'import-csv',
        href: '/admin/students',
        icon: '📥',
        label: t('admin.importCsv'),
        show: hasPermission(effectiveUser, 'import_data'),
      },
      {
        id: 'channels',
        href: '/admin/channels',
        icon: '💬',
        label: t('nav.channels'),
        show: canViewChannels,
      },
      {
        id: 'settings',
        href: '/admin/settings',
        icon: '⚙️',
        label: t('admin.settings.title'),
        show: canViewAcademicSetup(effectiveUser),
      },
    ];
    return actions.filter((a) => a.show);
  }, [effectiveUser, t, today, canViewAttendance, canViewChannels]);

  return (
    <>
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
          canViewAttendance && hasAttendance ? (
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
          ) : (
            <span className="admin-hero__kpi">
              {canViewAttendance ? t('admin.cmd.attendanceUnavailable') : t('admin.cmd.attendanceNoAccess')}
            </span>
          )
        }
        primaryAction={
          canViewAttendance ? (
            <AdminHeroButton href="/admin/attendance?date=today" variant="primary">
              {t('admin.cmd.openAttendance')}
            </AdminHeroButton>
          ) : undefined
        }
        secondaryAction={
          canCorrectAttendance ? (
            <AdminHeroButton href="/admin/attendance?date=today&correct=1" variant="ghost">
              {t('admin.cmd.correctAttendance')}
            </AdminHeroButton>
          ) : undefined
        }
      />

      <div className="admin-ops-grid">
        {canViewAttendance && (
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
        )}

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

          {canOpenStudents && (
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
      </div>

      {canSeeStudentData(effectiveUser) &&
        !hideSchoolWideKpis &&
        (hasPermission(effectiveUser, 'view_students') ||
          hasPermission(effectiveUser, 'view_teachers') ||
          hasPermission(effectiveUser, 'view_parents') ||
          hasPermission(effectiveUser, 'view_classes')) && (
        <AdminSection title={t('admin.cmd.schoolStructureTitle')}>
          <AdminSchoolStrip
            cells={[
              hasPermission(effectiveUser, 'view_students') && {
                href: '/admin/students',
                label: t('nav.students'),
                value: d.total_students,
                icon: '🎓',
              },
              hasPermission(effectiveUser, 'view_teachers') && {
                href: '/admin/teachers',
                label: t('nav.teachers'),
                value: d.total_teachers,
                icon: '👩‍🏫',
              },
              hasPermission(effectiveUser, 'view_parents') && {
                href: '/admin/parents',
                label: t('nav.parents'),
                value: d.total_parents,
                icon: '👪',
              },
              hasPermission(effectiveUser, 'view_classes') && {
                href: '/admin/classes',
                label: t('nav.classes'),
                value: d.total_classes,
                icon: '🏫',
              },
            ].filter(Boolean) as { href: string; label: string; value: number | undefined; icon: string }[]}
          />
        </AdminSection>
      )}

      <div className="admin-dashboard-tail">
      {hasPermission(effectiveUser, 'view_classes') &&
        canSeeStudentData(effectiveUser) &&
        !hideSchoolWideKpis && (
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
                <strong>{d.published_homeworks ?? 0}</strong>
              </Link>
              <Link href="/admin/resources" className="admin-academic-metric">
                <span>{t('dashboard.publishedResources')}</span>
                <strong>{d.published_resources ?? 0}</strong>
              </Link>
              <Link href="/admin/exams" className="admin-academic-metric">
                <span>{t('dashboard.upcomingExams')}</span>
                <strong>{d.upcoming_exams_count ?? 0}</strong>
              </Link>
              <Link
                href="/admin/exam-results"
                className={cn(
                  'admin-academic-metric',
                  (d.draft_exam_results_count ?? 0) > 0 && 'admin-academic-metric--warn',
                )}
              >
                <span>{t('dashboard.draftExamResults')}</span>
                <strong>{d.draft_exam_results_count ?? 0}</strong>
              </Link>
              <Link href="/admin/exam-results" className="admin-academic-metric">
                <span>{t('dashboard.publishedExamResults')}</span>
                <strong>{d.published_exam_results_count ?? 0}</strong>
              </Link>
              <Link
                href="/admin/exams"
                className={cn(
                  'admin-academic-metric',
                  (d.exams_missing_results ?? 0) > 0 && 'admin-academic-metric--warn',
                )}
              >
                <span>{t('dashboard.examsMissingResults')}</span>
                <strong>{d.exams_missing_results ?? 0}</strong>
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

      {canViewChannels && (
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
