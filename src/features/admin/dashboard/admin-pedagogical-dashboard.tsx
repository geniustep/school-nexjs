'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { EmptyState, SchoolEmptyState } from '@/components/states/states';
import { AdminQuickAction } from '@/features/admin/command-center/primitives';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import { useT } from '@/features/i18n/locale-context';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';
import { endpoints } from '@/lib/api/endpoints';
import {
  resolvePedagogicalDashboardActions,
  resolvePedagogicalDashboardMetricGroups,
  type PedagogicalDashboardMetric,
  type PedagogicalDashboardMetricId,
  type PedagogicalDashboardActionId,
} from '@/lib/admin/pedagogical-dashboard';
import type { AdminDashboard } from '@/types/dashboard';
import './admin-pedagogical-dashboard-phase-a.css';

const FOCUS_METRIC_ORDER: PedagogicalDashboardMetricId[] = [
  'attendance',
  'timetable',
  'homeworks',
  'exams',
];

const FOCUS_METRIC_IDS = new Set<PedagogicalDashboardMetricId>(FOCUS_METRIC_ORDER);

const FOCUS_ACTION_ORDER: PedagogicalDashboardActionId[] = [
  'attendance',
  'timetable',
  'examResults',
];

function safeTotal(meta: { pagination?: { total?: number } } | null | undefined): number | null {
  const total = meta?.pagination?.total;
  return typeof total === 'number' ? total : null;
}

type MetricPresentation = {
  value: string | null;
  emptyHint: string | null;
  loading: boolean;
};

function PedagogicalMetricCard({
  metric,
  presentation,
  t,
  variant,
}: {
  metric: PedagogicalDashboardMetric;
  presentation: MetricPresentation | undefined;
  t: (key: string) => string;
  variant: 'pulse' | 'reference';
}) {
  const showValue = presentation?.value != null;
  const showEmpty = !showValue && !presentation?.loading && presentation?.emptyHint;
  const statusText = presentation?.loading
    ? '…'
    : showValue
      ? presentation.value
      : showEmpty
        ? t(presentation.emptyHint ?? metric.emptyKey)
        : null;

  return (
    <Link
      href={metric.href}
      className={`admin-pedagogical-metric admin-pedagogical-metric--${variant}`}
    >
      <div className="admin-pedagogical-metric__head">
        <span className="admin-pedagogical-metric__icon" aria-hidden="true">
          {metric.icon}
        </span>
        <span className="admin-pedagogical-metric__label">{t(metric.labelKey)}</span>
      </div>
      {statusText ? (
        <p
          className={
            showValue
              ? 'admin-pedagogical-metric__value'
              : 'admin-pedagogical-metric__status admin-pedagogical-metric__status--quiet'
          }
          aria-busy={presentation?.loading || undefined}
        >
          {statusText}
        </p>
      ) : null}
      <p className="admin-pedagogical-metric__hint">{t(metric.hintKey)}</p>
    </Link>
  );
}

