'use client';

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import {
  resolveDashboardVariant,
  resolveDashboardWidgets,
  type AdminQuickActionId,
} from '@/lib/admin/dashboard-registry';
import { formatSchoolLabel } from '@/lib/admin/school-label';
import { canViewSettings, canAccessStaffCenter } from '@/lib/permissions/academic-setup';
import { canViewSchoolBrandingSettings } from '@/lib/permissions/school-branding-settings';
import { hasPermission } from '@/lib/permissions/permissions';
import { normalizeFinanceOverview, normalizeMoneyValue } from '@/lib/utils/finance-normalize';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { AdminCommandDashboard } from '@/features/admin/command-center/admin-command-dashboard';
import {
  ATT_KEYS,
  attendancePercent,
  buildDashboardActionItems,
  buildDataQualityItems,
  todayIso,
} from '@/features/admin/dashboard/dashboard-interventions';
import type { AdminDashboard } from '@/types/dashboard';
import type { AdmissionsDashboard } from '@/types/admission';
import type { AdminFinanceOverview } from '@/types/finance';
import type { AttendanceStatus } from '@/types/attendance';
import type { CurrentUser } from '@/types/user';
import {
  ExecutiveAdmissionStat,
  ExecutiveDecisionList,
  ExecutiveEmpty,
  ExecutiveKpiCard,
  ExecutiveLinkRow,
  ExecutiveMetricTile,
  ExecutivePanel,
  ExecutiveZoneLabel,
  type ExecutiveTone,
} from '@/features/admin/dashboard/executive-dashboard-ui';
import { AdminQuickAction } from '@/features/admin/command-center/primitives';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';

const ATT_TONE: Record<AttendanceStatus, 'green' | 'red' | 'amber' | 'blue'> = {
  present: 'green',
  absent: 'red',
  late: 'amber',
  left_early: 'blue',
};

function pickFinanceTotals(data: AdminFinanceOverview | null) {
  const overview = normalizeFinanceOverview(data);
  return overview?.totals ?? overview?.summary ?? null;
}

function buildFinanceInterventions(
  data: AdminFinanceOverview | null,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  const overview = normalizeFinanceOverview(data);
  if (!overview) return [];
  const items: AdminActionItem[] = [];
  const totals = overview.totals ?? overview.summary;
  const overdue = totals?.total_overdue ?? totals?.overdue_amount;
  const overdueCount = totals?.overdue_installments_count ?? totals?.overdue_installments;

  if (overdue != null && overdue > 0) {
    items.push({
      id: 'finance-overdue',
      label: t('admin.executive.financeOverdueAlert'),
      href: '/admin/finance/installments?status=overdue',
      icon: '💰',
      tone: 'amber',
    });
  }

  if (overdueCount != null && overdueCount > 0) {
    items.push({
      id: 'finance-overdue-count',
      label: t('admin.executive.financeOverdueInstallments', { count: overdueCount }),
      href: '/admin/finance/installments?status=overdue',
      icon: '📆',
      tone: 'amber',
    });
  }

  const followup =
    overview.followup_students ?? overview.students_needing_followup ?? [];
  if (followup.length > 0) {
    items.push({
      id: 'finance-followup',
      label: t('admin.executive.financeFollowupCount', { count: followup.length }),
      href: '/admin/finance/billing-accounts',
      icon: '📞',
      tone: 'amber',
    });
  }

  return items;
}

function buildAdmissionsInterventions(
  data: AdmissionsDashboard | null,
  t: (k: string, p?: Record<string, string | number>) => string,
): AdminActionItem[] {
  if (!data) return [];
  const items: AdminActionItem[] = [];

  if ((data.overdue_next_actions ?? 0) > 0) {
    items.push({
      id: 'admissions-overdue',
      label: t('admin.executive.admissionsOverdueActions', {
        count: data.overdue_next_actions,
      }),
      href: '/admin/admissions',
      icon: '📝',
      tone: 'amber',
    });
  }

  if ((data.new_count ?? 0) > 0) {
    items.push({
      id: 'admissions-new',
      label: t('admin.executive.admissionsNewPending', { count: data.new_count }),
      href: '/admin/admissions?state=new',
      icon: '✨',
      tone: 'amber',
    });
  }

  if ((data.under_review_count ?? 0) > 0) {
    items.push({
      id: 'admissions-review',
      label: t('admin.executive.admissionsUnderReview', {
        count: data.under_review_count,
      }),
      href: '/admin/admissions?state=under_review',
      icon: '🔍',
    });
  }

  return items;
}

