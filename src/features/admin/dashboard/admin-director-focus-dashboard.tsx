'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import { useMemo, type ReactNode } from 'react';
import { useT, useLocale } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { AdminCommandDashboard } from '@/features/admin/command-center/admin-command-dashboard';
import type { AdminActionItem } from '@/features/admin/command-center/primitives';
import {
  ExecutiveDecisionList,
  ExecutiveEmpty,
  ExecutiveKpiCard,
  ExecutiveKpiMoney,
  ExecutivePanel,
  ExecutiveZoneLabel,
  type ExecutiveTone,
} from '@/features/admin/dashboard/executive-dashboard-ui';
import {
  resolveExecutiveAttendanceKpi,
  resolveLegacyAttendanceKpi,
} from '@/features/admin/dashboard/executive-kpi-utils';
import {
  buildDashboardActionItems,
  buildDataQualityItems,
} from '@/features/admin/dashboard/dashboard-interventions';
import {
  buildExecutiveDataQualityItems,
  mergeExecutiveInterventions,
  normalizeExecutiveDashboard,
} from '@/lib/admin/executive-dashboard-contract';
import {
  isExecutiveDashboardFailed,
  isExecutiveDashboardPending,
} from '@/lib/admin/executive-dashboard';
import {
  resolveDashboardVariant,
  resolveDashboardWidgets,
} from '@/lib/admin/dashboard-registry';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
import type { AdminDashboard } from '@/types/dashboard';
import type { CurrentUser } from '@/types/user';
import styles from './admin-director-focus-dashboard.module.css';

type Pulse = {
  id: string;
  label: string;
  value: ReactNode;
  hint?: string;
  tone: ExecutiveTone;
  href?: string;
  badge?: string;
  badgeTone?: 'green' | 'amber' | 'slate';
};

function prioritizeActions(items: AdminActionItem[]): AdminActionItem[] {
  const seen = new Set<string>();
  const unique = items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });

  return unique
    .map((item, index) => ({
      item,
      index,
      score: (item.tone === 'amber' ? 4 : 0) + (item.href ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ item }) => item);
}

