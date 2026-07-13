'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Semantic guards:
 * - Actual Delivery Record ≠ Class Teaching Journal Entry (journal is a
 *   read-only, backend-generated side effect of confirming a delivery).
 * - Only the current draft revision is editable; confirmed / corrected /
 *   superseded / voided revisions are immutable content.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { Badge } from '@/components/ui/primitives';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { DeliveryActivityResultsEditor } from '@/features/teacher/delivery/components/delivery-activity-results-editor';
import { DeliveryReadinessPanel } from '@/features/teacher/delivery/components/delivery-readiness-panel';
import {
  confirmActualDelivery,
  createActualDeliveryCorrection,
  fetchTeacherActualDelivery,
  updateActualDelivery,
  voidActualDelivery,
} from '@/features/teacher/delivery/api/teacher-delivery-api';
import { isSameDistributionLine, syncCompletionPercent } from '@/features/teacher/delivery/utils/delivery-teacher-present';
import { TeacherPageHeader, TeacherWorkspaceCard } from '@/features/teacher/ui/teacher-primitives';
import { TeachingPrintLink } from '@/features/teaching-planning/print/components/teaching-print-layout';
import { useT } from '@/features/i18n/locale-context';
import { DELIVERY_DEVIATION_TYPES } from '@/types/teaching-delivery';
import type {
  ActualDeliveryDetail,
  ActualDeliveryUpdatePayload,
  DeliveryCompletionState,
  DeliveryDeviationType,
} from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

const TEXT_FIELDS: (keyof ActualDeliveryUpdatePayload)[] = [
  'delivered_title',
  'content_summary',
  'objective_achievement_summary',
  'actual_pages_label',
  'assessment_summary',
  'difficulties_observed',
  'remediation_action',
  'next_step',
  'teacher_notes',
  'journal_text',
];

const IMMUTABLE_STATES = ['confirmed', 'corrected', 'superseded', 'voided'];

function draftFromDetail(detail: ActualDeliveryDetail): ActualDeliveryUpdatePayload {
  const textFieldEntries = Object.fromEntries(
    TEXT_FIELDS.map((key) => [key, (detail as unknown as Record<string, string | null>)[key as string] ?? '']),
  );
  return {
    ...textFieldEntries,
    actual_start_datetime: detail.actual_start_datetime ?? '',
    actual_end_datetime: detail.actual_end_datetime ?? '',
    actual_duration_minutes: detail.actual_duration_minutes ?? null,
    completion_state: detail.completion_state ?? 'completed',
    completion_percent: detail.completion_percent ?? null,
    deviation_type: detail.deviation_type ?? 'none',
    deviation_reason: detail.deviation_reason ?? '',
    delivered_distribution_line_id: detail.delivered_distribution_line_id ?? null,
    activities: detail.activities,
    attachment_ids: detail.attachment_ids,
  };
}

