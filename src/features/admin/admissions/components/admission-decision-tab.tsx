'use client';

import { useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionDecision } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { refName } from '../utils/admission-labels';
import { isAdmissionRejected, resolveRejectionReason } from '../utils/admission-rejection';
import type { AdmissionDetail, DecisionType } from '@/types/admission';

const DECISION_OPTIONS: DecisionType[] = [
  'accepted',
  'accepted_with_condition',
  'waitlisted',
  'rejected',
  'needs_reassessment',
];

export function AdmissionDecisionTab({
  detail,
  canDecide,
  onUpdated,
}: {
  detail: AdmissionDetail;
  canDecide: boolean;
  onUpdated: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const decision = detail.decision;
  const rejected = isAdmissionRejected(detail);
  const [decisionValue, setDecisionValue] = useState<DecisionType>('accepted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
    if (decisionValue === 'rejected' && !decisionNotes.trim()) {
      setError(t('admin.admissions.rejection.reasonRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createAdmissionDecision(
      detail.id,
      {
        decision: decisionValue,
        decision_notes: decisionNotes.trim() || undefined,
        conditions: conditions || undefined,
      },
      { active_school_id: activeSchoolId },
    );
    setSubmitting(false);
    if (res.success) {
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  const rejectionNotesRequired = decisionValue === 'rejected';

  return (
    <div className="admissions-section">
      {decision?.decision ? (
        <section>
          <h2 className="admissions-section__title">{t('admin.admissions.decision.current')}</h2>
          <dl className="admissions-dl">
            <dt>{t('admin.admissions.decision.label')}</dt>
            <dd>
              {rejected
                ? t('admin.admissions.rejection.status')
                : t(`admin.admissions.decisions.${decision.decision}`)}
            </dd>
            {rejected ? (
              <>
                <dt>{t('admin.admissions.rejection.reason')}</dt>
                <dd>{resolveRejectionReason(detail) || t('common.dash')}</dd>
              </>
            ) : null}
            <dt>{t('common.date')}</dt>
            <dd>{decision.decision_date || t('common.dash')}</dd>
            <dt>{t('admin.admissions.decision.by')}</dt>
            <dd>{refName(decision.decision_user) || t('common.dash')}</dd>
            {!rejected ? (
              <>
                <dt>{t('common.note')}</dt>
                <dd>{decision.decision_notes || t('common.dash')}</dd>
              </>
            ) : null}
            <dt>{t('admin.admissions.decision.conditions')}</dt>
            <dd>{decision.conditions || t('common.dash')}</dd>
          </dl>
        </section>
      ) : (
        <p className="muted">{t('admin.admissions.decision.none')}</p>
      )}

      {canDecide && (
        <form className="admissions-inline-form" onSubmit={submit}>
          <h3 className="admissions-section__title">{t('admin.admissions.decision.formTitle')}</h3>
          {error && <div className="alert alert--error">{error}</div>}
          <div className="field">
            <label htmlFor="decision-value">{t('admin.admissions.decision.label')}</label>
            <select
              id="decision-value"
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
          <div className="field">
            <label htmlFor="decision-notes">
              {rejectionNotesRequired
                ? t('admin.admissions.rejection.reason')
                : t('common.note')}
              {rejectionNotesRequired ? ' *' : ''}
            </label>
            <textarea
              id="decision-notes"
              className="input"
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={
                rejectionNotesRequired
                  ? t('admin.admissions.rejection.reasonPlaceholder')
                  : undefined
              }
              required={rejectionNotesRequired}
              aria-required={rejectionNotesRequired}
            />
          </div>
          <div className="field">
            <label htmlFor="decision-conditions">{t('admin.admissions.decision.conditions')}</label>
            <textarea
              id="decision-conditions"
              className="input"
              rows={2}
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary btn--sm" disabled={submitting}>
            {submitting ? t('common.submitting') : t('admin.admissions.decision.submit')}
          </button>
        </form>
      )}
    </div>
  );
}