function DirectorFocusView({ data: d, user }: { data: AdminDashboard; user: CurrentUser }) {
  const t = useT();
  const { locale } = useLocale();
  const { formatDateTime } = useFormat();
  const widgets = resolveDashboardWidgets(user);
  const variant = resolveDashboardVariant(user);

  const executiveState = useAdminResource<unknown>(endpoints.admin.executiveDashboard);
  const executive = useMemo(
    () =>
      executiveState.data != null ? normalizeExecutiveDashboard(executiveState.data, locale) : null,
    [executiveState.data, locale],
  );
  const executiveAvailable = executiveState.data != null && executive != null;
  const executivePending = isExecutiveDashboardPending(executiveState);
  const executiveFailed = isExecutiveDashboardFailed(executiveState);

  const legacyActions = useMemo(
    () => buildDashboardActionItems(d, t, locale, { includeImportantAlerts: true }),
    [d, t, locale],
  );
  const legacyDataQuality = useMemo(
    () => buildDataQualityItems(d, t, locale),
    [d, t, locale],
  );

  const prioritizedItems = useMemo(() => {
    if (executivePending) return [];

    if (executiveAvailable && executive) {
      return prioritizeActions([
        ...mergeExecutiveInterventions(executive, t, locale),
        ...buildExecutiveDataQualityItems(executive, t, locale),
      ]);
    }

    return prioritizeActions([...legacyActions, ...legacyDataQuality]);
  }, [
    executivePending,
    executiveAvailable,
    executive,
    legacyActions,
    legacyDataQuality,
    t,
    locale,
  ]);

  const spotlight = prioritizedItems[0] ?? null;
  const supportingSignals = prioritizedItems.slice(1, 4);
  const interventionCount = prioritizedItems.length;

  const legacyAttendance = resolveLegacyAttendanceKpi(d.attendance_today);
  const attendanceKpi =
    executiveAvailable && executive?.attendance_gaps
      ? resolveExecutiveAttendanceKpi(executive.attendance_gaps)
      : legacyAttendance;

  const pulses = useMemo(() => {
    const items: Pulse[] = [
      {
        id: 'attention',
        label: t('admin.executive.kpiIntervention'),
        value: executivePending ? '…' : interventionCount,
        hint: executivePending ? t('common.loading') : t('admin.executive.kpiInterventionHint'),
        tone: executivePending ? 'neutral' : interventionCount > 0 ? 'amber' : 'green',
        badge: executivePending
          ? t('common.loading')
          : interventionCount > 0
            ? t('admin.executive.kpiInterventionActive')
            : t('admin.executive.kpiInterventionClear'),
        badgeTone: executivePending ? 'slate' : interventionCount > 0 ? 'amber' : 'green',
      },
    ];

    if (widgets.heroAttendance) {
      items.push({
        id: 'attendance',
        label: t('admin.executive.kpiAttendance'),
        value: attendanceKpi.displayValue,
        hint:
          attendanceKpi.state === 'unavailable'
            ? t('admin.executive.kpiAttendanceUnavailable')
            : executiveAvailable && executive?.attendance_gaps
              ? t('admin.executive.kpiAttendanceExecutiveHint', {
                  absent: executive.attendance_gaps.absent_today_count,
                  late: executive.attendance_gaps.late_today_count,
                })
              : t('admin.executive.kpiAttendanceHint', {
                  recorded: d.attendance_today?.total_recorded ?? d.attendance_today?.total ?? 0,
                }),
        tone: attendanceKpi.tone,
        href: attendanceKpi.state === 'unavailable' ? undefined : '/admin/attendance?date=today',
      });
    }

    const businessCandidates: Array<{ priority: number; pulse: Pulse }> = [];
    const finance = executive?.finance_summary ?? null;
    const admissions = executive?.admissions_summary ?? null;

    if (widgets.financeSummary && finance) {
      if (finance.overdue > 0) {
        businessCandidates.push({
          priority: 4,
          pulse: {
            id: 'overdue',
            label: t('admin.executive.kpiOverdue'),
            value: <ExecutiveKpiMoney amount={finance.overdue} currency={finance.currency} />,
            hint:
              finance.families_overdue_count > 0
                ? t('admin.executive.kpiOverdueHint', { count: finance.families_overdue_count })
                : t('admin.executive.kpiOverdueHintDefault'),
            tone: 'red',
            href: '/admin/finance/installments?status=overdue',
          },
        });
      } else {
        businessCandidates.push({
          priority: 1,
          pulse: {
            id: 'collected',
            label: t('admin.executive.kpiCollected'),
            value: (
              <ExecutiveKpiMoney amount={finance.collected_month} currency={finance.currency} />
            ),
            hint: t('admin.executive.kpiCollectedHint'),
            tone: 'green',
            href: '/admin/finance/collections',
          },
        });
      }
    }

    if (widgets.admissionsSummary && admissions) {
      businessCandidates.push({
        priority: admissions.overdue_actions > 0 ? 4 : admissions.new > 0 ? 3 : admissions.open > 0 ? 2 : 0,
        pulse: {
          id: 'admissions',
          label: t('admin.executive.kpiAdmissions'),
          value: admissions.open,
          hint: t('admin.executive.kpiAdmissionsHint', { new: admissions.new }),
          tone: admissions.overdue_actions > 0 ? 'amber' : 'indigo',
          href: '/admin/admissions',
        },
      });
    }

    const bestBusinessPulse = businessCandidates.sort((a, b) => b.priority - a.priority)[0]?.pulse;
    if (bestBusinessPulse) {
      items.push(bestBusinessPulse);
    } else if (widgets.schoolStructureStudents && !variant.hideSchoolWideKpis) {
      items.push({
        id: 'students',
        label: t('admin.executive.kpiActiveStudents'),
        value: d.total_students ?? '—',
        hint: t('admin.executive.kpiActiveStudentsHintDefault'),
        tone: 'blue',
        href: '/admin/students',
      });
    }

    return items.slice(0, 3);
  }, [
    widgets,
    variant.hideSchoolWideKpis,
    executivePending,
    interventionCount,
    attendanceKpi,
    executiveAvailable,
    executive,
    d.attendance_today,
    d.total_students,
    t,
  ]);

  const updatedLabel = executivePending
    ? t('admin.executive.dataRefreshing')
    : t('admin.executive.dataUpdated', { time: formatDateTime(new Date().toISOString()) });

  return (
    <div className={styles.shell}>
      <header className={styles.intro}>
        <div className={styles.introCopy}>
          <span className="exec-hero__eyebrow">{t('admin.executive.eyebrow')}</span>
          <h1 className={styles.title}>{t('admin.executive.title')}</h1>
          <p className={styles.subtitle}>
            {variant.scopedMode ? t('admin.executive.subtitleScoped') : t('admin.executive.subtitle')}
          </p>
        </div>
        <div className={styles.freshness} aria-live="polite">
          <span className={styles.freshnessDot} aria-hidden="true" />
          <span>{updatedLabel}</span>
        </div>
      </header>

      {executiveFailed && (
        <div className="exec-notice" role="status">
          <span className="exec-notice__icon" aria-hidden="true">◦</span>
          <div>
            <strong>{t('admin.executive.partialDataTitle')}</strong>
            <p>{t('admin.executive.partialExecutive')}</p>
          </div>
        </div>
      )}

      <section className={styles.pulseZone} aria-label={t('admin.executive.kpiSectionTitle')}>
        <ExecutiveZoneLabel>{t('admin.executive.kpiSectionTitle')}</ExecutiveZoneLabel>
        <div className={styles.pulseGrid}>
          {pulses.map((pulse) => (
            <ExecutiveKpiCard
              key={pulse.id}
              label={pulse.label}
              value={pulse.value}
              hint={pulse.hint}
              tone={pulse.tone}
              href={pulse.href}
              badge={pulse.badge}
              badgeTone={pulse.badgeTone}
            />
          ))}
        </div>
      </section>

      <section className={styles.focusGrid} aria-label={t('admin.executive.interventionTitle')}>
        <ExecutivePanel
          variant="attention"
          title={t('admin.executive.interventionTitle')}
          description={t('admin.executive.interventionDesc')}
          icon="◎"
          className={styles.spotlight}
        >
          {executivePending ? (
            <ExecutiveEmpty icon="…" title={t('common.loading')} />
          ) : spotlight ? (
            <ExecutiveDecisionList
              items={[spotlight]}
              emptyTitle={t('admin.executive.noInterventions')}
            />
          ) : (
            <ExecutiveEmpty
              icon="✓"
              title={t('admin.executive.noInterventions')}
              description={t('admin.executive.noInterventionsDesc')}
            />
          )}
        </ExecutivePanel>

        <ExecutivePanel
          title={t('common.actions')}
          description={t('admin.executive.interventionLead')}
          icon="⋯"
        >
          {executivePending ? (
            <ExecutiveEmpty icon="…" title={t('common.loading')} />
          ) : (
            <ExecutiveDecisionList
              items={supportingSignals}
              emptyTitle={t('admin.executive.noInterventions')}
              emptyDescription={t('admin.executive.noInterventionsDesc')}
            />
          )}
        </ExecutivePanel>
      </section>
    </div>
  );
}

export function AdminDirectorDashboard({ data, user }: { data: AdminDashboard; user: CurrentUser }) {
  const widgets = resolveDashboardWidgets(user);

  if (!widgets.executiveLayout) {
    return <AdminCommandDashboard data={data} user={user} />;
  }

  return <DirectorFocusView data={data} user={user} />;
}