function ExecutiveDirectorView({
  data: d,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const t = useT();
  const { formatDate, formatDateTime } = useFormat();
  const { schools, activeSchoolId } = useAdminSession();

  const today = todayIso();
  const att = d.attendance_today;
  const pct = attendancePercent(att);
  const totalRecorded = att?.total_recorded ?? att?.total ?? 0;
  const hasAttendance = totalRecorded > 0;

  const variant = resolveDashboardVariant(user);
  const widgets = resolveDashboardWidgets(user);
  const hideSchoolWideKpis = variant.hideSchoolWideKpis;
  const scopedMode = variant.scopedMode;

  const activeRef = schools.find((s) => s.id === activeSchoolId) ?? user.school ?? null;
  const schoolName = formatSchoolLabel(activeRef, t);

  const financeState = useAdminResource<AdminFinanceOverview>(
    widgets.financeSummary ? endpoints.admin.financeOverview : null,
  );
  const admissionsState = useAdminResource<AdmissionsDashboard>(
    widgets.admissionsSummary ? endpoints.admin.admissionsDashboard : null,
  );
  const financeRef = useFinanceReferenceData();

  const activeYearLabel = useMemo(() => {
    const years = financeRef.academicYears;
    const current = years.find((y) => y.is_current);
    if (current?.name) return current.name;
    if (years.length === 1) return years[0]?.name ?? null;
    return null;
  }, [financeRef.academicYears]);

  const dashboardItems = useMemo(() => buildDashboardActionItems(d, t), [d, t]);
  const dataQualityItems = useMemo(() => buildDataQualityItems(d, t), [d, t]);
  const financeItems = useMemo(
    () => buildFinanceInterventions(financeState.data, t),
    [financeState.data, t],
  );
  const admissionsItems = useMemo(
    () => buildAdmissionsInterventions(admissionsState.data, t),
    [admissionsState.data, t],
  );

  const allInterventionItems = useMemo(
    () => [...dashboardItems, ...financeItems, ...admissionsItems],
    [dashboardItems, financeItems, admissionsItems],
  );

  const hasDataQualityIssues = dataQualityItems.length > 0;
  const hasInterventionIssues = allInterventionItems.length > 0 || hasDataQualityIssues;
  const hasClickableInterventions =
    allInterventionItems.some((item) => !!item.href) || hasDataQualityIssues;

  const interventionDescription = hideSchoolWideKpis
    ? hasClickableInterventions
      ? t('admin.executive.interventionDescScoped')
      : t('admin.executive.interventionDescNeutralScoped')
    : hasClickableInterventions
      ? t('admin.executive.interventionDesc')
      : t('admin.executive.interventionDescNeutral');

  const financeTotals = pickFinanceTotals(financeState.data);
  const admissions = admissionsState.data;

  const partialDataWarnings: string[] = [];
  if (widgets.financeSummary && financeState.error && !financeState.loading) {
    partialDataWarnings.push(t('admin.executive.partialFinance'));
  }
  if (widgets.admissionsSummary && admissionsState.error && !admissionsState.loading) {
    partialDataWarnings.push(t('admin.executive.partialAdmissions'));
  }
  if (widgets.financeSummary && !financeRef.loading && !activeYearLabel) {
    partialDataWarnings.push(t('admin.executive.academicYearUnavailable'));
  }

  const criticalCount = allInterventionItems.filter((i) => i.tone === 'amber').length;

  const quickActions = useMemo(() => {
    const catalog: Record<AdminQuickActionId, { href: string; icon: string; label: string }> = {
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

  const staffLinks = useMemo(() => {
    const links: { href: string; label: string; icon: string }[] = [];
    if (canAccessStaffCenter(user)) {
      links.push({ href: '/admin/staff', label: t('nav.staffCenter'), icon: '👥' });
    }
    if (hasPermission(user, 'view_teachers')) {
      links.push({ href: '/admin/teachers', label: t('nav.teachers'), icon: '👩‍🏫' });
    }
    if (canViewSettings(user) || canViewSchoolBrandingSettings(user)) {
      links.push({ href: '/admin/settings', label: t('admin.settings.title'), icon: '⚙️' });
    }
    return links;
  }, [user, t]);

  const kpiCards = useMemo(() => {
    type KpiCard = {
      id: string;
      label: string;
      value: ReactNode;
      hint?: string;
      tone?: ExecutiveTone;
      badge?: string;
      empty?: boolean;
      href?: string;
    };
    const cards: KpiCard[] = [];

    if (widgets.schoolStructureStudents && !hideSchoolWideKpis) {
      cards.push({
        id: 'students',
        label: t('admin.executive.kpiActiveStudents'),
        value: d.total_students ?? '—',
        tone: 'blue',
        href: '/admin/students',
      });
    }

    if (widgets.admissionsSummary) {
      if (admissionsState.loading) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: '…',
          hint: t('common.loading'),
        });
      } else if (admissions) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: admissions.total_open ?? 0,
          hint: t('admin.executive.kpiAdmissionsHint', {
            new: admissions.new_count ?? 0,
          }),
          tone: (admissions.overdue_next_actions ?? 0) > 0 ? 'amber' : 'blue',
          href: '/admin/admissions',
        });
      } else {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: '—',
          hint: t('admin.executive.dataUnavailable'),
          empty: true,
        });
      }
    }

    if (widgets.financeSummary) {
      const collected =
        financeTotals?.period_collections_amount ??
        financeTotals?.collections_amount ??
        financeTotals?.total_collected_period ??
        financeTotals?.total_collected;
      if (financeState.loading) {
        cards.push({
          id: 'collected',
          label: t('admin.executive.kpiCollected'),
          value: '…',
          hint: t('common.loading'),
        });
      } else if (collected != null) {
        cards.push({
          id: 'collected',
          label: t('admin.executive.kpiCollected'),
          value: <FinanceMoney amount={collected} currency={financeTotals?.currency} />,
          href: '/admin/finance/collections',
        });
      } else {
        cards.push({
          id: 'collected',
          label: t('admin.executive.kpiCollected'),
          value: '—',
          hint: t('admin.executive.financePendingActivation'),
          empty: true,
        });
      }

      const overdue = financeTotals?.total_overdue ?? financeTotals?.overdue_amount;
      if (!financeState.loading) {
        cards.push({
          id: 'overdue',
          label: t('admin.executive.kpiOverdue'),
          value:
            overdue != null ? (
              <FinanceMoney amount={overdue} currency={financeTotals?.currency} />
            ) : (
              '—'
            ),
          tone: overdue != null && overdue > 0 ? 'red' : undefined,
          hint: overdue == null ? t('admin.executive.financePendingActivation') : undefined,
          href: overdue != null && overdue > 0 ? '/admin/finance/installments?status=overdue' : '/admin/finance',
        });
      }
    }

    if (widgets.heroAttendance) {
      cards.push({
        id: 'attendance',
        label: t('admin.executive.kpiAttendance'),
        value: hasAttendance && pct != null ? `${pct}%` : '—',
        hint: hasAttendance
          ? t('admin.executive.kpiAttendanceHint', { recorded: totalRecorded })
          : t('admin.cmd.attendanceUnavailable'),
        tone:
          pct != null && pct < 75 ? 'amber' : pct != null && pct >= 90 ? 'green' : 'blue',
        href: '/admin/attendance?date=today',
      });
    }

    cards.push({
      id: 'alerts',
      label: t('admin.executive.kpiAlerts'),
      value: criticalCount,
      tone: criticalCount > 0 ? 'amber' : 'green',
      badge:
        criticalCount > 0
          ? t('admin.executive.kpiAlertsActive')
          : t('admin.executive.kpiAlertsClear'),
      hint: t('admin.executive.kpiAlertsHint'),
    });

    return cards.slice(0, 6);
  }, [
    widgets,
    hideSchoolWideKpis,
    d.total_students,
    admissionsState.loading,
    admissions,
    financeState.loading,
    financeTotals,
    hasAttendance,
    pct,
    totalRecorded,
    criticalCount,
    t,
  ]);

  const updatedLabel = financeState.loading || admissionsState.loading
    ? t('admin.executive.dataRefreshing')
    : t('admin.executive.dataUpdated', { time: formatDateTime(new Date().toISOString()) });

  return (
    <div className="admin-executive-dashboard">
      <header className="exec-hero">
        <div className="exec-hero__glow" aria-hidden="true" />
        <div className="exec-hero__grid">
          <div className="exec-hero__intro">
            <span className="exec-hero__eyebrow">{t('admin.executive.eyebrow')}</span>
            <h1 className="exec-hero__title">{t('admin.executive.title')}</h1>
            <p className="exec-hero__subtitle">
              {scopedMode ? t('admin.executive.subtitleScoped') : t('admin.executive.subtitle')}
            </p>
          </div>
          <dl className="exec-hero__meta">
            <div className="exec-hero__chip">
              <dt>{t('admin.executive.metaSchool')}</dt>
              <dd dir="auto">{schoolName}</dd>
            </div>
            <div className="exec-hero__chip">
              <dt>{t('admin.executive.metaYear')}</dt>
              <dd>
                {widgets.financeSummary && financeRef.loading
                  ? t('common.loading')
                  : activeYearLabel ?? t('admin.executive.academicYearUnavailableShort')}
              </dd>
            </div>
            <div className="exec-hero__chip">
              <dt>{t('admin.executive.metaToday')}</dt>
              <dd>{formatDate(today)}</dd>
            </div>
            <div className="exec-hero__chip exec-hero__chip--status">
              <dt>{t('admin.executive.metaUpdated')}</dt>
              <dd>
                <span
                  className={cn(
                    'exec-hero__pulse',
                    (financeState.loading || admissionsState.loading) && 'exec-hero__pulse--live',
                  )}
                  aria-hidden="true"
                />
                {updatedLabel}
              </dd>
            </div>
          </dl>
        </div>
      </header>

      {partialDataWarnings.length > 0 && (
        <div className="exec-notice" role="status">
          <span className="exec-notice__icon" aria-hidden="true">
            ◦
          </span>
          <div>
            <strong>{t('admin.executive.partialDataTitle')}</strong>
            <p>{partialDataWarnings.join(' · ')}</p>
          </div>
        </div>
      )}

      <section className="exec-kpi-zone" aria-label={t('admin.executive.kpiSectionTitle')}>
        <ExecutiveZoneLabel>{t('admin.executive.kpiSectionTitle')}</ExecutiveZoneLabel>
        <div className="exec-kpi-grid">
          {kpiCards.map((card) => (
            <ExecutiveKpiCard
              key={card.id}
              label={card.label}
              value={card.value}
              hint={card.hint}
              badge={card.badge}
              tone={card.tone ?? 'neutral'}
              href={card.href}
              empty={card.empty}
            />
          ))}
        </div>
      </section>

      <div className="exec-layout">
        <div className="exec-layout__main">
          <ExecutivePanel
            variant="attention"
            title={t('admin.executive.interventionTitle')}
            description={interventionDescription}
            icon="◎"
            className={cn(
              'exec-decision-panel',
              hasInterventionIssues ? 'exec-decision-panel--active' : 'exec-decision-panel--clear',
            )}
            footer={
              hasInterventionIssues ? (
                <span className="exec-decision-panel__count">
                  {t('admin.executive.interventionCount', { count: allInterventionItems.length })}
                </span>
              ) : null
            }
          >
            <p className="exec-decision-panel__lead">{t('admin.executive.interventionLead')}</p>
            <ExecutiveDecisionList
              items={allInterventionItems}
              emptyTitle={t('admin.executive.noInterventions')}
              emptyDescription={t('admin.executive.noInterventionsDesc')}
            />

            {widgets.dataQuality && (
              <div className="exec-decision-panel__dq">
                <p className="exec-decision-panel__sub">{t('admin.cmd.dataQualitySectionLabel')}</p>
                {hasDataQualityIssues ? (
                  <ExecutiveDecisionList items={dataQualityItems} emptyTitle="" />
                ) : (
                  <ExecutiveEmpty
                    icon="✓"
                    title={t('admin.cmd.noDataQualityIssuesFromDashboard')}
                  />
                )}
                <Link href="/admin/students" className="exec-panel-link">
                  {t('admin.cmd.openStudentsList')} →
                </Link>
              </div>
            )}
          </ExecutivePanel>

          <div className="exec-insights-grid">
            {widgets.financeSummary && (
              <ExecutivePanel
                title={t('admin.executive.financeTitle')}
                description={t('admin.executive.financeDesc')}
                icon="◈"
                footer={
                  <Link href="/admin/finance" className="exec-panel-link">
                    {t('admin.executive.openFinance')} →
                  </Link>
                }
              >
                {financeState.loading ? (
                  <ExecutiveEmpty icon="…" title={t('common.loading')} />
                ) : financeState.error ? (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.financeUnavailable')}
                  />
                ) : financeTotals ? (
                  <div className="exec-metric-grid">
                    {[
                      {
                        key: 'collected',
                        label: t('admin.executive.financeCollected'),
                        value: financeTotals.total_collected ?? financeTotals.confirmed_paid,
                      },
                      {
                        key: 'remaining',
                        label: t('admin.executive.financeRemaining'),
                        value: financeTotals.total_remaining ?? financeTotals.remaining_amount,
                      },
                      {
                        key: 'overdue',
                        label: t('admin.executive.financeOverdue'),
                        value: financeTotals.total_overdue ?? financeTotals.overdue_amount,
                        warn: true,
                      },
                    ].map((m) => {
                      const raw = normalizeMoneyValue(m.value);
                      return (
                        <ExecutiveMetricTile
                          key={m.key}
                          label={m.label}
                          warn={!!(m.warn && raw != null && raw > 0)}
                          value={
                            raw != null ? (
                              <FinanceMoney amount={raw} currency={financeTotals.currency} />
                            ) : (
                              t('common.dash')
                            )
                          }
                        />
                      );
                    })}
                  </div>
                ) : (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.financeEmpty')}
                    description={t('admin.executive.financePendingActivation')}
                  />
                )}
                <ExecutiveLinkRow>
                  <Link href="/admin/finance/collections">{t('admin.executive.linkCollections')}</Link>
                  <Link href="/admin/finance/receipts">{t('admin.executive.linkReceipts')}</Link>
                  <Link href="/admin/finance/installments?status=overdue">
                    {t('admin.executive.linkOverdue')}
                  </Link>
                </ExecutiveLinkRow>
              </ExecutivePanel>
            )}

            {widgets.admissionsSummary && (
              <ExecutivePanel
                title={t('admin.executive.admissionsTitle')}
                description={t('admin.executive.admissionsDesc')}
                icon="✦"
                footer={
                  <Link href="/admin/admissions" className="exec-panel-link">
                    {t('admin.executive.openAdmissions')} →
                  </Link>
                }
              >
                {admissionsState.loading ? (
                  <ExecutiveEmpty icon="…" title={t('common.loading')} />
                ) : admissionsState.error ? (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.admissionsUnavailable')}
                  />
                ) : admissions ? (
                  <div className="exec-adm-grid">
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.new_count')}
                      value={admissions.new_count ?? 0}
                      tone="blue"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.under_review_count')}
                      value={admissions.under_review_count ?? 0}
                      tone="amber"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.accepted_count')}
                      value={admissions.accepted_count ?? 0}
                      tone="green"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.overdue_next_actions')}
                      value={admissions.overdue_next_actions ?? 0}
                      tone="red"
                    />
                  </div>
                ) : (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.admissionsEmpty')}
                  />
                )}
              </ExecutivePanel>
            )}
          </div>
        </div>

        <aside className="exec-layout__aside">
          {widgets.attendanceOperations && (
            <ExecutivePanel
              title={t('admin.executive.dailyOpsTitle')}
              description={t('admin.executive.dailyOpsDesc')}
              icon="◷"
              variant="accent"
              footer={
                <Link href="/admin/attendance?date=today" className="exec-panel-link">
                  {t('common.viewAll')} →
                </Link>
              }
            >
              {hasAttendance ? (
                <>
                  <div className="exec-attendance-highlight">
                    {pct != null && (
                      <span className="exec-attendance-highlight__pct">{pct}%</span>
                    )}
                    <span className="exec-attendance-highlight__label">
                      {t('admin.executive.kpiAttendance')}
                    </span>
                  </div>
                  <div className="exec-attendance-grid">
                    {ATT_KEYS.map((k) => (
                      <div key={k} className={cn('exec-attendance-cell', `exec-attendance-cell--${ATT_TONE[k]}`)}>
                        <strong>{att?.[k] ?? 0}</strong>
                        <span>{t(`attendance.${k === 'left_early' ? 'leftEarly' : k}`)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="exec-attendance-foot">
                    {t('admin.totalRecorded')}: <strong>{totalRecorded}</strong>
                  </p>
                </>
              ) : (
                <ExecutiveEmpty
                  icon="◌"
                  title={t('admin.cmd.attendanceUnavailable')}
                />
              )}
              <ExecutiveLinkRow>
                <Link href="/admin/attendance?date=today">{t('nav.attendance')}</Link>
                {hasPermission(user, 'view_timetable') && (
                  <Link href="/admin/timetable">{t('nav.timetable')}</Link>
                )}
                {hasPermission(user, 'view_classes') && (
                  <Link href="/admin/classes">{t('nav.classes')}</Link>
                )}
              </ExecutiveLinkRow>
            </ExecutivePanel>
          )}

          {widgets.staffSummary && (
            <ExecutivePanel
              title={t('admin.executive.staffTitle')}
              description={t('admin.executive.staffDesc')}
              icon="◉"
            >
              <div className="exec-staff-grid">
                {widgets.schoolStructureTeachers && (
                  <Link href="/admin/teachers" className="exec-staff-stat">
                    <span className="exec-staff-stat__icon" aria-hidden="true">
                      👩‍🏫
                    </span>
                    <strong>{d.total_teachers ?? '—'}</strong>
                    <span>{t('nav.teachers')}</span>
                  </Link>
                )}
                {!hideSchoolWideKpis && (
                  <Link href="/admin/parents" className="exec-staff-stat">
                    <span className="exec-staff-stat__icon" aria-hidden="true">
                      👪
                    </span>
                    <strong>{d.total_parents ?? '—'}</strong>
                    <span>{t('nav.parents')}</span>
                  </Link>
                )}
              </div>
              {staffLinks.length > 0 ? (
                <ExecutiveLinkRow>
                  {staffLinks.map((link) => (
                    <Link key={link.href} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </ExecutiveLinkRow>
              ) : (
                <ExecutiveEmpty icon="◌" title={t('admin.executive.staffNoLinks')} />
              )}
            </ExecutivePanel>
          )}

          {widgets.schoolStructure && (
            <ExecutivePanel title={t('admin.cmd.schoolStructureTitle')} icon="▦">
              <div className="exec-staff-grid">
                {widgets.schoolStructureStudents && (
                  <Link href="/admin/students" className="exec-staff-stat">
                    <span className="exec-staff-stat__icon" aria-hidden="true">
                      🎓
                    </span>
                    <strong>{d.total_students ?? '—'}</strong>
                    <span>{t('nav.students')}</span>
                  </Link>
                )}
                {widgets.schoolStructureClasses && (
                  <Link href="/admin/classes" className="exec-staff-stat">
                    <span className="exec-staff-stat__icon" aria-hidden="true">
                      🏫
                    </span>
                    <strong>{d.total_classes ?? '—'}</strong>
                    <span>{t('nav.classes')}</span>
                  </Link>
                )}
              </div>
            </ExecutivePanel>
          )}

          {quickActions.length > 0 && (
            <ExecutivePanel title={t('admin.cmd.quickOpsTitle')} icon="⚡">
              <div className="exec-quick-grid">
                {quickActions.map((a) => (
                  <AdminQuickAction key={a.id} href={a.href} icon={a.icon} label={a.label} />
                ))}
              </div>
            </ExecutivePanel>
          )}
        </aside>
      </div>
    </div>
  );
}

export function AdminExecutiveDashboard({
  data,
  user,
}: {
  data: AdminDashboard;
  user: CurrentUser;
}) {
  const widgets = resolveDashboardWidgets(user);

  if (!widgets.executiveLayout) {
    return <AdminCommandDashboard data={data} user={user} />;
  }

  return <ExecutiveDirectorView data={data} user={user} />;
}
