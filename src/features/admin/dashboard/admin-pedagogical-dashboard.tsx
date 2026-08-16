'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 */

import Link from 'next/link';
import { useMemo } from 'react';
import { SchoolEmptyState } from '@/components/states/states';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useSession } from '@/features/auth/session-context';
import { hasPermission } from '@/lib/permissions/permissions';
import { ADMISSION_VIEW } from '@/lib/permissions/admission';
import {
  canComposeGeneralCommunication,
  canReviewCommunication,
} from '@/lib/permissions/communication';
import { useT } from '@/features/i18n/locale-context';
import { sanitizeUserFacingErrorMessage } from '@/lib/utils/user-facing-error';
import { endpoints } from '@/lib/api/endpoints';
import { CHANNELS_LIST_PAGE_SIZE } from '@/features/channels/utils/channels-list-present';
import {
  resolvePedagogicalDashboardActions,
  resolvePedagogicalDashboardMetricGroups,
  type PedagogicalDashboardMetric,
  type PedagogicalDashboardMetricId,
  type PedagogicalDashboardActionId,
} from '@/lib/admin/pedagogical-dashboard';
import type { AdminDashboard } from '@/types/dashboard';
import type { AdminChannel } from '@/types/admin-channel';
import type { CommunicationContent } from '@/types/communication';
import './admin-pedagogical-dashboard-phase-a.css';

const FOCUS_METRIC_ORDER: PedagogicalDashboardMetricId[] = [
  'attendance',
  'timetable',
  'exams',
  'examResults',
];

const FOCUS_METRIC_IDS = new Set<PedagogicalDashboardMetricId>(FOCUS_METRIC_ORDER);
const REFERENCE_EXCLUDED_METRIC_IDS = new Set<PedagogicalDashboardMetricId>([
  ...FOCUS_METRIC_ORDER,
  'homeworks',
]);

