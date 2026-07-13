'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Actual Delivery Review detail — FULLY read-only content.
 * Semantic guard: admin never edits delivery content here. The only
 * available actions are "mark reviewed" and "request correction"; there is
 * no edit-content control by design.
 */

import Link from 'next/link';
import { useState } from 'react';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Badge, Card, PageHeader, SectionHead } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import {
  markActualDeliveryReviewed,
  requestActualDeliveryCorrection,
} from '@/features/admin/teaching-planning/api/actual-deliveries-admin-api';
import { deliveryAllowsAction } from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { canReviewActualDeliveries } from '@/lib/permissions/teaching-planning';
import type { ActualDeliveryDetail, DeliveryActivityResult } from '@/types/teaching-delivery';

function DeliveryActivitiesReadOnly({ activities }: { activities: DeliveryActivityResult[] }) {
  const t = useT();
  if (activities.length === 0) {
    return <p className="muted">{t('admin.teachingPlanning.delivery.activities.empty')}</p>;
  }
  return (
    <ol className="jathatha-editor__list">
      {activities.map((activity, index) => (
        <li className="jathatha-editor__activity" key={activity.id ?? `activity-${index}`}>
          <div className="jathatha-editor__head">
            <span className="jathatha-editor__order">
              <bdi dir="ltr">{activity.sequence_order}</bdi>
            </span>
            <strong dir="auto">{activity.name}</strong>
            <Badge tone={activity.result_state === 'completed' ? 'green' : activity.result_state === 'skipped' ? 'red' : 'amber'}>
              {t(`admin.teachingPlanning.delivery.activityResultStates.${activity.result_state}`)}
            </Badge>
            {activity.actual_duration_minutes != null ? (
              <span className="muted tiny">
                <bdi dir="ltr">{activity.actual_duration_minutes}</bdi> {t('admin.teachingPlanning.jathatha.minutes')}
              </span>
            ) : null}
            {activity.completion_percent != null ? (
              <span className="muted tiny">
                <bdi dir="ltr">{activity.completion_percent}%</bdi>
              </span>
            ) : null}
          </div>
          {activity.notes ? (
            <p className="muted" dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
              {activity.notes}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

export function ActualDeliveryReviewDetailView({
  item,
  onReload,
}: {
  item: ActualDeliveryDetail;
  onReload: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const user = useSession();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const canReview =
    canReviewActualDeliveries(user) && deliveryAllowsAction(item, 'mark_reviewed');
  const canCorrect =
    canReviewActualDeliveries(user) && deliveryAllowsAction(item, 'request_correction');

  async function markReviewed() {
    if (saving) return;
    setSaving(true);
    const response = await markActualDeliveryReviewed(item.id);
    setSaving(false);
    if (!response.success) {
      toast.error(response.error.message);
      return;
    }
    toast.success(t('admin.teachingPlanning.delivery.review.marked'));
    onReload();
  }

  async function requestCorrection() {
    if (saving || !reason.trim()) return;
    setSaving(true);
    const response = await requestActualDeliveryCorrection(item.id, { reason: reason.trim() });
    setSaving(false);
    if (!response.success) {
      toast.error(response.error.message);
      return;
    }
    setCorrectionOpen(false);
    setReason('');
    toast.success(t('admin.teachingPlanning.delivery.review.correctionRequested'));
    onReload();
  }

  const contentFields: Array<[string, string | null | undefined]> = [
    ['contentSummary', item.content_summary],
    ['objectiveAchievementSummary', item.objective_achievement_summary],
    ['actualPagesLabel', item.actual_pages_label],
    ['assessmentSummary', item.assessment_summary],
    ['difficultiesObserved', item.difficulties_observed],
    ['remediationAction', item.remediation_action],
    ['nextStep', item.next_step],
    ['teacherNotes', item.teacher_notes],
    ['journalText', item.journal_text],
  ];

  return (
    <div className="teaching-planning-page">
      <Link href="/admin/teaching-planning/actual-deliveries" className="back-link">
        ‹ {t('admin.teachingPlanning.delivery.review.backToList')}
      </Link>

      <PageHeader
        title={item.delivered_title ?? t('admin.teachingPlanning.delivery.review.title')}
        subtitle={item.teacher?.name ?? t('common.dash')}
        actions={
          <div className="teaching-planning-page__actions">
            <TeachingPrintLink href={`/admin/teaching-planning/actual-deliveries/${item.id}/print`} />
            {canReview ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={saving}
                onClick={() => void markReviewed()}
              >
                {t('admin.teachingPlanning.delivery.review.markReviewed')}
              </button>
            ) : null}
            {canCorrect ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={saving}
                onClick={() => setCorrectionOpen(true)}
              >
                {t('admin.teachingPlanning.delivery.review.requestCorrection')}
              </button>
            ) : null}
          </div>
        }
      />

      <div className="teaching-planning-page__actions">
        <WorkflowBadge state={item.state} />
        <WorkflowBadge state={item.review_state} />
        <Badge tone="slate">
          {t('admin.teachingPlanning.jathatha.columns.revision')}: <bdi dir="ltr">{item.revision_no}</bdi>
        </Badge>
        {item.deviation_type && item.deviation_type !== 'none' ? (
          <Badge tone="amber">{t(`admin.teachingPlanning.delivery.deviationTypes.${item.deviation_type}`)}</Badge>
        ) : null}
      </div>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.context.title')} />
        <dl className="teaching-planning-page__meta-grid">
          {(
            [
              ['jathatha.columns.teacher', item.teacher?.name],
              ['jathatha.columns.class', item.class?.name],
              ['columns.subject', item.subject?.name],
              ['jathatha.columns.offering', item.offering?.name],
              [
                'delivery.columns.session',
                [item.session_date, item.session_start_time, item.session_end_time].filter(Boolean).join(' ') || null,
              ],
              [
                'delivery.fields.actualDuration',
                item.actual_duration_minutes != null ? `${item.actual_duration_minutes}` : null,
              ],
            ] as const
          ).map(([labelKey, value]) => (
            <div key={labelKey}>
              <dt>{t(`admin.teachingPlanning.${labelKey}`)}</dt>
              <dd dir="auto">{value || t('common.dash')}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.comparison.title')} />
        <div className="delivery-compare">
          <div className="delivery-compare__col">
            <h4>{t('admin.teachingPlanning.delivery.comparison.planned')}</h4>
            <dl className="teaching-planning-page__meta-grid">
              <div>
                <dt>{t('admin.teachingPlanning.delivery.columns.plannedLine')}</dt>
                <dd dir="auto">{item.planned_distribution_line?.name ?? t('common.dash')}</dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.delivery.fields.plannedSessions')}</dt>
                <dd>
                  <bdi dir="ltr">{item.planned_distribution_line?.planned_sessions ?? t('common.dash')}</bdi>
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.delivery.fields.plannedWindow')}</dt>
                <dd dir="auto">
                  {[item.planned_distribution_line?.planned_window_start, item.planned_distribution_line?.planned_window_end]
                    .filter(Boolean)
                    .join(' → ') || t('common.dash')}
                </dd>
              </div>
            </dl>
          </div>
          <div className="delivery-compare__col">
            <h4>{t('admin.teachingPlanning.delivery.comparison.delivered')}</h4>
            <dl className="teaching-planning-page__meta-grid">
              <div>
                <dt>{t('admin.teachingPlanning.delivery.columns.deliveredLine')}</dt>
                <dd dir="auto">
                  {item.delivered_distribution_line?.name ?? item.delivered_title ?? t('common.dash')}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.delivery.columns.completion')}</dt>
                <dd dir="auto">
                  {item.completion_state
                    ? t(`admin.teachingPlanning.delivery.completionStates.${item.completion_state}`)
                    : t('common.dash')}
                  {item.completion_percent != null ? (
                    <>
                      {' '}
                      <bdi dir="ltr">({item.completion_percent}%)</bdi>
                    </>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>{t('admin.teachingPlanning.delivery.columns.deviation')}</dt>
                <dd dir="auto">
                  {item.deviation_type && item.deviation_type !== 'none'
                    ? t(`admin.teachingPlanning.delivery.deviationTypes.${item.deviation_type}`)
                    : t('common.dash')}
                </dd>
              </div>
            </dl>
            {item.deviation_reason ? (
              <p dir="auto" className="muted">
                {item.deviation_reason}
              </p>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.content.title')} />
        <dl className="teaching-planning-page__meta-grid">
          {contentFields.map(([key, value]) => (
            <div key={key}>
              <dt>{t(`admin.teachingPlanning.delivery.fields.${key}`)}</dt>
              <dd dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                {value || t('common.dash')}
              </dd>
            </div>
          ))}
        </dl>
        {item.correction_reason ? (
          <p dir="auto">
            <strong>{t('admin.teachingPlanning.delivery.fields.correctionReason')}:</strong> {item.correction_reason}
          </p>
        ) : null}
        {item.void_reason ? (
          <p dir="auto">
            <strong>{t('admin.teachingPlanning.delivery.fields.voidReason')}:</strong> {item.void_reason}
          </p>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.activities.title')} />
        <DeliveryActivitiesReadOnly activities={item.activities} />
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.jathatha.readiness.title')} />
        <div className="teaching-planning-page__actions">
          <Badge tone={item.readiness?.ready ? 'green' : 'amber'}>
            {item.readiness?.ready
              ? t('admin.teachingPlanning.jathatha.readiness.ready')
              : t('admin.teachingPlanning.jathatha.readiness.notReady')}
          </Badge>
        </div>
        {item.blockers.length > 0 ? (
          <>
            <h4>{t('admin.teachingPlanning.jathatha.readiness.blockers')}</h4>
            <ul>
              {item.blockers.map((code) => (
                <li key={code} dir="auto">
                  {code}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {item.warnings.length > 0 ? (
          <>
            <h4>{t('admin.teachingPlanning.jathatha.readiness.warnings')}</h4>
            <ul>
              {item.warnings.map((code) => (
                <li key={code} dir="auto">
                  {code}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.revisions.title')} />
        {(item.revision_history ?? []).length === 0 ? (
          <p className="muted">{t('common.dash')}</p>
        ) : (
          <ul>
            {(item.revision_history ?? []).map((revision) => (
              <li key={revision.id}>
                <bdi dir="ltr">{revision.revision_no}</bdi> — <WorkflowBadge state={revision.state} />{' '}
                {revision.review_state ? <WorkflowBadge state={revision.review_state} /> : null}
                {revision.is_correction ? (
                  <Badge tone="amber">{t('admin.teachingPlanning.delivery.revisions.correction')}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.journal.title')} />
        {item.current_journal_entry_id ? (
          <Link href={`/admin/teaching-planning/class-journal/${item.current_journal_entry_id}`} className="btn btn--ghost btn--sm">
            {t('admin.teachingPlanning.delivery.journal.linked')}
          </Link>
        ) : (
          <p className="muted">{t('admin.teachingPlanning.delivery.journal.none')}</p>
        )}
      </Card>

      <Card>
        <SectionHead title={t('admin.teachingPlanning.delivery.progressImpact.title')} />
        {item.progress_summary ? (
          <dl className="teaching-planning-page__meta-grid">
            <div>
              <dt>{t('admin.teachingPlanning.delivery.fields.coveragePercent')}</dt>
              <dd>
                <bdi dir="ltr">{item.progress_summary.coverage_percent ?? t('common.dash')}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('admin.teachingPlanning.delivery.fields.deliveredUnits')}</dt>
              <dd>
                <bdi dir="ltr">{item.progress_summary.delivered_units ?? t('common.dash')}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('admin.teachingPlanning.delivery.fields.remainingUnits')}</dt>
              <dd>
                <bdi dir="ltr">{item.progress_summary.remaining_units ?? t('common.dash')}</bdi>
              </dd>
            </div>
            <div>
              <dt>{t('admin.teachingPlanning.progress.columns.status')}</dt>
              <dd dir="auto">
                {item.progress_summary.status
                  ? t(`admin.teachingPlanning.progress.statuses.${item.progress_summary.status}`)
                  : t('common.dash')}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="muted">{t('common.dash')}</p>
        )}
      </Card>

      <ConfirmationDialog
        open={correctionOpen}
        size="form"
        title={t('admin.teachingPlanning.delivery.review.requestCorrection')}
        body={
          <label className="teaching-planning-dialog">
            {t('admin.teachingPlanning.delivery.review.reasonRequired')}
            <textarea required dir="auto" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
        }
        confirmLabel={t('admin.teachingPlanning.delivery.review.requestCorrection')}
        loading={saving}
        onConfirm={requestCorrection}
        onClose={() => setCorrectionOpen(false)}
      />
    </div>
  );
}
