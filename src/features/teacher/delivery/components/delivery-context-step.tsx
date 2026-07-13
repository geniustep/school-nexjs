'use client';

/**
 * @raqeem-design docs/design/RAQEEM-DESIGN.md
 * @design-status adopted
 *
 * Semantic guard: this resolves the context to start an Actual Delivery
 * record. It never treats a Teacher Jathatha as a delivery — the Jathatha is
 * shown for orientation only.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { useToast } from '@/components/ui/toast';
import { WorkflowBadge } from '@/components/badges/workflow-badge';
import { createActualDelivery, fetchDeliveryContext } from '@/features/teacher/delivery/api/teacher-delivery-api';
import {
  defaultDeviationType,
  isSameDistributionLine,
  requiresDeviationReason,
  syncCompletionPercent,
} from '@/features/teacher/delivery/utils/delivery-teacher-present';
import { useT } from '@/features/i18n/locale-context';
import { DELIVERY_DEVIATION_TYPES } from '@/types/teaching-delivery';
import type {
  DeliveryCompletionState,
  DeliveryContextResponse,
  DeliveryDeviationType,
} from '@/types/teaching-delivery';
import type { ApiErrorBody } from '@/types/api';
import '@/features/teacher/delivery/delivery.css';

export function DeliveryContextStep({ occurrenceId }: { occurrenceId: string }) {
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const [context, setContext] = useState<DeliveryContextResponse | null>(null);
  const [error, setError] = useState<ApiErrorBody | null>(null);
  const [lineId, setLineId] = useState<number | null>(null);
  const [completionState, setCompletionState] = useState<DeliveryCompletionState>('completed');
  const [completionPercent, setCompletionPercent] = useState<number>(100);
  const [deviationType, setDeviationType] = useState<DeliveryDeviationType>('none');
  const [deviationReason, setDeviationReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchDeliveryContext(occurrenceId).then((res) => {
      if (res.success) {
        setContext(res.data);
        if (res.data.current_delivery?.id) {
          router.replace(`/teacher/actual-deliveries/${res.data.current_delivery.id}`);
        }
      } else {
        setError(res.error);
      }
    });
  }, [occurrenceId, router]);

  if (error) return <ApiErrorView error={error} onRetry={() => setError(null)} />;
  if (!context) return <LoadingState label={t('common.loading')} />;
  const ctx = context;

  const plannedId = ctx.planned_distribution_line?.id ?? null;
  const sameLine = lineId !== null && isSameDistributionLine(plannedId, lineId);
  const selectedLine =
    ctx.remaining_distribution_lines.find((line) => line.id === lineId) ??
    (lineId !== null && lineId === plannedId ? ctx.planned_distribution_line : null);
  const reasonRequired = requiresDeviationReason(plannedId, lineId, deviationType);
  const canCreate =
    lineId !== null &&
    (completionState !== 'partial' || (completionPercent >= 1 && completionPercent <= 99)) &&
    (!reasonRequired || deviationReason.trim().length > 0) &&
    (ctx.allowed_actions?.create_delivery === true || ctx.allowed_actions?.create === true);

  function selectLine(nextId: number | null) {
    setLineId(nextId);
    const nextType = defaultDeviationType(plannedId, nextId);
    setDeviationType(nextType);
    if (nextType === 'none') setDeviationReason('');
  }

  function selectCompletionState(nextState: DeliveryCompletionState) {
    setCompletionState(nextState);
    setCompletionPercent(syncCompletionPercent(nextState, completionPercent));
  }

  async function submit() {
    if (!canCreate || submitting || lineId === null) return;
    setSubmitting(true);
    const res = await createActualDelivery({
      session_occurrence_id: Number(occurrenceId),
      teacher_jathatha_id: ctx.current_jathatha?.id ?? null,
      delivered_distribution_line_id: lineId,
      completion_state: completionState,
      completion_percent: completionState === 'partial' ? completionPercent : null,
      deviation_type: deviationType,
      deviation_reason: reasonRequired ? deviationReason.trim() : null,
    });
    setSubmitting(false);
    if (res.success) router.push(`/teacher/actual-deliveries/${res.data.id}`);
    else toast.error(res.error.message);
  }

  const details = [
    ctx.occurrence?.date,
    [ctx.occurrence?.start_time, ctx.occurrence?.end_time].filter(Boolean).join(' – '),
    ctx.occurrence?.class?.name,
    ctx.occurrence?.subject?.name,
    ctx.assignment?.name,
    ctx.offering?.name,
    ctx.active_distribution?.name,
  ]
    .filter(Boolean)
    .join(' · ');

  const remainingOptions = ctx.remaining_distribution_lines.filter((line) => line.id !== plannedId);

  return (
    <section className="card stack delivery-context-step">
      <h2>{t('teacher.delivery.context')}</h2>
      <p className="muted">{details}</p>

      {ctx.current_jathatha && (
        <div className="row">
          <span>{t('teacher.delivery.jathathaSummary')}: {ctx.current_jathatha.name}</span>
          {ctx.current_jathatha_state && <WorkflowBadge state={ctx.current_jathatha_state} />}
        </div>
      )}

      {ctx.blockers.map((item) => (
        <p className="alert alert--danger" key={item}>{item}</p>
      ))}
      {ctx.warnings.map((item) => (
        <p className="alert alert--warning" key={item}>{item}</p>
      ))}

      <div className="delivery-context-step__planned">
        <span className="field__label">{t('teacher.delivery.plannedLine')}</span>
        <p>{ctx.planned_distribution_line?.name ?? t('teacher.delivery.noPlannedLine')}</p>
      </div>

      {ctx.progress_summary && (
        <p className="muted">
          {t('teacher.delivery.progressSummary')}: {ctx.progress_summary.summary ?? `${ctx.progress_summary.coverage_percent ?? 0}%`}
        </p>
      )}

      <label className="field">
        <span className="field__label">{t('teacher.delivery.deliveredLine')}</span>
        <select value={lineId ?? ''} onChange={(e) => selectLine(Number(e.target.value) || null)} required>
          <option value="">{t('common.select')}</option>
          {ctx.planned_distribution_line && (
            <option value={ctx.planned_distribution_line.id}>
              {ctx.planned_distribution_line.name} ({t('teacher.delivery.plannedLine')})
            </option>
          )}
          {remainingOptions.map((line) => (
            <option key={line.id} value={line.id}>
              {line.name}
              {line.completed ? ` — ${t('teacher.delivery.lineCompletedWarning')}` : ''}
            </option>
          ))}
        </select>
      </label>
      {selectedLine?.completed && <p className="alert alert--warning">{t('teacher.delivery.lineCompletedWarning')}</p>}

      <label className="field">
        <span className="field__label">{t('teacher.delivery.completionState')}</span>
        <select
          value={completionState}
          onChange={(e) => selectCompletionState(e.target.value as DeliveryCompletionState)}
        >
          {(['completed', 'partial', 'not_completed'] as const).map((s) => (
            <option key={s} value={s}>{t(`teacher.delivery.completion.${s}`)}</option>
          ))}
        </select>
      </label>

      {completionState === 'partial' && (
        <label className="field">
          <span className="field__label">{t('teacher.delivery.completionPercent')}</span>
          <div className="row">
            <input
              type="range"
              min={1}
              max={99}
              value={completionPercent}
              onChange={(e) => setCompletionPercent(syncCompletionPercent('partial', Number(e.target.value)))}
            />
            <input
              type="number"
              dir="ltr"
              min={1}
              max={99}
              value={completionPercent}
              onChange={(e) => setCompletionPercent(syncCompletionPercent('partial', Number(e.target.value)))}
            />
          </div>
        </label>
      )}

      {lineId !== null && !sameLine && (
        <>
          <p className="alert alert--warning">{t('teacher.delivery.deviationWarning')}</p>
          <label className="field">
            <span className="field__label">{t('teacher.delivery.deviationType')}</span>
            <select value={deviationType} onChange={(e) => setDeviationType(e.target.value as DeliveryDeviationType)}>
              {DELIVERY_DEVIATION_TYPES.filter((type) => type !== 'none').map((type) => (
                <option key={type} value={type}>{t(`teacher.delivery.deviation.${type}`)}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field__label">{t('teacher.delivery.deviationReason')}</span>
            <textarea
              dir="auto"
              value={deviationReason}
              onChange={(e) => setDeviationReason(e.target.value)}
              required
            />
          </label>
        </>
      )}

      <button className="btn btn--primary" type="button" disabled={!canCreate || submitting} onClick={() => void submit()}>
        {submitting ? t('common.submitting') : t('teacher.delivery.createDraft')}
      </button>
    </section>
  );
}
