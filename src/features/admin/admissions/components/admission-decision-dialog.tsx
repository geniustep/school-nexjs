'use client';

import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionDecision } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import {
  admissionDecisionLabelKey,
  decisionRequiresConditions,
  decisionRequiresRejectionReason,
  getAdmissionDecisionOptions,
  isAdmissionDecisionOption,
  type AdmissionDecisionOption,
} from '../utils/admission-decision-options';

export function AdmissionDecisionDialog({
  admissionId,
  open,
  onClose,
  onSuccess,
  initialDecision,
  initialNotes,
  initialConditions,
}: {
  admissionId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDecision?: string | null;
  initialNotes?: string | null;
  initialConditions?: string | null;
}) {
  const t = useT();
  const titleId = useId();
  const { activeSchoolId } = useAdminSession();
  const options = getAdmissionDecisionOptions();
  const [decisionValue, setDecisionValue] = useState<AdmissionDecisionOption>('accepted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (initialDecision && isAdmissionDecisionOption(initialDecision)) {
      setDecisionValue(initialDecision);
      setDecisionNotes(initialNotes ?? '');
      setConditions(initialConditions ?? '');
    } else {
      setDecisionValue('accepted');
      setDecisionNotes('');
      setConditions('');
    }
    setError(null);
    setSubmitting(false);
  }, [open, admissionId, initialDecision, initialNotes, initialConditions]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || submitting) return;
    if (decisionRequiresRejectionReason(decisionValue) && !decisionNotes.trim()) {
      setError(t('admin.admissions.rejection.reasonRequired'));
      return;
    }
    if (decisionRequiresConditions(decisionValue) && !conditions.trim()) {
      setError(t('admin.admissions.decision.conditionsRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionDecision(
      admissionId,
      {
        decision: decisionValue,
        decision_notes: decisionNotes.trim() || undefined,
        conditions: decisionRequiresConditions(decisionValue)
          ? conditions.trim()
          : conditions.trim() || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (!res.success) {
      setError(admissionApiErrorMessage(res.error, t));
      return;
    }
    onSuccess();
    onClose();
  }

  const needsReason = decisionRequiresRejectionReason(decisionValue);
  const needsConditions = decisionRequiresConditions(decisionValue);

  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal-panel confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        data-testid="admission-decision-dialog"
      >
        <h2 id={titleId}>{t('admin.admissions.actions.makeDecision')}</h2>
        <p className="admission-decision-dialog__hint">{t('admin.admissions.decision.readyHint')}</p>
        <form className="admissions-inline-form" onSubmit={submit}>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="field">
            <label htmlFor={`decision-dialog-${admissionId}`}>
              {t('admin.admissions.actions.makeDecision')}
            </label>
            <select
              id={`decision-dialog-${admissionId}`}
              className="input"
              value={decisionValue}
              data-testid="admission-decision-dialog-select"
              onChange={(e) => setDecisionValue(e.target.value as AdmissionDecisionOption)}
            >
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {t(admissionDecisionLabelKey(opt))}
                </option>
              ))}
            </select>
          </div>
          {needsConditions ? (
            <div className="field">
              <label htmlFor={`decision-conditions-${admissionId}`}>
                {t('admin.admissions.decision.conditions')} *
              </label>
              <textarea
                id={`decision-conditions-${admissionId}`}
                className="input"
                rows={2}
                value={conditions}
                required
                data-testid="admission-decision-dialog-conditions"
                onChange={(e) => setConditions(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor={`decision-notes-${admissionId}`}>
              {needsReason
                ? `${t('admin.admissions.rejection.reason')} *`
                : t('common.note')}
            </label>
            <textarea
              id={`decision-notes-${admissionId}`}
              className="input"
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              required={needsReason}
              data-testid="admission-decision-dialog-notes"
            />
          </div>
          <div className="confirmation-dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitting}>
              {submitting ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
