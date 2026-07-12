'use client';

import { useEffect, useId, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionDecision } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import type { DecisionType } from '@/types/admission';

const DECISION_OPTIONS: DecisionType[] = [
  'accepted',
  'accepted_with_condition',
  'waitlisted',
  'needs_reassessment',
  'rejected',
];

export function AdmissionDecisionDialog({
  admissionId,
  open,
  onClose,
  onSuccess,
}: {
  admissionId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const { activeSchoolId } = useAdminSession();
  const [decisionValue, setDecisionValue] = useState<DecisionType>('accepted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDecisionValue('accepted');
    setDecisionNotes('');
    setConditions('');
    setError(null);
    setSubmitting(false);
  }, [open, admissionId]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null || submitting) return;
    if (decisionValue === 'rejected' && !decisionNotes.trim()) {
      setError(t('admin.admissions.rejection.reasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionDecision(
      admissionId,
      {
        decision: decisionValue,
        decision_notes: decisionNotes.trim() || undefined,
        conditions: conditions.trim() || undefined,
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

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="card modal-panel confirmation-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId}>{t('admin.admissions.actions.recordDecision')}</h2>
        <form className="admissions-inline-form" onSubmit={submit}>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="field">
            <label htmlFor={`decision-dialog-${admissionId}`}>
              {t('admin.admissions.decision.label')}
            </label>
            <select
              id={`decision-dialog-${admissionId}`}
              className="input"
              value={decisionValue}
              onChange={(e) => setDecisionValue(e.target.value as DecisionType)}
            >
              {DECISION_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`admin.admissions.decisions.${opt}`)}
                </option>
              ))}
            </select>
          </div>
          {decisionValue === 'accepted_with_condition' ? (
            <div className="field">
              <label htmlFor={`decision-conditions-${admissionId}`}>
                {t('admin.admissions.decision.conditions')}
              </label>
              <textarea
                id={`decision-conditions-${admissionId}`}
                className="input"
                rows={2}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor={`decision-notes-${admissionId}`}>
              {decisionValue === 'rejected'
                ? t('admin.admissions.rejection.reason')
                : t('common.note')}
            </label>
            <textarea
              id={`decision-notes-${admissionId}`}
              className="input"
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              required={decisionValue === 'rejected'}
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
    </div>
  );
}