const FOCUS_ACTION_ORDER: PedagogicalDashboardActionId[] = [
  'channels',
  'homeworks',
  'attendance',
  'timetable',
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

function PedagogicalMetricLink({
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
      <span className="admin-pedagogical-metric__label">{t(metric.labelKey)}</span>
      {statusText ? (
        <span
          className={
            showValue
              ? 'admin-pedagogical-metric__value'
              : 'admin-pedagogical-metric__status admin-pedagogical-metric__status--quiet'
          }
          aria-busy={presentation?.loading || undefined}
        >
          {statusText}
        </span>
      ) : null}
    </Link>
  );
}

export function AdminPedagogicalDashboard() {
  const user = useSession();
  const t = useT();
  const canReview = canReviewCommunication(user);
  const canViewChannels = hasPermission(user, 'view_channels');
  const canComposeCommunication = canComposeGeneralCommunication(user);

  const metricGroups = useMemo(() => resolvePedagogicalDashboardMetricGroups(user), [user]);
  const { primary: primaryActions, secondary: secondaryActions } = useMemo(
    () => resolvePedagogicalDashboardActions(user),
    [user],
  );

  const { focusMetrics, referenceMetricGroups } = useMemo(() => {
    const metrics = metricGroups.flatMap((group) => group.metrics);
    const byId = new Map(metrics.map((metric) => [metric.id, metric]));
    const focus = FOCUS_METRIC_ORDER.flatMap((id) => {
      const metric = byId.get(id);
      return metric ? [metric] : [];
    });
    const reference = metricGroups
      .map((group) => ({
        ...group,
        metrics: group.metrics.filter(
          (metric) => !REFERENCE_EXCLUDED_METRIC_IDS.has(metric.id),
        ),
      }))
      .filter((group) => group.metrics.length > 0);

    return { focusMetrics: focus, referenceMetricGroups: reference };
  }, [metricGroups]);

  const focusActions = useMemo(() => {
    const available = [...primaryActions, ...secondaryActions];
    const byId = new Map(available.map((action) => [action.id, action]));
    const preferred = FOCUS_ACTION_ORDER.flatMap((id) => {
      const action = byId.get(id);
      return action ? [action] : [];
    });
    const preferredIds = new Set(preferred.map((action) => action.id));
    const fallback = available
      .filter((action) => !preferredIds.has(action.id))
      .slice(0, Math.max(0, 4 - preferred.length));

    return [...preferred, ...fallback].slice(0, 4);
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

  const communicationReviewState = useAdminResource<CommunicationContent[]>(
    canReview ? endpoints.admin.communicationContent : null,
    { page: 1, page_size: 50, state: 'submitted', content_type: 'message' },
  );
  const homeworkReviewState = useAdminResource<CommunicationContent[]>(
    canReview ? endpoints.admin.communicationContent : null,
    { page: 1, page_size: 50, state: 'submitted', content_type: 'homework' },
  );
  const channelsState = useAdminResource<AdminChannel[]>(
    canViewChannels ? endpoints.admin.channels : null,
    { page: 1, page_size: CHANNELS_LIST_PAGE_SIZE },
  );

  const unreadMessageCount = (channelsState.data ?? []).reduce(
    (total, channel) => total + Math.max(0, channel.unread_count ?? 0),
    0,
  );
  const communicationReviewCount = canReview
    ? safeTotal(communicationReviewState.meta) ?? communicationReviewState.data?.length ?? 0
    : 0;
  const homeworkReviewCount = canReview
    ? safeTotal(homeworkReviewState.meta) ?? homeworkReviewState.data?.length ?? 0
    : 0;
  const attentionCount = unreadMessageCount + communicationReviewCount + homeworkReviewCount;
  const unreadMessagesLoading = canViewChannels && channelsState.loading && !channelsState.data;
  const communicationReviewLoading =
    canReview && communicationReviewState.loading && !communicationReviewState.data;
  const homeworkReviewLoading = canReview && homeworkReviewState.loading && !homeworkReviewState.data;
  const attentionLoading =
    unreadMessagesLoading || communicationReviewLoading || homeworkReviewLoading;

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

  const hasContent = metricGroups.length > 0 || focusActions.length > 0;
  const showCommunicationSpotlight = canReview || canViewChannels || canComposeCommunication;
  const showHomeworkSpotlight = canReview || hasPermission(user, 'view_homeworks');
  const showSpotlight = showCommunicationSpotlight || showHomeworkSpotlight;
  const publishedHomeworkValue = metricPresentation.homeworks?.loading
    ? '…'
    : metricPresentation.homeworks?.value ?? '0';
  const communicationPrimaryValue = canViewChannels
    ? unreadMessagesLoading
      ? '…'
      : String(unreadMessageCount)
    : communicationReviewLoading
      ? '…'
      : String(communicationReviewCount);

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
        <h1 className="admin-pedagogical-dashboard__title">
          {t('admin.pedagogicalDashboard.title')}
        </h1>
      </header>

      <section
        className={
          attentionCount > 0
            ? 'admin-pedagogical-dashboard__attention admin-pedagogical-dashboard__attention--quiet admin-pedagogical-dashboard__attention--active'
            : 'admin-pedagogical-dashboard__attention admin-pedagogical-dashboard__attention--quiet'
        }
        aria-label={t('admin.pedagogicalDashboard.attentionTitle')}
        role="status"
      >
        <span className="admin-pedagogical-dashboard__attention-check" aria-hidden="true">
          {attentionLoading ? '…' : attentionCount > 0 ? String(attentionCount) : '✓'}
        </span>
        <span className="admin-pedagogical-dashboard__attention-copy">
          {attentionLoading ? (
            t('common.loading')
          ) : attentionCount > 0 ? (
            <>
              {unreadMessageCount > 0 ? (
                <span className="admin-pedagogical-dashboard__attention-item">
                  {t('channels.schoolCommunicationTitle')}: <strong>{unreadMessageCount}</strong>{' '}
                  {t('admin.pedagogicalDashboard.unreadMessages')}
                </span>
              ) : null}
              {communicationReviewCount > 0 ? (
                <span className="admin-pedagogical-dashboard__attention-item">
                  {t('channels.schoolCommunicationTitle')}: <strong>{communicationReviewCount}</strong>{' '}
                  {t('communication.filter.submitted')}
                </span>
              ) : null}
              {homeworkReviewCount > 0 ? (
                <span className="admin-pedagogical-dashboard__attention-item">
                  {t('nav.homework')}: <strong>{homeworkReviewCount}</strong>{' '}
                  {t('communication.filter.submitted')}
                </span>
              ) : null}
            </>
          ) : (
            t('admin.pedagogicalDashboard.attentionEmpty')
          )}
        </span>
      </section>

      {showSpotlight ? (
        <section
          className="admin-pedagogical-dashboard__spotlight"
          aria-label={t('admin.pedagogicalDashboard.attentionTitle')}
        >
          {showCommunicationSpotlight ? (
            <div className="admin-pedagogical-focus-card admin-pedagogical-focus-card--communication">
              <span className="admin-pedagogical-focus-card__topline">
                <span className="admin-pedagogical-focus-card__title">
                  {t('channels.schoolCommunicationTitle')}
                </span>
                {canComposeCommunication ? (
                  <Link
                    href="/admin/communication/compose"
                    className="admin-pedagogical-focus-card__cta"
                  >
                    {t('channels.createMessage')}
                  </Link>
                ) : null}
              </span>
              <strong className="admin-pedagogical-focus-card__value">
                {communicationPrimaryValue}
              </strong>
              <span className="admin-pedagogical-focus-card__status">
                {canViewChannels ? (
                  <>
                    <Link href="/admin/channels" className="admin-pedagogical-focus-card__cta">
                      {t('admin.pedagogicalDashboard.readMessages')}
                    </Link>{' '}
                    · {t('admin.pedagogicalDashboard.unreadMessages')}
                    {canReview ? (
                      <>
                        {' '}·{' '}
                        <Link
                          href="/admin/communication?filter=submitted"
                          className="admin-pedagogical-focus-card__cta"
                        >
                          {communicationReviewLoading ? '…' : communicationReviewCount}{' '}
                          {t('communication.filter.submitted')}
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : canReview ? (
                  <Link
                    href="/admin/communication?filter=submitted"
                    className="admin-pedagogical-focus-card__cta"
                  >
                    {t('communication.filter.submitted')}
                  </Link>
                ) : (
                  t('channels.schoolCommunicationTitle')
                )}
              </span>
            </div>
          ) : null}

          {showHomeworkSpotlight ? (
            <Link
              href={canReview ? '/admin/communication?filter=submitted' : '/admin/homeworks'}
              className="admin-pedagogical-focus-card admin-pedagogical-focus-card--homework"
            >
              <span className="admin-pedagogical-focus-card__topline">
                <span className="admin-pedagogical-focus-card__title">{t('nav.homework')}</span>
                <span className="admin-pedagogical-focus-card__cta">{t('common.view')}</span>
              </span>
              <strong className="admin-pedagogical-focus-card__value">
                {canReview ? (homeworkReviewLoading ? '…' : homeworkReviewCount) : publishedHomeworkValue}
              </strong>
              <span className="admin-pedagogical-focus-card__status">
                {canReview ? (
                  <>
                    {t('communication.filter.submitted')} ·{' '}
                    {t('admin.pedagogicalDashboard.homeworkPublishedCompact', {
                      count: publishedHomeworkValue,
                    })}
                  </>
                ) : (
                  t('dashboard.publishedHomeworks')
                )}
              </span>
            </Link>
          ) : null}
        </section>
      ) : null}

      {focusActions.length > 0 ? (
        <section
          className="admin-pedagogical-dashboard__work-strip"
          aria-labelledby="pedagogical-work"
        >
          <h2 id="pedagogical-work" className="admin-pedagogical-dashboard__work-strip-title">
            {t('dashboard.shortcuts')}
          </h2>
          <nav
            className="admin-pedagogical-dashboard__work-strip-actions"
            aria-label={t('dashboard.shortcuts')}
          >
            {focusActions.map((action) => {
              const communicationAction = action.id === 'channels';
              const href =
                communicationAction && canComposeCommunication
                  ? '/admin/communication/compose'
                  : action.href;
              const label =
                communicationAction && canComposeCommunication
                  ? t('channels.createMessage')
                  : communicationAction
                    ? t('channels.schoolCommunicationTitle')
                    : t(action.labelKey);

              return (
                <Link
                  key={action.id}
                  href={href}
                  className={`admin-pedagogical-work-action admin-pedagogical-work-action--${action.id}`}
                >
                  <span className="admin-pedagogical-work-action__mark" aria-hidden="true" />
                  <span className="admin-pedagogical-work-action__label">{label}</span>
                </Link>
              );
            })}
          </nav>
        </section>
      ) : null}

      {focusMetrics.length > 0 ? (
        <section
          className="admin-pedagogical-dashboard__section admin-pedagogical-dashboard__pulse"
          aria-labelledby="pedagogical-metrics"
        >
          <div className="admin-pedagogical-dashboard__section-head">
            <h2 id="pedagogical-metrics" className="admin-pedagogical-dashboard__section-title">
              {t('admin.pedagogicalDashboard.dailyPulseTitle')}
            </h2>
          </div>
          <div className="admin-pedagogical-dashboard__pulse-grid">
            {focusMetrics.map((metric) => (
              <PedagogicalMetricLink
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
                    <PedagogicalMetricLink
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
