'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { useFormat } from '@/features/i18n/use-format';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { ExecutiveKpiMoney } from '@/features/admin/dashboard/executive-dashboard-ui';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  resolveExecutiveAttendanceKpi,
  resolveLegacyAttendanceKpi,
} from '@/features/admin/dashboard/executive-kpi-utils';
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
  buildExecutiveDataQualityItems,
  isExecutiveAttendanceExpected,
  mergeExecutiveInterventions,
  normalizeExecutiveDashboard,
} from '@/lib/admin/executive-dashboard-contract';
import {
  isExecutiveDashboardFailed,
  isExecutiveDashboardPending,
  shouldIncludeLegacyImportantAlerts,
} from '@/lib/admin/executive-dashboard';
import {
  ATT_KEYS,
  buildDashboardActionItems,
  buildDataQualityItems,
  todayIso,
} from '@/features/admin/dashboard/dashboard-interventions';
import type { AdminDashboard } from '@/types/dashboard';
import type { AdmissionsDashboard } from '@/types/admission';
import {
  resolveApplicationStatusCount,
  resolveNewAdmissionsCount,
  resolveOpenAdmissionsCount,
} from '@/features/admin/admissions/utils/admissions-dashboard-cards';
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
  const { locale } = useLocale();
  const { formatDate, formatDateTime } = useFormat();
  const { schools, activeSchoolId } = useAdminSession();

  const today = todayIso();
  const att = d.attendance_today;
  const totalRecorded = att?.total_recorded ?? att?.total ?? 0;

  const variant = resolveDashboardVariant(user);
  const widgets = resolveDashboardWidgets(user);
  const hideSchoolWideKpis = variant.hideSchoolWideKpis;
  const scopedMode = variant.scopedMode;

  const activeRef = schools.find((s) => s.id === activeSchoolId) ?? user.school ?? null;
  const schoolName = formatSchoolLabel(activeRef, t);

  const executiveState = useAdminResource<unknown>(endpoints.admin.executiveDashboard);
  const executive = useMemo(
    () =>
      executiveState.data != null ? normalizeExecutiveDashboard(executiveState.data, locale) : null,
    [executiveState.data, locale],
  );
  const executiveAvailable = executiveState.data != null && executive != null;
  const executiveFailed = isExecutiveDashboardFailed(executiveState);
  const executivePending = isExecutiveDashboardPending(executiveState);
  const includeLegacyImportantAlerts = shouldIncludeLegacyImportantAlerts({
    executiveLayout: widgets.executiveLayout,
    executivePending,
    executiveAvailable,
  });

  const financeState = useAdminResource<AdminFinanceOverview>(
    widgets.financeSummary && executiveFailed ? endpoints.admin.financeOverview : null,
  );
  /** Prefer Admissions dashboard with hide_registered so open/new match Admissions page. */
  const admissionsOpenScopeQuery = useMemo(() => ({ hide_registered: 1 }), []);
  const admissionsState = useAdminResource<AdmissionsDashboard>(
    widgets.admissionsSummary ? endpoints.admin.admissionsDashboard : null,
    admissionsOpenScopeQuery,
  );
  const financeRef = useFinanceReferenceData();

  const activeYearLabel = useMemo(() => {
    if (executiveAvailable && executive?.active_academic_year?.name) {
      return executive.active_academic_year.name;
    }
    if (executiveAvailable) return null;
    const years = financeRef.academicYears;
    const current = years.find((y) => y.is_current);
    if (current?.name) return current.name;
    if (years.length === 1) return years[0]?.name ?? null;
    return null;
  }, [executiveAvailable, executive?.active_academic_year?.name, financeRef.academicYears]);

  const executiveFinance = executiveAvailable ? executive?.finance_summary ?? null : null;
  const admissionsDashboardCounts = admissionsState.data;
  const openAdmissionsCount = resolveOpenAdmissionsCount(admissionsDashboardCounts);
  const newAdmissionsCount = resolveNewAdmissionsCount(admissionsDashboardCounts);
  const executiveAdmissions = executiveAvailable ? executive?.admissions_summary ?? null : null;
  const attendanceGaps = executiveAvailable ? executive?.attendance_gaps ?? null : null;
  const attendanceExpected = isExecutiveAttendanceExpected(executive);
  const showAttendanceOperations = widgets.attendanceOperations && attendanceExpected;

  const dashboardItems = useMemo(
    () =>
      buildDashboardActionItems(d, t, locale, {
        includeImportantAlerts: includeLegacyImportantAlerts,
      }),
    [d, t, locale, includeLegacyImportantAlerts],
  );

  const dataQualityItems = useMemo(() => {
    if (executivePending) {
      return [];
    }
    if (executiveAvailable && executive) {
      return buildExecutiveDataQualityItems(executive, t, locale);
    }
    return buildDataQualityItems(d, t, locale);
  }, [d, t, locale, executivePending, executiveAvailable, executive]);

  const financeItems = useMemo(
    () => (executiveAvailable ? [] : buildFinanceInterventions(financeState.data, t)),
    [executiveAvailable, financeState.data, t],
  );
  const admissionsItems = useMemo(
    () => (executiveAvailable ? [] : buildAdmissionsInterventions(admissionsState.data, t)),
    [executiveAvailable, admissionsState.data, t],
  );

  const allInterventionItems = useMemo(() => {
    if (executivePending) {
      return [];
    }
    if (executiveAvailable && executive) {
      const seen = new Set<string>();
      const merged: AdminActionItem[] = [];
      for (const item of [...mergeExecutiveInterventions(executive, t, locale), ...dashboardItems]) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        merged.push(item);
      }
      return merged;
    }
    return [...dashboardItems, ...financeItems, ...admissionsItems];
  }, [
    executivePending,
    executiveAvailable,
    executive,
    dashboardItems,
    financeItems,
    admissionsItems,
    t,
  ]);

  const hasDataQualityIssues = !executivePending && dataQualityItems.length > 0;
  const hasInterventionIssues =
    !executivePending && (allInterventionItems.length > 0 || hasDataQualityIssues);
  const hasClickableInterventions =
    allInterventionItems.some((item) => !!item.href) || hasDataQualityIssues;

  const interventionDescription = hideSchoolWideKpis
    ? hasClickableInterventions
      ? t('admin.executive.interventionDescScoped')
      : t('admin.executive.interventionDescNeutralScoped')
    : hasClickableInterventions
      ? t('admin.executive.interventionDesc')
      : t('admin.executive.interventionDescNeutral');

  const financeTotals = executiveFinance
    ? null
    : pickFinanceTotals(financeState.data);
  const legacyAdmissions = admissionsDashboardCounts;

  const useLegacyAttendance = !executiveAvailable || attendanceGaps == null;
  const attendanceKpi = useLegacyAttendance
    ? resolveLegacyAttendanceKpi(att)
    : resolveExecutiveAttendanceKpi(attendanceGaps);
  const showAttendance = attendanceKpi.state !== 'unavailable';
  const attendancePct = attendanceKpi.rate;

  const partialDataWarnings: string[] = [];
  if (executiveFailed) {
    partialDataWarnings.push(t('admin.executive.partialExecutive'));
  }
  if (widgets.financeSummary && executiveFailed && financeState.error && !financeState.loading) {
    partialDataWarnings.push(t('admin.executive.partialFinance'));
  }
  if (
    widgets.admissionsSummary &&
    executiveFailed &&
    admissionsState.error &&
    !admissionsState.loading
  ) {
    partialDataWarnings.push(t('admin.executive.partialAdmissions'));
  }
  if (
    !executiveAvailable &&
    widgets.financeSummary &&
    executiveFailed &&
    !financeRef.loading &&
    !activeYearLabel
  ) {
    partialDataWarnings.push(t('admin.executive.academicYearUnavailable'));
  }
  if (executiveAvailable && !executive?.active_academic_year?.name) {
    partialDataWarnings.push(t('admin.executive.academicYearUnavailable'));
  }

  const interventionCount = allInterventionItems.length;

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
      badgeTone?: 'green' | 'amber' | 'slate';
      empty?: boolean;
      href?: string;
    };
    const cards: KpiCard[] = [];

    if (widgets.schoolStructureStudents && !hideSchoolWideKpis) {
      cards.push({
        id: 'students',
        label: t('admin.executive.kpiActiveStudents'),
        value: d.total_students ?? '—',
        hint: activeYearLabel
          ? t('admin.executive.kpiActiveStudentsHint', { year: activeYearLabel })
          : t('admin.executive.kpiActiveStudentsHintDefault'),
        tone: 'blue',
        href: '/admin/students',
      });
    }

    if (widgets.admissionsSummary) {
      const admissionsLoading =
        admissionsState.loading ||
        executivePending ||
        (executiveAvailable
          ? executiveState.loading && !admissionsDashboardCounts && !executiveAdmissions
          : false);
      const openCount = openAdmissionsCount;
      const newCount = newAdmissionsCount;

      if (admissionsLoading && openCount == null && !executiveAdmissions) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: '…',
          hint: t('common.loading'),
        });
      } else if (openCount != null) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: openCount,
          hint: t('admin.executive.kpiAdmissionsHint', {
            new: newCount ?? 0,
          }),
          tone: 'indigo',
          href: '/admin/admissions',
        });
      } else if (executiveAdmissions) {
        // Last-resort fallback only when admissions dashboard is unavailable.
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: executiveAdmissions.open,
          hint: t('admin.executive.kpiAdmissionsHint', { new: executiveAdmissions.new }),
          tone: 'indigo',
          href: '/admin/admissions',
        });
      } else if (executivePending) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: '…',
          hint: t('common.loading'),
        });
      } else if (executiveAvailable) {
        cards.push({
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: '—',
          hint: t('admin.executive.admissionsUnavailable'),
          empty: true,
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
      const financeDetailPanelVisible = widgets.financeSummary;
      const financeLoading =
        executivePending ||
        (executiveAvailable
          ? executiveState.loading && executiveFinance == null && !executiveFailed
          : financeState.loading);

      if (financeLoading) {
        cards.push({
          id: 'collected',
          label: t('admin.executive.kpiCollected'),
          value: '…',
          hint: t('common.loading'),
        });
      } else if (executiveFinance) {
        if (!financeDetailPanelVisible) {
          cards.push({
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: (
              <ExecutiveKpiMoney
                amount={executiveFinance.collected_month}
                currency={executiveFinance.currency}
              />
            ),
            hint: t('admin.executive.kpiCollectedHint'),
            tone: 'green',
            href: '/admin/finance/collections',
          });
        }
        cards.push({
          id: 'overdue',
          label: t('admin.executive.kpiOverdue'),
          value: (
            <ExecutiveKpiMoney
              amount={executiveFinance.overdue}
              currency={executiveFinance.currency}
            />
          ),
          hint:
            executiveFinance.families_overdue_count > 0
              ? t('admin.executive.kpiOverdueHint', {
                  count: executiveFinance.families_overdue_count,
                })
              : t('admin.executive.kpiOverdueHintDefault'),
          tone: executiveFinance.overdue > 0 ? 'red' : 'neutral',
          href:
            executiveFinance.overdue > 0
              ? '/admin/finance/installments?status=overdue'
              : '/admin/finance',
        });
      } else if (financeTotals) {
        const collected =
          financeTotals.period_collections_amount ??
          financeTotals.collections_amount ??
          financeTotals.total_collected_period ??
          financeTotals.total_collected;
        if (!financeDetailPanelVisible && collected != null) {
          cards.push({
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: <ExecutiveKpiMoney amount={collected} currency={financeTotals.currency} />,
            hint: t('admin.executive.kpiCollectedHint'),
            tone: 'green',
            href: '/admin/finance/collections',
          });
        } else if (!financeDetailPanelVisible) {
          cards.push({
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: '—',
            hint: t('admin.executive.financePendingActivation'),
            empty: true,
          });
        }

        const overdue = financeTotals.total_overdue ?? financeTotals.overdue_amount;
        cards.push({
          id: 'overdue',
          label: t('admin.executive.kpiOverdue'),
          value:
            overdue != null ? (
              <ExecutiveKpiMoney amount={overdue} currency={financeTotals?.currency} />
            ) : (
              '—'
            ),
          tone: overdue != null && overdue > 0 ? 'red' : undefined,
          hint:
            overdue == null
              ? t('admin.executive.financePendingActivation')
              : t('admin.executive.kpiOverdueHintDefault'),
          href: overdue != null && overdue > 0 ? '/admin/finance/installments?status=overdue' : '/admin/finance',
        });
      } else if (executiveAvailable) {
        if (!financeDetailPanelVisible) {
          cards.push({
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: '—',
            hint: t('admin.executive.financeUnavailable'),
            empty: true,
          });
        }
        cards.push({
          id: 'overdue',
          label: t('admin.executive.kpiOverdue'),
          value: '—',
          hint: t('admin.executive.financeUnavailable'),
          empty: true,
        });
      } else {
        if (!financeDetailPanelVisible) {
          cards.push({
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: '—',
            hint: t('admin.executive.financePendingActivation'),
            empty: true,
          });
        }
      }
    }

    if (widgets.heroAttendance && attendanceExpected) {
      cards.push({
        id: 'attendance',
        label: t('admin.executive.kpiAttendance'),
        value: attendanceKpi.displayValue,
        hint:
          attendanceKpi.state === 'unavailable'
            ? t('admin.executive.kpiAttendanceUnavailable')
            : attendanceKpi.state === 'partial' && !useLegacyAttendance
              ? t('admin.executive.kpiAttendanceExecutiveHint', {
                  absent: attendanceGaps?.absent_today_count ?? 0,
                  late: attendanceGaps?.late_today_count ?? 0,
                })
              : useLegacyAttendance
                ? t('admin.executive.kpiAttendanceHint', { recorded: totalRecorded })
                : t('admin.executive.kpiAttendanceExecutiveHint', {
                    absent: attendanceGaps?.absent_today_count ?? 0,
                    late: attendanceGaps?.late_today_count ?? 0,
                  }),
        tone: attendanceKpi.tone,
        empty: attendanceKpi.state === 'unavailable',
        href: attendanceKpi.state === 'unavailable' ? undefined : '/admin/attendance?date=today',
      });
    }

    cards.push({
      id: 'alerts',
      label: t('admin.executive.kpiIntervention'),
      value: executivePending ? '…' : interventionCount,
      tone: executivePending ? 'neutral' : interventionCount > 0 ? 'amber' : 'green',
      badge: executivePending
        ? t('common.loading')
        : interventionCount > 0
          ? t('admin.executive.kpiInterventionActive')
          : t('admin.executive.kpiInterventionClear'),
      badgeTone: executivePending ? 'slate' : interventionCount > 0 ? 'amber' : 'green',
      hint: executivePending ? t('common.loading') : t('admin.executive.kpiInterventionHint'),
    });

    return cards.slice(0, 6);
  }, [
    widgets,
    hideSchoolWideKpis,
    d.total_students,
    executivePending,
    executiveAvailable,
    executiveState.loading,
    executiveAdmissions,
    executiveFinance,
    executiveFailed,
    admissionsState.loading,
    admissionsDashboardCounts,
    openAdmissionsCount,
    newAdmissionsCount,
    legacyAdmissions,
    financeState.loading,
    financeTotals,
    activeYearLabel,
    attendanceExpected,
    useLegacyAttendance,
    attendanceKpi,
    attendanceGaps,
    totalRecorded,
    interventionCount,
    t,
  ]);

  const isRefreshing =
    executiveState.loading ||
    (executiveFailed && (financeState.loading || admissionsState.loading));

  const updatedLabel = isRefreshing
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
                {executiveState.loading && !activeYearLabel
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
                    (isRefreshing) && 'exec-hero__pulse--live',
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
              badgeTone={card.badgeTone}
              tone={card.tone ?? 'neutral'}
              href={card.href}
              empty={card.empty}
            />
          ))}
        </div>
      </section>

      <div className={cn('exec-layout', !showAttendanceOperations && 'exec-layout--without-attendance')}>
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
            {executivePending ? (
              <ExecutiveEmpty icon="…" title={t('common.loading')} />
            ) : (
              <ExecutiveDecisionList
                items={allInterventionItems}
                emptyTitle={t('admin.executive.noInterventions')}
                emptyDescription={t('admin.executive.noInterventionsDesc')}
              />
            )}

            {widgets.dataQuality && (
              <div className="exec-decision-panel__dq">
                <p className="exec-decision-panel__sub">{t('admin.cmd.dataQualitySectionLabel')}</p>
                {executivePending ? (
                  <ExecutiveEmpty icon="…" title={t('common.loading')} />
                ) : hasDataQualityIssues ? (
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
                title={t('admin.director.financeTitle')}
                description={
                  executiveFinance
                    ? t('admin.director.financeDesc')
                    : t('admin.executive.financeDesc')
                }
                icon="◈"
                footer={
                  <Link href="/admin/finance" className="exec-panel-link">
                    {t('admin.executive.openFinance')} →
                  </Link>
                }
              >
                {executiveState.loading && executiveFinance == null && !executiveFailed ? (
                  <ExecutiveEmpty icon="…" title={t('common.loading')} />
                ) : executiveFinance ? (
                  <div className="exec-finance-snapshot">
                    <section className="exec-finance-snapshot__group exec-finance-snapshot__group--collections">
                      <span className="exec-finance-snapshot__group-label">
                        {t('admin.director.financeCollectionsGroup')}
                      </span>
                      <div className="exec-finance-snapshot__pair">
                        {[
                          {
                            key: 'collected-today',
                            label: t('admin.director.financeCollectedToday'),
                            value: executiveFinance.collected_today,
                          },
                          {
                            key: 'collected-month',
                            label: t('admin.director.financeCollectedMonth'),
                            value: executiveFinance.collected_month,
                          },
                        ].map((m) => {
                          const raw = normalizeMoneyValue(m.value);
                          return (
                            <ExecutiveMetricTile
                              key={m.key}
                              label={m.label}
                              value={
                                raw != null ? (
                                  <FinanceMoney amount={raw} currency={executiveFinance.currency} />
                                ) : (
                                  t('common.dash')
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    </section>

                    <section className="exec-finance-snapshot__group exec-finance-snapshot__group--position">
                      <span className="exec-finance-snapshot__group-label">
                        {t('admin.director.financePositionGroup')}
                      </span>
                      <div className="exec-finance-snapshot__pair">
                        {[
                          {
                            key: 'remaining',
                            label: t('admin.executive.financeRemaining'),
                            value: executiveFinance.remaining,
                          },
                          {
                            key: 'overdue',
                            label: t('admin.executive.financeOverdue'),
                            value: executiveFinance.overdue,
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
                                  <FinanceMoney amount={raw} currency={executiveFinance.currency} />
                                ) : (
                                  t('common.dash')
                                )
                              }
                            />
                          );
                        })}
                      </div>
                    </section>
                  </div>
                ) : financeState.loading ? (
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
                ) : executiveAvailable ? (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.financeUnavailable')}
                  />
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
                {admissionsState.loading && !legacyAdmissions && !executiveAdmissions ? (
                  <ExecutiveEmpty icon="…" title={t('common.loading')} />
                ) : legacyAdmissions ? (
                  <div className="exec-adm-grid">
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.new_count')}
                      value={resolveNewAdmissionsCount(legacyAdmissions) ?? 0}
                      tone="blue"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.under_review_count')}
                      value={legacyAdmissions.under_review_count ?? 0}
                      tone="amber"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.accepted_count')}
                      value={
                        resolveApplicationStatusCount(legacyAdmissions, 'accepted') ??
                        legacyAdmissions.accepted_count ??
                        0
                      }
                      tone="green"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.overdue_next_actions')}
                      value={legacyAdmissions.overdue_next_actions ?? 0}
                      tone="red"
                    />
                  </div>
                ) : executiveAdmissions ? (
                  <div className="exec-adm-grid">
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.new_count')}
                      value={executiveAdmissions.new}
                      tone="blue"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.under_review_count')}
                      value={executiveAdmissions.in_progress}
                      tone="amber"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.accepted_count')}
                      value={executiveAdmissions.accepted}
                      tone="green"
                    />
                    <ExecutiveAdmissionStat
                      label={t('admin.admissions.dashboard.overdue_next_actions')}
                      value={executiveAdmissions.overdue_actions}
                      tone="red"
                    />
                  </div>
                ) : admissionsState.error ? (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.admissionsUnavailable')}
                  />
                ) : executiveAvailable ? (
                  <ExecutiveEmpty
                    icon="◌"
                    title={t('admin.executive.admissionsUnavailable')}
                  />
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
          {showAttendanceOperations && (
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
              {showAttendance ? (
                <>
                  <div className="exec-attendance-highlight">
                    {attendancePct != null && (
                      <span className="exec-attendance-highlight__pct">
                        {Math.round(attendancePct)}%
                      </span>
                    )}
                    <span className="exec-attendance-highlight__label">
                      {t('admin.executive.kpiAttendance')}
                    </span>
                  </div>
                  {useLegacyAttendance ? (
                    <>
                      <div className="exec-attendance-grid">
                        {ATT_KEYS.map((k) => (
                          <div
                            key={k}
                            className={cn(
                              'exec-attendance-cell',
                              `exec-attendance-cell--${ATT_TONE[k]}`,
                            )}
                          >
                            <strong>{att?.[k] ?? 0}</strong>
                            <span>
                              {t(`attendance.${k === 'left_early' ? 'leftEarly' : k}`)}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="exec-attendance-foot">
                        {t('admin.totalRecorded')}: <strong>{totalRecorded}</strong>
                      </p>
                    </>
                  ) : attendanceGaps ? (
                    <>
                      <div className="exec-attendance-grid exec-attendance-grid--compact">
                        <div className="exec-attendance-cell exec-attendance-cell--red">
                          <strong>{attendanceGaps.absent_today_count}</strong>
                          <span>{t('attendance.absent')}</span>
                        </div>
                        <div className="exec-attendance-cell exec-attendance-cell--amber">
                          <strong>{attendanceGaps.late_today_count}</strong>
                          <span>{t('attendance.late')}</span>
                        </div>
                      </div>
                      {attendanceGaps.classes_without_attendance_count != null &&
                        attendanceGaps.classes_without_attendance_count > 0 && (
                          <p className="exec-attendance-foot">
                            {t('admin.executive.attendanceClassesMissing', {
                              count: attendanceGaps.classes_without_attendance_count,
                            })}
                          </p>
                        )}
                    </>
                  ) : null}
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
