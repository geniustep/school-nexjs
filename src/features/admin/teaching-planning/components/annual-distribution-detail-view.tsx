'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Annual Distribution detail. Lifecycle is gated purely by Backend
 * allowed_actions (no optimistic transitions). Readiness/blockers come from the
 * Backend. Activation makes this the offering's active distribution — it does
 * NOT create any timetable slots.
 */

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, InfoBanner, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import {
  approveAnnualDistribution,
  activateAnnualDistribution,
  archiveAnnualDistribution,
  deleteAnnualDistribution,
  duplicateAnnualDistributionVersion,
  fetchAnnualDistributionTimeline,
  resetAnnualDistributionToDraft,
  submitAnnualDistributionForReview,
} from '@/features/admin/teaching-planning/api/annual-distributions-api';
import { AnnualDistributionEditorDialog } from '@/features/admin/teaching-planning/components/annual-distribution-dialogs';
import { DistributionBatchWorkspace } from '@/features/admin/teaching-planning/components/distribution-batch-workspace';
import { DistributionLinesEditor } from '@/features/admin/teaching-planning/components/distribution-lines-editor';
import { DistributionTimeline } from '@/features/admin/teaching-planning/components/distribution-timeline';
import { TeachingPlanningResetDialog } from '@/features/admin/teaching-planning/components/teaching-reference-dialogs';
import { teachingPlanningAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-teaching-planning';
import { teachingPlanningBlockerLabelKey } from '@/features/admin/teaching-planning/utils/teaching-planning-present';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import type {
  AnnualDistributionDetail,
  AnnualDistributionTimeline,
} from '@/types/teaching-planning';
import '@/features/admin/teaching-planning/teaching-planning.css';

type Tab = 'overview' | 'lines' | 'timeline' | 'batch' | 'versions';

function blockerLabel(t: (key: string) => string, code: string): string {
  const key = teachingPlanningBlockerLabelKey(code);
  const translated = t(key);
  return translated === key ? code : translated;
}

export function AnnualDistributionDetailView({
  distribution,
  onReload,
}: {
  distribution: AnnualDistributionDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const router = useRouter();
  const { formatDate, formatDateTime } = useFormat();

  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'delete' | 'activate' | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [timeline, setTimeline] = useState<AnnualDistributionTimeline | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState<string | null>(null);

  const canEdit = teachingPlanningAllowsAction(distribution, 'edit');
  const canSubmit = teachingPlanningAllowsAction(distribution, 'submit_for_review');
  const canApprove = teachingPlanningAllowsAction(distribution, 'approve');
  const canReset = teachingPlanningAllowsAction(distribution, 'reset_to_draft');
  const canArchive = teachingPlanningAllowsAction(distribution, 'archive');
  const canDuplicate = teachingPlanningAllowsAction(distribution, 'duplicate_version');
  const canActivate = teachingPlanningAllowsAction(distribution, 'activate');
  const canDelete = teachingPlanningAllowsAction(distribution, 'delete');
  const canManageLines = teachingPlanningAllowsAction(distribution, 'manage_lines');

  async function loadTimeline() {
    setTimelineLoading(true);
    setTimelineError(null);
    const res = await fetchAnnualDistributionTimeline(distribution.id);
    setTimelineLoading(false);
    if (!res.success) {
      setTimelineError(res.error.message);
      return;
    }
    setTimeline(res.data);
  }

  function openTab(next: Tab) {
    setTab(next);
    if (next === 'timeline' && timeline == null && !timelineLoading) {
      void loadTimeline();
    }
  }

  async function runSimpleLifecycle(
    action: 'submit_for_review' | 'approve' | 'duplicate_version',
  ) {
    if (saving) return;
    setSaving(true);
    const runners = {
      submit_for_review: () => submitAnnualDistributionForReview(distribution.id),
      approve: () => approveAnnualDistribution(distribution.id),
      duplicate_version: () => duplicateAnnualDistributionVersion(distribution.id),
    } as const;
    const res = await runners[action]();
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    const successKey =
      action === 'submit_for_review'
        ? 'admin.teachingPlanning.lifecycle.submitSuccess'
        : action === 'approve'
          ? 'admin.teachingPlanning.lifecycle.approveSuccess'
          : 'admin.teachingPlanning.lifecycle.duplicateVersionSuccess';
    toast.success(t(successKey));
    if (action === 'duplicate_version') {
      router.push(`/admin/teaching-planning/distributions/${res.data.id}`);
      return;
    }
    onReload();
  }

  async function confirmDestructive() {
    if (!confirmAction || saving) return;
    setSaving(true);
    const res =
      confirmAction === 'archive'
        ? await archiveAnnualDistribution(distribution.id)
        : confirmAction === 'activate'
          ? await activateAnnualDistribution(distribution.id)
          : await deleteAnnualDistribution(distribution.id);
    setSaving(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    const successKey =
      confirmAction === 'archive'
        ? 'admin.teachingPlanning.lifecycle.archiveSuccess'
        : confirmAction === 'activate'
          ? 'admin.teachingPlanning.distributions.activateSuccess'
          : 'admin.teachingPlanning.lifecycle.deleteSuccess';
    toast.success(t(successKey));
    const wasDelete = confirmAction === 'delete';
    setConfirmAction(null);
    if (wasDelete) {
      router.push('/admin/teaching-planning/distributions');
      return;
    }
    onReload();
  }

  const readinessItems = useMemo(
    () =>
      [
        {
          key: 'has_lines',
          ready: distribution.readiness.has_lines,
          label: t('admin.teachingPlanning.distributions.readiness.hasLines'),
        },
        {
          key: 'sequences_resolved',
          ready: distribution.readiness.sequences_resolved,
          label: t('admin.teachingPlanning.distributions.readiness.sequencesResolved'),
        },
        {
          key: 'dates_valid',
          ready: distribution.readiness.dates_valid,
          label: t('admin.teachingPlanning.distributions.readiness.datesValid'),
        },
        {
          key: 'ready_for_approval',
          ready: distribution.readiness.ready_for_approval,
          label: t('admin.teachingPlanning.readiness.readyForApproval'),
        },
        {
          key: 'ready_for_activation',
          ready: distribution.readiness.ready_for_activation,
          label: t('admin.teachingPlanning.readiness.readyForActivation'),
        },
      ] as const,
    [distribution.readiness, t],
  );

  const tabs: Array<[Tab, string]> = [
    ['overview', t('admin.teachingPlanning.distributions.tabs.overview')],
    ['lines', t('admin.teachingPlanning.distributions.tabs.lines')],
    ['timeline', t('admin.teachingPlanning.distributions.tabs.timeline')],
    ['batch', t('admin.teachingPlanning.distributions.tabs.batch')],
    ['versions', t('admin.teachingPlanning.distributions.tabs.versions')],
  ];

  return (
    <div className="teaching-planning-page">
      <nav
        className="teaching-planning-page__breadcrumb"
        aria-label={t('admin.teachingPlanning.distributions.detailBreadcrumb')}
      >
        <Link href="/admin/teaching-planning/distributions">
          {t('admin.teachingPlanning.distributions.title')}
        </Link>
        <span aria-hidden="true"> / </span>
        <span dir="auto">{distribution.name}</span>
      </nav>

      <Link href="/admin/teaching-planning/distributions" className="back-link">
        ‹ {t('admin.teachingPlanning.distributions.backToList')}
      </Link>

      <PageHeader
        title={distribution.name}
        subtitle={distribution.offering?.display_name ?? undefined}
        actions={
          <div className="teaching-planning-page__actions">
            <TeachingPrintLink href={`/admin/teaching-planning/distributions/${distribution.id}/print`} />
            {canEdit ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditOpen(true)}>
                {t('common.edit')}
              </button>
            ) : null}
            {canSubmit ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('submit_for_review')}
              >
                {t('admin.teachingPlanning.lifecycle.submitForReview')}
              </button>
            ) : null}
            {canApprove ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('approve')}
              >
                {t('admin.teachingPlanning.lifecycle.approve')}
              </button>
            ) : null}
            {canActivate ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={saving}
                onClick={() => setConfirmAction('activate')}
              >
                {t('admin.teachingPlanning.distributions.activate')}
              </button>
            ) : null}
            {canReset ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setResetOpen(true)}>
                {t('admin.teachingPlanning.lifecycle.resetToDraft')}
              </button>
            ) : null}
            {canDuplicate ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => void runSimpleLifecycle('duplicate_version')}
              >
                {t('admin.teachingPlanning.lifecycle.duplicateVersion')}
              </button>
            ) : null}
            {canArchive ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction('archive')}>
                {t('admin.teachingPlanning.lifecycle.archive')}
              </button>
            ) : null}
            {canDelete ? (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmAction('delete')}>
                {t('common.delete')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="teaching-planning-page__actions" style={{ marginBottom: '1rem' }}>
        <WorkflowBadge state={distribution.state} />
        {distribution.active ? (
          <Badge tone="green">{t('admin.teachingPlanning.distributions.activeBadge')}</Badge>
        ) : null}
        {distribution.version_label ? (
          <Badge tone="slate">
            {t('admin.teachingPlanning.fields.versionLabel')}:{' '}
            <bdi dir="ltr">{distribution.version_label}</bdi>
          </Badge>
        ) : null}
      </div>

      <div className="teaching-planning-page__actions" style={{ marginBlock: '1rem' }}>
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`btn btn--sm ${tab === key ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => openTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          <Card>
            <SectionHead title={t('admin.teachingPlanning.distributions.tabs.overview')} />
            <dl className="teaching-planning-page__meta-grid">
              <div>
                <dt>{t('admin.teachingPlanning.distributions.fields.offering')}</dt>
                <dd dir="auto">
                  {distribution.offering ? (
                    <Link
                      href={`/admin/teaching-planning/offerings/${distribution.offering.id}`}
                    >
                      {distribution.offering.display_name}
                    </Link>
                  ) : (
                    t('common.dash')
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.distributions.fields.periodLabel')}</dt>
                <dd dir="auto">{distribution.period_label || t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.distributions.fields.dateStart')}</dt>
                <dd>{distribution.date_start ? formatDate(distribution.date_start) : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.distributions.fields.dateEnd')}</dt>
                <dd>{distribution.date_end ? formatDate(distribution.date_end) : t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.distributions.columns.totals')}</dt>
                <dd>
                  <bdi dir="ltr">{distribution.totals.line_count}</bdi>{' '}
                  {t('admin.teachingPlanning.distributions.linesWord')} ·{' '}
                  <bdi dir="ltr">{distribution.totals.sequence_count}</bdi>{' '}
                  {t('admin.teachingPlanning.distributions.sequencesWord')} ·{' '}
                  <bdi dir="ltr">{distribution.totals.total_sessions}</bdi>{' '}
                  {t('admin.teachingPlanning.distributions.sessionsWord')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.fields.approvedAt')}</dt>
                <dd>{distribution.approved_at ? formatDateTime(distribution.approved_at) : t('common.dash')}</dd>
              </div>
            </dl>
            {distribution.notes ? (
              <p className="muted" dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                {distribution.notes}
              </p>
            ) : null}
          </Card>

          <Card>
            <SectionHead title={t('admin.teachingPlanning.readiness.title')} />
            <div className="teaching-planning-page__checklist">
              {readinessItems.map((item) => (
                <div key={item.key} className="teaching-planning-page__checklist-item">
                  <Badge tone={item.ready ? 'green' : 'amber'}>{item.label}</Badge>
                  <span className="muted tiny">
                    {item.ready
                      ? t('admin.teachingPlanning.readiness.readyYes')
                      : t('admin.teachingPlanning.readiness.readyNo')}
                  </span>
                </div>
              ))}
            </div>
            {distribution.blockers.length > 0 ? (
              <div className="teaching-planning-page__actions">
                {distribution.blockers.map((code) => (
                  <Badge key={code} tone="amber">
                    {blockerLabel(t, code)}
                  </Badge>
                ))}
              </div>
            ) : null}
          </Card>
        </>
      ) : null}

      {tab === 'lines' ? (
        <Card>
          <SectionHead title={t('admin.teachingPlanning.distributions.tabs.lines')} />
          <DistributionLinesEditor
            distribution={distribution}
            canManageLines={canManageLines}
            onSaved={onReload}
          />
        </Card>
      ) : null}

      {tab === 'timeline' ? (
        <Card>
          <SectionHead
            title={t('admin.teachingPlanning.distributions.tabs.timeline')}
            action={
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={timelineLoading}
                onClick={() => void loadTimeline()}
              >
                {t('common.refresh')}
              </button>
            }
          />
          {timelineError ? (
            <InfoBanner tone="amber" icon="⚠" title={timelineError} />
          ) : timelineLoading && timeline == null ? (
            <p className="muted">{t('common.loading')}</p>
          ) : timeline ? (
            <DistributionTimeline timeline={timeline} />
          ) : (
            <p className="muted">{t('common.loading')}</p>
          )}
        </Card>
      ) : null}

      {tab === 'batch' ? (
        <Card>
          <SectionHead title={t('admin.teachingPlanning.distributions.tabs.batch')} />
          <DistributionBatchWorkspace
            distribution={distribution}
            canManageLines={canManageLines}
            onApplied={onReload}
          />
        </Card>
      ) : null}

      {tab === 'versions' ? (
        <Card>
          <SectionHead title={t('admin.teachingPlanning.distributions.tabs.versions')} />
          <dl className="teaching-planning-page__meta-grid">
            <div>
              <dt>{t('admin.teachingPlanning.fields.versionLabel')}</dt>
              <dd dir="auto">{distribution.version_label || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.teachingPlanning.versions.isLatest')}</dt>
              <dd>
                {distribution.is_latest_version
                  ? t('admin.teachingPlanning.readiness.readyYes')
                  : t('admin.teachingPlanning.readiness.readyNo')}
              </dd>
            </div>
          </dl>
          {distribution.active_version ? (
            <p className="muted">
              {t('admin.teachingPlanning.versions.activeVersion')}:{' '}
              <Link
                href={`/admin/teaching-planning/distributions/${distribution.active_version.id}`}
              >
                {distribution.active_version.version_label ||
                  `#${distribution.active_version.id}`}
              </Link>
            </p>
          ) : null}
          {distribution.replacement_version ? (
            <p className="muted">
              {t('admin.teachingPlanning.versions.replacementVersion')}:{' '}
              <Link
                href={`/admin/teaching-planning/distributions/${distribution.replacement_version.id}`}
              >
                {distribution.replacement_version.version_label ||
                  `#${distribution.replacement_version.id}`}
              </Link>
            </p>
          ) : null}
          {distribution.superseded_by_id ? (
            <p className="muted">
              {t('admin.teachingPlanning.versions.supersededBy')}:{' '}
              <Link
                href={`/admin/teaching-planning/distributions/${distribution.superseded_by_id}`}
              >
                #{distribution.superseded_by_id}
              </Link>
            </p>
          ) : null}
        </Card>
      ) : null}

      <AnnualDistributionEditorDialog
        open={editOpen}
        mode="edit"
        initial={distribution}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          toast.success(t('admin.teachingPlanning.distributions.editSuccess'));
          onReload();
        }}
      />

      <TeachingPlanningResetDialog
        open={resetOpen}
        title={t('admin.teachingPlanning.lifecycle.resetToDraft')}
        onClose={() => setResetOpen(false)}
        onConfirm={async (reason) => {
          const res = await resetAnnualDistributionToDraft(distribution.id, {
            reason,
            reset_reason: reason,
          });
          if (!res.success) throw new Error(res.error.message);
          toast.success(t('admin.teachingPlanning.lifecycle.resetToDraftSuccess'));
          onReload();
        }}
      />

      <ConfirmationDialog
        open={confirmAction != null}
        title={
          confirmAction === 'delete'
            ? t('admin.teachingPlanning.lifecycle.delete')
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.distributions.activate')
              : t('admin.teachingPlanning.lifecycle.archive')
        }
        body={
          confirmAction === 'delete'
            ? t('admin.teachingPlanning.lifecycle.deleteConfirm', { name: distribution.name })
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.distributions.activateConfirm', {
                  name: distribution.name,
                })
              : t('admin.teachingPlanning.lifecycle.archiveConfirm', { name: distribution.name })
        }
        variant={confirmAction === 'activate' ? 'primary' : 'danger'}
        loading={saving}
        confirmLabel={
          confirmAction === 'delete'
            ? t('common.delete')
            : confirmAction === 'activate'
              ? t('admin.teachingPlanning.distributions.activate')
              : t('admin.teachingPlanning.lifecycle.archive')
        }
        onConfirm={confirmDestructive}
        onClose={() => setConfirmAction(null)}
      />
    </div>
  );
}