export function AdminPedagogicalDashboard() {
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const t = useT();

  const metricGroups = useMemo(() => resolvePedagogicalDashboardMetricGroups(user), [user]);
  const { primary: primaryActions, secondary: secondaryActions } = useMemo(
    () => resolvePedagogicalDashboardActions(user),
    [user],
  );

  const { focusMetrics, referenceMetricGroups } = useMemo(() => {
    const metrics = metricGroups.flatMap((group) => group.metrics);
    const byId = new Map(metrics.map((metric) => [metric.id, metric]));
    const focus = FOCUS_METRIC_ORDER.map((id) => byId.get(id)).filter(
      (metric): metric is PedagogicalDashboardMetric => Boolean(metric),
    );
    const reference = metricGroups
      .map((group) => ({
        ...group,
        metrics: group.metrics.filter((metric) => !FOCUS_METRIC_IDS.has(metric.id)),
      }))
      .filter((group) => group.metrics.length > 0);

    return { focusMetrics: focus, referenceMetricGroups: reference };
  }, [metricGroups]);

  const { focusActions, otherActions } = useMemo(() => {
    const available = [...primaryActions, ...secondaryActions];
    const byId = new Map(available.map((action) => [action.id, action]));
    const preferred = FOCUS_ACTION_ORDER.map((id) => byId.get(id)).filter(Boolean);
    const preferredIds = new Set(preferred.map((action) => action!.id));
    const fallback = available
      .filter((action) => !preferredIds.has(action.id))
      .slice(0, Math.max(0, 3 - preferred.length));
    const focus = [...preferred, ...fallback].filter(Boolean).slice(0, 3);
    const focusIds = new Set(focus.map((action) => action!.id));

    return {
      focusActions: focus.map((action) => action!),
      otherActions: available.filter((action) => !focusIds.has(action.id)),
    };
  }, [primaryActions, secondaryActions]);

  const dashState = useAdminResource<AdminDashboard>(
    hasPermission(user, 'view_dashboard') ? endpoints.admin.dashboard : null,
  );
  const studentsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_students') ? endpoints.admin.students : null,
    { page: 1, page_size: 1 },
  );
  const admissionsState = useAdminResource<unknown[]>(
    hasPermission(user, ADMISSION_VIEW) ? endpoints.admin.admissions : null,
    { page: 1, page_size: 1 },
  );
  const parentsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_parents') ? endpoints.admin.parents : null,
    { page: 1, page_size: 1 },
  );
  const teachersState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_teachers') ? endpoints.admin.teachers : null,
    { page: 1, page_size: 1 },
  );
  const classesState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_classes') ? endpoints.admin.classes : null,
    { page: 1, page_size: 1 },
  );
  const levelsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_classes') ? endpoints.admin.levels : null,
    { page: 1, page_size: 1 },
  );
  const subjectsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_classes') ? endpoints.admin.subjects : null,
    { page: 1, page_size: 1 },
  );
  const homeworksState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_homeworks') ? endpoints.admin.homeworks : null,
    { page: 1, page_size: 1 },
  );
  const resourcesState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_resources') ? endpoints.admin.resources : null,
    { page: 1, page_size: 1 },
  );
  const examsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_exams') ? endpoints.admin.exams : null,
    { page: 1, page_size: 1 },
  );
  const resultsState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_exam_results') ? endpoints.admin.examResults : null,
    { page: 1, page_size: 1 },
  );
  const timetableState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_timetable') ? endpoints.admin.timetable : null,
    { page: 1, page_size: 1 },
  );
  const staffState = useAdminResource<unknown[]>(
    hasPermission(user, 'view_teachers') || hasPermission(user, 'view_classes')
      ? endpoints.admin.staff
      : null,
    { page: 1, page_size: 1 },
  );

  const metricPresentation = useMemo(() => {
    const d = dashState.data;
    const out: Partial<Record<PedagogicalDashboardMetricId, MetricPresentation>> = {};

    const setCount = (
      id: PedagogicalDashboardMetricId,
      value: number | null | undefined,
      loading: boolean,
      emptyKey: string,
    ) => {
      if (typeof value === 'number') {
        out[id] = { value: String(value), emptyHint: null, loading: false };
        return;
      }
      out[id] = {
        value: null,
        emptyHint: loading ? null : emptyKey,
        loading,
      };
    };

    setCount(
      'students',
      d?.total_students ?? safeTotal(studentsState.meta),
      studentsState.loading && !studentsState.data,
      'admin.pedagogicalDashboard.metricEmpty.students',
    );
    setCount(
      'admissions',
      safeTotal(admissionsState.meta),
      admissionsState.loading && !admissionsState.data,
      'admin.pedagogicalDashboard.metricEmpty.admissions',
    );
    setCount(
      'parents',
      safeTotal(parentsState.meta),
      parentsState.loading && !parentsState.data,
      'admin.pedagogicalDashboard.metricEmpty.parents',
    );
    setCount(
      'teachers',
      safeTotal(teachersState.meta),
      teachersState.loading && !teachersState.data,
      'admin.pedagogicalDashboard.metricEmpty.teachers',
    );
    setCount(
      'staffCenter',
      safeTotal(staffState.meta),
      staffState.loading && !staffState.data,
      'admin.pedagogicalDashboard.metricEmpty.staffCenter',
    );
    setCount(
      'classes',
      d?.total_classes ?? safeTotal(classesState.meta),
      classesState.loading && !classesState.data,
      'admin.pedagogicalDashboard.metricEmpty.classes',
    );
    setCount(
      'levels',
      safeTotal(levelsState.meta),
      levelsState.loading && !levelsState.data,
      'admin.pedagogicalDashboard.metricEmpty.levels',
    );
    setCount(
      'subjects',
      safeTotal(subjectsState.meta),
      subjectsState.loading && !subjectsState.data,
      'admin.pedagogicalDashboard.metricEmpty.subjects',
    );
    setCount(
      'attendance',
      d?.attendance_today?.total_recorded ?? d?.attendance_today?.total ?? null,
      dashState.loading && !d && hasPermission(user, 'view_dashboard'),
      'admin.pedagogicalDashboard.metricEmpty.attendance',
    );
    setCount(
      'timetable',
      safeTotal(timetableState.meta) ?? timetableState.data?.length ?? null,
      timetableState.loading && !timetableState.data,
      'admin.pedagogicalDashboard.metricEmpty.timetable',
    );
    setCount(
      'homeworks',
      d?.published_homeworks ?? safeTotal(homeworksState.meta),
      homeworksState.loading && !homeworksState.data,
      'admin.pedagogicalDashboard.metricEmpty.homeworks',
    );
    setCount(
      'resources',
      d?.published_resources ?? safeTotal(resourcesState.meta),
      resourcesState.loading && !resourcesState.data,
      'admin.pedagogicalDashboard.metricEmpty.resources',
    );
    setCount(
      'exams',
      d?.upcoming_exams_count ?? safeTotal(examsState.meta),
      examsState.loading && !examsState.data,
      'admin.pedagogicalDashboard.metricEmpty.exams',
    );
    setCount(
      'examResults',
      d?.published_exam_results_count ?? safeTotal(resultsState.meta),
      resultsState.loading && !resultsState.data,
      'admin.pedagogicalDashboard.metricEmpty.examResults',
    );
    out.reports = {
      value: null,
      emptyHint: 'admin.pedagogicalDashboard.metricEmpty.reports',
      loading: false,
    };

    return out;
  }, [
    user,
    dashState,
    studentsState,
    admissionsState,
    parentsState,
    teachersState,
    staffState,
    classesState,
    levelsState,
    subjectsState,
    homeworksState,
    resourcesState,
    examsState,
    resultsState,
    timetableState,
  ]);

  const schoolLabel =
    user.school?.name ??
    (activeSchoolId != null ? `${t('admin.activeSchool')} #${activeSchoolId}` : '');

  const hasContent =
    metricGroups.length > 0 || focusActions.length > 0 || otherActions.length > 0;

  if (!hasContent) {
    return <SchoolEmptyState description={t('admin.pedagogicalDashboard.emptyWorkspace')} />;
  }

  return (
    <div className="admin-pedagogical-dashboard admin-pedagogical-dashboard--phase-a">
      {dashState.error ? (
        <p className="admin-pedagogical-dashboard__error muted" role="status">
          {sanitizeUserFacingErrorMessage(dashState.error.message, t('errors.loadFailedRetry'))}
        </p>
      ) : null}

      <header className="admin-pedagogical-dashboard__hero admin-pedagogical-dashboard__hero--compact">
        {schoolLabel ? (
          <p className="admin-pedagogical-dashboard__school" dir="auto">
            {schoolLabel}
          </p>
        ) : null}
        <h1 className="admin-pedagogical-dashboard__title">
          {t('admin.pedagogicalDashboard.title')}
        </h1>
      </header>

      <section
        className="admin-pedagogical-dashboard__attention admin-pedagogical-dashboard__attention--priority"
        aria-labelledby="pedagogical-attention"
      >
        <h2 id="pedagogical-attention" className="admin-pedagogical-dashboard__section-title">
          {t('admin.pedagogicalDashboard.attentionTitle')}
        </h2>
        <EmptyState compact icon="✓" title={t('admin.pedagogicalDashboard.attentionEmpty')} />
      </section>

      {focusMetrics.length > 0 ? (
        <section
          className="admin-pedagogical-dashboard__section admin-pedagogical-dashboard__pulse"
          aria-labelledby="pedagogical-metrics"
        >
          <div className="admin-pedagogical-dashboard__section-head">
            <h2 id="pedagogical-metrics" className="admin-pedagogical-dashboard__section-title">
              {t('admin.pedagogicalDashboard.metricsTitle')}
            </h2>
            <p className="admin-pedagogical-dashboard__section-lead">
              {t('admin.pedagogicalDashboard.metricsLead')}
            </p>
          </div>
          <div className="admin-pedagogical-dashboard__pulse-grid">
            {focusMetrics.map((metric) => (
              <PedagogicalMetricCard
                key={metric.id}
                metric={metric}
                presentation={metricPresentation[metric.id]}
                t={t}
                variant="pulse"
              />
            ))}
          </div>
        </section>
      ) : null}

      {focusActions.length > 0 || otherActions.length > 0 ? (
        <section
          className="admin-pedagogical-dashboard__work-center admin-pedagogical-dashboard__work-center--focused"
          aria-labelledby="pedagogical-work"
        >
          <div className="admin-pedagogical-dashboard__section-head">
            <h2 id="pedagogical-work" className="admin-pedagogical-dashboard__section-title">
              {t('admin.pedagogicalDashboard.workCenterTitle')}
            </h2>
            <p className="admin-pedagogical-dashboard__section-lead">
              {t('admin.pedagogicalDashboard.workCenterLead')}
            </p>
          </div>

          {focusActions.length > 0 ? (
            <div className="admin-pedagogical-dashboard__primary-actions">
              {focusActions.map((action) => (
                <Link key={action.id} href={action.href} className="admin-pedagogical-primary-action">
                  <span className="admin-pedagogical-primary-action__icon" aria-hidden="true">
                    {action.icon}
                  </span>
                  <span className="admin-pedagogical-primary-action__copy">
                    <strong className="admin-pedagogical-primary-action__label">
                      {t(action.labelKey)}
                    </strong>
                    <span className="admin-pedagogical-primary-action__desc">
                      {t(action.descriptionKey)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {otherActions.length > 0 ? (
            <div className="admin-pedagogical-dashboard__secondary-wrap">
              <p className="admin-pedagogical-dashboard__secondary-label">
                {t('admin.pedagogicalDashboard.secondaryActionsTitle')}
              </p>
              <div className="admin-pedagogical-dashboard__secondary-actions">
                {otherActions.map((action) => (
                  <AdminQuickAction
                    key={action.id}
                    href={action.href}
                    icon={action.icon}
                    label={t(action.labelKey)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {referenceMetricGroups.length > 0 ? (
        <section
          className="admin-pedagogical-dashboard__reference"
          aria-label={t('admin.pedagogicalDashboard.metricsLead')}
        >
          <div className="admin-pedagogical-dashboard__reference-groups">
            {referenceMetricGroups.map((group) => (
              <div key={group.id} className="admin-pedagogical-metric-group">
                <h3 className="admin-pedagogical-metric-group__title">{t(group.titleKey)}</h3>
                <div className="admin-pedagogical-metric-group__grid">
                  {group.metrics.map((metric) => (
                    <PedagogicalMetricCard
                      key={metric.id}
                      metric={metric}
                      presentation={metricPresentation[metric.id]}
                      t={t}
                      variant="reference"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
