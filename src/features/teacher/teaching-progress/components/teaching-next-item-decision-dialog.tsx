'use client';

/**
 * Teacher chooses an alternative / postponed remaining item.
 * Reason required for select_alternative and postpone_item.
 * Does not register delivery — decision only.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { submitTeacherExecutionDecision } from '@/features/teacher/teaching-progress/api/teacher-curriculum-progress-api';
import type {
  TeachingExecutionDecisionType,
  TeachingRemainingItem,
} from '@/types/teaching-delivery';

export type TeachingNextItemDecisionDialogProps = {
  open: boolean;
  classId: number;
  offeringId: number;
  mode: 'select_alternative' | 'postpone_item';
  candidates: TeachingRemainingItem[];
  suggestedLineId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function TeachingNextItemDecisionDialog({
  open,
  classId,
  offeringId,
  mode,
  candidates,
  suggestedLineId,
  onClose,
  onSuccess,
}: TeachingNextItemDecisionDialogProps) {
  const t = useT();
  const titleId = useId();
  const descId = useId();
  const reasonId = useId();
  const reasonErrorId = useId();
  const liveId = useId();
  const firstFocusRef = useRef<HTMLSelectElement | null>(null);
  const [selectedLineId, setSelectedLineId] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  const eligible = candidates.filter((item) => {
    if (item.eligibility === false) return false;
    if (item.completed) return false;
    if (mode === 'select_alternative' && suggestedLineId && item.distribution_line_id === suggestedLineId) {
      return false;
    }
    if (mode === 'postpone_item' && suggestedLineId && item.distribution_line_id !== suggestedLineId) {
      // Postpone targets the suggested/current item by default; allow any remaining if no suggestion.
      return true;
    }
    return true;
  });

  useEffect(() => {
    if (!open) return;
    setSelectedLineId(
      mode === 'postpone_item' && suggestedLineId
        ? String(suggestedLineId)
        : eligible[0]
          ? String(eligible[0].distribution_line_id)
          : '',
    );
    setReason('');
    setReasonError(null);
    setSubmitError(null);
    setLiveMessage('');
    const timer = window.setTimeout(() => firstFocusRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, mode, suggestedLineId]);

  if (!open) return null;

  async function handleSubmit() {
    if (busy) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError(t('teacher.teachingProgress.decision.reasonRequired'));
      return;
    }
    const lineId = Number(selectedLineId);
    if (!Number.isFinite(lineId) || lineId <= 0) {
      setSubmitError(t('teacher.teachingProgress.decision.lineRequired'));
      return;
    }

    setBusy(true);
    setReasonError(null);
    setSubmitError(null);

    const decision_type: TeachingExecutionDecisionType = mode;
    const res = await submitTeacherExecutionDecision({
      decision_type,
      class_id: classId,
      offering_id: offeringId,
      distribution_line_id: lineId,
      selected_distribution_line_id: lineId,
      reason: trimmed,
    });

    setBusy(false);
    if (!res.success) {
      setSubmitError(res.error?.message ?? t('errors.loadFailedRetry'));
      return;
    }
    setLiveMessage(t('teacher.teachingProgress.decision.saved'));
    onSuccess();
    onClose();
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="card modal-panel confirmation-dialog modal-panel--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id={titleId}>
          {mode === 'postpone_item'
            ? t('teacher.teachingProgress.decision.postponeTitle')
            : t('teacher.teachingProgress.decision.alternativeTitle')}
        </h3>
        <p id={descId} className="muted">
          {t('teacher.teachingProgress.decision.description')}
        </p>

        <div className="form-stack" style={{ marginBlockStart: 12 }}>
          <div className="field">
            <label htmlFor={`${titleId}-line`}>
              {t('teacher.teachingProgress.decision.selectItem')}
            </label>
            <select
              id={`${titleId}-line`}
              ref={firstFocusRef}
              className="select"
              value={selectedLineId}
              disabled={busy || eligible.length === 0}
              onChange={(event) => setSelectedLineId(event.target.value)}
            >
              {eligible.length === 0 ? (
                <option value="">{t('teacher.teachingProgress.decision.noEligible')}</option>
              ) : (
                eligible.map((item) => (
                  <option key={item.distribution_line_id} value={item.distribution_line_id}>
                    {[
                      item.sequence_order != null ? `#${item.sequence_order}` : null,
                      item.title ?? item.name,
                      item.is_partial ? t('teacher.teachingProgress.buckets.partial') : null,
                      item.postponed ? t('teacher.teachingProgress.buckets.deferred') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="field">
            <label htmlFor={reasonId}>{t('teacher.teachingProgress.decision.reasonLabel')}</label>
            <textarea
              id={reasonId}
              className="textarea"
              rows={3}
              value={reason}
              disabled={busy}
              aria-invalid={Boolean(reasonError)}
              aria-describedby={reasonError ? reasonErrorId : undefined}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
            />
            {reasonError ? (
              <p id={reasonErrorId} className="field-error" role="alert">
                {reasonError}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="alert alert--danger" role="alert">
              {submitError}
            </p>
          ) : null}
        </div>

        <div className="row confirmation-dialog__actions">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={busy || eligible.length === 0}
            onClick={() => void handleSubmit()}
          >
            {busy ? t('common.submitting') : t('teacher.teachingProgress.decision.save')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
        <div
          id={liveId}
          aria-live="polite"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
            border: 0,
          }}
        >
          {liveMessage}
        </div>
      </div>
    </div>
  );
}
