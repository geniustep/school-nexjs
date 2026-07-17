'use client';

import { useEffect, useId, useRef } from 'react';
import { Badge } from '@/components/ui/primitives';
import { NumericText } from '@/components/ui/numeric-text';
import { useT } from '@/features/i18n/locale-context';
import type { TeacherProgramItemView } from '@/features/teaching-progress/merge-program-items';
import type { TeacherProgramPrimaryAction } from '@/features/teaching-progress/program-item-primary-action';

export function TeacherProgramItemDetailsDialog({
  open,
  item,
  primary,
  onClose,
}: {
  open: boolean;
  item: TeacherProgramItemView | null;
  primary: TeacherProgramPrimaryAction | null;
  onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open || !item) return null;

  const plannedUnits =
    (item.delivered_session_units ?? 0) + (item.remaining_units ?? 0);
  const statusText = item.completed
    ? t('teacher.teachingProgress.buckets.completed')
    : item.is_partial
      ? t('teacher.teachingProgress.buckets.partial')
      : item.postponed
        ? t('teacher.teachingProgress.buckets.deferred')
        : t('teacher.teachingProgress.buckets.notStarted');

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal-panel confirmation-dialog modal-panel--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId} dir="auto">
          {item.title ?? item.name ?? t('teacher.teachingProgress.actions.viewDetails')}
        </h3>
        <p id={descId} className="muted">
          {t('teacher.teachingProgress.itemDetailsDesc')}
        </p>

        <dl className="stack" style={{ marginBlockStart: 12 }}>
          {item.sequence_order != null ? (
            <>
              <dt>{t('teacher.teachingProgress.columns.order')}</dt>
              <dd>
                <NumericText>{item.sequence_order}</NumericText>
              </dd>
            </>
          ) : null}
          {item.item_type ? (
            <>
              <dt>{t('teacher.teachingProgress.itemType')}</dt>
              <dd dir="auto">{item.item_type}</dd>
            </>
          ) : null}
          {item.planned_period?.start || item.planned_period?.end ? (
            <>
              <dt>{t('teacher.teachingProgress.plannedPeriod')}</dt>
              <dd>
                <NumericText variant="date">
                  {[item.planned_period.start, item.planned_period.end].filter(Boolean).join(' – ')}
                </NumericText>
              </dd>
            </>
          ) : null}
          <dt>{t('teacher.teachingProgress.columns.planned')}</dt>
          <dd>
            <NumericText>{plannedUnits > 0 ? plannedUnits : t('common.dash')}</NumericText>
          </dd>
          <dt>{t('teacher.teachingProgress.columns.done')}</dt>
          <dd>
            <NumericText>{item.delivered_session_units ?? 0}</NumericText>
          </dd>
          <dt>{t('teacher.teachingProgress.columns.remaining')}</dt>
          <dd>
            <NumericText>{item.remaining_units ?? 0}</NumericText>
          </dd>
          <dt>{t('teacher.teachingProgress.columns.status')}</dt>
          <dd>
            <Badge tone={item.completed ? 'green' : item.is_partial ? 'amber' : 'slate'}>
              {statusText}
            </Badge>
          </dd>
          {item.completion_percent != null ? (
            <>
              <dt>{t('teacher.teachingProgress.partialPercent')}</dt>
              <dd>
                <NumericText>{item.completion_percent}%</NumericText>
              </dd>
            </>
          ) : null}
          {item.last_delivery_at ? (
            <>
              <dt>{t('teacher.teachingProgress.lastDelivery')}</dt>
              <dd>
                <NumericText variant="date">{item.last_delivery_at}</NumericText>
              </dd>
            </>
          ) : null}
          {item.latest_postponement_reason ? (
            <>
              <dt>{t('teacher.teachingProgress.postponementReason')}</dt>
              <dd dir="auto">{item.latest_postponement_reason}</dd>
            </>
          ) : null}
          {item.next_step ? (
            <>
              <dt>{t('teacher.teachingProgress.nextStep')}</dt>
              <dd dir="auto">{item.next_step}</dd>
            </>
          ) : null}
          {item.occurrence_id || item.session_occurrence_id ? (
            <>
              <dt>{t('teacher.teachingProgress.targets.session')}</dt>
              <dd>
                <NumericText>
                  {item.occurrence_id ?? item.session_occurrence_id}
                </NumericText>
              </dd>
            </>
          ) : null}
          {item.teacher_jathatha_id ? (
            <>
              <dt>{t('teacher.teachingProgress.targets.jathatha')}</dt>
              <dd>
                <NumericText>{item.teacher_jathatha_id}</NumericText>
              </dd>
            </>
          ) : null}
          {item.actual_delivery_id || item.current_delivery_id || item.last_delivery_id ? (
            <>
              <dt>{t('teacher.teachingProgress.targets.delivery')}</dt>
              <dd>
                <NumericText>
                  {item.actual_delivery_id ??
                    item.current_delivery_id ??
                    item.last_delivery_id}
                </NumericText>
              </dd>
            </>
          ) : null}
          {primary ? (
            <>
              <dt>{t('teacher.teachingProgress.primaryAction')}</dt>
              <dd dir="auto">{t(primary.labelKey)}</dd>
            </>
          ) : null}
        </dl>

        <div className="row confirmation-dialog__actions">
          <button ref={closeRef} type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