function parseIdList(value: string): number[] {
  return value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export function TeacherDeliveryEditor({ deliveryId }: { deliveryId: string }) {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();
  const toast = useToast();
  const [data, setData] = useState<ActualDeliveryDetail | null>(null);
  const [draft, setDraft] = useState<ActualDeliveryUpdatePayload>({});
  const [attachmentIdsText, setAttachmentIdsText] = useState('');
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<'confirm' | 'correction' | 'void' | null>(
    search.get('action') === 'correction' ? 'correction' : null,
  );
  const [reason, setReason] = useState('');

  const load = () =>
    fetchTeacherActualDelivery(deliveryId).then((res) => {
      if (res.success) {
        setData(res.data);
        setDraft(draftFromDetail(res.data));
        setAttachmentIdsText(res.data.attachment_ids.join(', '));
      } else {
        setError(res.error);
      }
    });
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryId]);

  if (error) return <ApiErrorView error={error} onRetry={load} />;
  if (!data) return <LoadingState label={t('common.loading')} />;

  const current = data;
  const editable = current.state === 'draft';
  const initialDraft = draftFromDetail(current);
  const dirty =
    JSON.stringify({ ...draft, attachment_ids: parseIdList(attachmentIdsText) }) !== JSON.stringify(initialDraft);
  const sameLine = isSameDistributionLine(
    current.planned_distribution_line_id,
    draft.delivered_distribution_line_id ?? current.delivered_distribution_line_id,
  );

  function updateCompletionState(nextState: DeliveryCompletionState) {
    setDraft({
      ...draft,
      completion_state: nextState,
      completion_percent: syncCompletionPercent(nextState, draft.completion_percent),
    });
  }

  async function save() {
    if (!editable || saving || !dirty) return;
    setSaving(true);
    const payload: ActualDeliveryUpdatePayload = { ...draft, attachment_ids: parseIdList(attachmentIdsText) };
    const res = await updateActualDelivery(deliveryId, payload);
    setSaving(false);
    if (res.success) {
      setData(res.data);
      setDraft(draftFromDetail(res.data));
      setAttachmentIdsText(res.data.attachment_ids.join(', '));
      toast.success(t('teacher.delivery.saveSuccess'));
    } else {
      toast.error(res.error.message);
    }
  }

  async function lifecycle() {
    if (!dialog) return;
    if ((dialog === 'correction' || dialog === 'void') && !reason.trim()) return;
    const action =
      dialog === 'confirm'
        ? confirmActualDelivery(deliveryId)
        : dialog === 'correction'
          ? createActualDeliveryCorrection(deliveryId, { correction_reason: reason.trim() })
          : voidActualDelivery(deliveryId, { void_reason: reason.trim() });
    const res = await action;
    if (res.success) {
      setDialog(null);
      setReason('');
      if (dialog === 'correction') {
        router.push(`/teacher/actual-deliveries/${res.data.id}`);
      } else {
        setData(res.data);
        load();
      }
    } else {
      toast.error(res.error.message);
    }
  }

  const details = [
    current.session_date,
    [current.session_start_time, current.session_end_time].filter(Boolean).join(' – '),
    current.teacher?.name,
    current.class?.name,
    current.subject?.name,
    current.offering?.name,
    current.distribution?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="teacher-workspace delivery-editor">
      <TeacherPageHeader title={current.delivered_title || t('teacher.delivery.title')} subtitle={details} />
      <div className="row mb-2">
        <TeachingPrintLink href={`/teacher/actual-deliveries/${current.id}/print`} />
        <WorkflowBadge state={current.state} />
        <WorkflowBadge state={current.review_state} />
        <span>{t('teacher.delivery.revision', { number: current.revision_no })}</span>
      </div>

      {current.correction_requested && (
        <div className="alert alert--warning">
          {current.review_request_reason}
          {current.allowed_actions?.create_correction && (
            <button className="btn btn--sm" onClick={() => setDialog('correction')}>
              {t('teacher.delivery.createCorrection')}
            </button>
          )}
        </div>
      )}
      {current.review_state === 'reviewed' && <WorkflowBadge state="reviewed" />}
      {IMMUTABLE_STATES.includes(current.state) && (
        <p className="muted">{t('teacher.delivery.immutableNotice')}</p>
      )}

      <TeacherWorkspaceCard title={t('teacher.delivery.contextTitle')}>
        <div className="delivery-editor__compare">
          <div>
            <span className="field__label">{t('teacher.delivery.plannedLine')}</span>
            <p>{current.planned_distribution_line?.name ?? '—'}</p>
          </div>
          <div>
            <span className="field__label">{t('teacher.delivery.deliveredLine')}</span>
            <p>{current.delivered_distribution_line?.name ?? '—'}</p>
          </div>
          <Badge tone={sameLine ? 'green' : 'amber'}>
            {sameLine
              ? t('teacher.delivery.deviation.none')
              : t(`teacher.delivery.deviation.${current.deviation_type ?? 'other'}`)}
          </Badge>
        </div>
      </TeacherWorkspaceCard>

      <DeliveryReadinessPanel readiness={current.readiness} blockers={current.blockers} warnings={current.warnings} />

      <TeacherWorkspaceCard title={t('teacher.delivery.editor')}>
        <div className="stack">
          {TEXT_FIELDS.map((field) => (
            <label className="field" key={field}>
              <span className="field__label">{t(`teacher.delivery.${field}`)}</span>
              <textarea
                dir="auto"
                disabled={!editable}
                value={(draft[field] as string) ?? ''}
                onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
              />
            </label>
          ))}

          <div className="teaching-planning-dialog__row">
            <label>
              {t('teacher.delivery.actualStart')}
              <input
                dir="ltr"
                type="text"
                disabled={!editable}
                value={draft.actual_start_datetime ?? ''}
                onChange={(e) => setDraft({ ...draft, actual_start_datetime: e.target.value })}
              />
            </label>
            <label>
              {t('teacher.delivery.actualEnd')}
              <input
                dir="ltr"
                type="text"
                disabled={!editable}
                value={draft.actual_end_datetime ?? ''}
                onChange={(e) => setDraft({ ...draft, actual_end_datetime: e.target.value })}
              />
            </label>
            <label>
              {t('teacher.delivery.actualDuration')}
              <input
                dir="ltr"
                type="number"
                min={0}
                disabled={!editable}
                value={draft.actual_duration_minutes ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, actual_duration_minutes: e.target.value === '' ? null : Number(e.target.value) })
                }
              />
            </label>
          </div>

          <label className="field">
            <span className="field__label">{t('teacher.delivery.completionState')}</span>
            <select
              disabled={!editable}
              value={draft.completion_state ?? 'completed'}
              onChange={(e) => updateCompletionState(e.target.value as DeliveryCompletionState)}
            >
              {(['completed', 'partial', 'not_completed'] as const).map((s) => (
                <option key={s} value={s}>{t(`teacher.delivery.completion.${s}`)}</option>
              ))}
            </select>
          </label>

          {draft.completion_state === 'partial' && (
            <label className="field">
              <span className="field__label">{t('teacher.delivery.completionPercent')}</span>
              <div className="row">
                <input
                  type="range"
                  min={1}
                  max={99}
                  disabled={!editable}
                  value={draft.completion_percent ?? 50}
                  onChange={(e) =>
                    setDraft({ ...draft, completion_percent: syncCompletionPercent('partial', Number(e.target.value)) })
                  }
                />
                <input
                  type="number"
                  dir="ltr"
                  min={1}
                  max={99}
                  disabled={!editable}
                  value={draft.completion_percent ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, completion_percent: syncCompletionPercent('partial', Number(e.target.value)) })
                  }
                />
              </div>
            </label>
          )}

          {!sameLine && (
            <>
              <p className="alert alert--warning">{t('teacher.delivery.deviationWarning')}</p>
              <label className="field">
                <span className="field__label">{t('teacher.delivery.deviationType')}</span>
                <select
                  disabled={!editable}
                  value={draft.deviation_type ?? 'other'}
                  onChange={(e) => setDraft({ ...draft, deviation_type: e.target.value as DeliveryDeviationType })}
                >
                  {DELIVERY_DEVIATION_TYPES.filter((type) => type !== 'none').map((type) => (
                    <option key={type} value={type}>{t(`teacher.delivery.deviation.${type}`)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field__label">{t('teacher.delivery.deviationReason')}</span>
                <textarea
                  dir="auto"
                  disabled={!editable}
                  value={draft.deviation_reason ?? ''}
                  onChange={(e) => setDraft({ ...draft, deviation_reason: e.target.value })}
                  required
                />
              </label>
            </>
          )}

          <DeliveryActivityResultsEditor
            readOnly={!editable}
            value={draft.activities ?? current.activities}
            onChange={(activities) => setDraft({ ...draft, activities })}
          />

          <label className="field">
            <span className="field__label">{t('teacher.delivery.attachmentIds')}</span>
            <input
              dir="ltr"
              disabled={!editable}
              value={attachmentIdsText}
              onChange={(e) => setAttachmentIdsText(e.target.value)}
              placeholder="1, 2, 3"
            />
          </label>

          {editable && (
            <button className="btn btn--primary" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </TeacherWorkspaceCard>

      <div className="row mt-2">
        {current.allowed_actions?.confirm && (
          <button className="btn btn--primary" onClick={() => setDialog('confirm')}>{t('common.confirm')}</button>
        )}
        {current.allowed_actions?.create_correction && (
          <button className="btn btn--ghost" onClick={() => setDialog('correction')}>
            {t('teacher.delivery.createCorrection')}
          </button>
        )}
        {current.allowed_actions?.void && (
          <button className="btn btn--danger" onClick={() => setDialog('void')}>{t('teacher.delivery.void')}</button>
        )}
      </div>

      {(current.current_journal_entry_id || current.progress_summary) && (
        <TeacherWorkspaceCard title={t('teacher.delivery.effects')}>
          <div className="row">
            {current.current_journal_entry_id && (
              <Link className="btn btn--ghost btn--sm" href={`/teacher/class-journal/${current.current_journal_entry_id}`}>
                {t('teacher.delivery.viewJournal')}
              </Link>
            )}
            {current.progress_summary && (
              <Link className="btn btn--ghost btn--sm" href="/teacher/teaching-progress">
                {t('teacher.delivery.viewProgress')}
              </Link>
            )}
          </div>
        </TeacherWorkspaceCard>
      )}

      <TeacherWorkspaceCard title={t('teacher.delivery.revisions')}>
        <ul>
          {current.revision_history?.map((revision) => (
            <li key={revision.id}>
              #{revision.revision_no} · <WorkflowBadge state={revision.state} />{' '}
              {revision.review_state && <WorkflowBadge state={revision.review_state} />} {revision.correction_reason}
            </li>
          ))}
        </ul>
      </TeacherWorkspaceCard>

      <ConfirmationDialog
        open={dialog !== null}
        title={t(`teacher.delivery.${dialog ?? 'confirm'}`)}
        body={
          dialog === 'confirm' ? (
            t('teacher.delivery.confirmEffects')
          ) : (
            <textarea
              dir="auto"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder={t('teacher.delivery.reasonRequired')}
            />
          )
        }
        onConfirm={lifecycle}
        onClose={() => setDialog(null)}
        variant={dialog === 'void' ? 'danger' : 'primary'}
      />
    </div>
  );
}
