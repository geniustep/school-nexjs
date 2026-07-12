'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import { createAdmissionDecision } from '../api/admissions-api';
import { admissionApiErrorMessage } from '../utils/admission-errors';
import { refName } from '../utils/admission-labels';
import { isAdmissionRejected, resolveRejectionReason } from '../utils/admission-rejection';
import { normalizeAdmissionDecision } from '../utils/normalize-admission-decision';
import {
  admissionDecisionLabelKey,
  decisionRequiresConditions,
  decisionRequiresRejectionReason,
  getAdmissionDecisionOptions,
  isAdmissionDecisionOption,
  type AdmissionDecisionOption,
} from '../utils/admission-decision-options';
import type { AdmissionDetail } from '@/types/admission';

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
  const decision = normalizeAdmissionDecision(detail);
  const rejected = isAdmissionRejected(detail);
  const options = getAdmissionDecisionOptions();

  const [decisionValue, setDecisionValue] = useState<AdmissionDecisionOption>('accepted');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [conditions, setConditions] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (decision?.decision && isAdmissionDecisionOption(decision.decision)) {
      setDecisionValue(decision.decision);
      setDecisionNotes(decision.decision_notes ?? '');
      setConditions(decision.conditions ?? '');
      return;
    }
    setDecisionValue('accepted');
    setDecisionNotes('');
    setConditions('');
  }, [detail.id, decision?.decision, decision?.decision_notes, decision?.conditions]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (activeSchoolId == null) return;
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
      detail.id,
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
    if (res.success) {
      onUpdated();
      return;
    }
    setError(admissionApiErrorMessage(res.error, t));
  }

  const needsReason = decisionRequiresRejectionReason(decisionValue);
  const needsConditions = decisionRequiresConditions(decisionValue);

  let currentDecisionLabel = t('admin.admissions.decision.none');
  if (decision?.decision) {
    if (rejected || decision.decision === 'rejected') {
      currentDecisionLabel = t('admin.admissions.schoolDecision.rejected');
    } else if (isAdmissionDecisionOption(decision.decision)) {
      currentDecisionLabel = t(admissionDecisionLabelKey(decision.decision));
    } else {
      currentDecisionLabel = decision.decision;
    }
  }

  return (
    <div className="admissions-section" data-testid="admission-decision-tab">
      {decision?.decision ? (
        <section data-testid="admission-decision-current">
          <h2 className="admissions-section__title">{t('admin.admissions.decision.current')}</h2>
          <dl className="admissions-dl">
            <dt>{t('admin.admissions.decision.label')}</dt>
            <dd data-testid="admission-decision-current-value">{currentDecisionLabel}</dd>
            {rejected || decision.decision === 'rejected' ? (
              <>
                <dt>{t('admin.admissions.rejection.reason')}</dt>
                <dd>{resolveRejectionReason(detail) || t('common.dash')}</dd>
              </>
            ) : null}
            <dt>{t('common.date')}</dt>
            <dd>{decision.decision_date || t('common.dash')}</dd>
            <dt>{t('admin.admissions.decision.by')}</dt>
            <dd>{refName(decision.decision_user) || t('common.dash')}</dd>
            {!rejected && decision.decision !== 'rejected' ? (
              <>
                <dt>{t('common.note')}</dt>
                <dd>{decision.decision_notes || t('common.dash')}</dd>
              </>
            ) : null}
            {decision.decision === 'accepted_with_condition' || decision.conditions ? (
              <>
                <dt>{t('admin.admissions.decision.conditions')}</dt>
                <dd data-testid="admission-decision-current-conditions">
                  {decision.conditions || t('common.dash')}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="muted" data-testid="admission-decision-none">
          {t('admin.admissions.decision.none')}
        </p>
      )}

      {canDecide ? (
        <form
          className="admissions-inline-form"
          onSubmit={submit}
          data-testid="admission-decision-form"
        >
          <h3 className="admissions-section__title">{t('admin.admissions.decision.formTitle')}</h3>
          {error ? <div className="alert alert--error">{error}</div> : null}
          <div className="field">
            <label htmlFor="decision-value">{t('admin.admissions.actions.makeDecision')}</label>
            <select
              id="decision-value"
              className="input"
              value={decisionValue}
              data-testid="admission-decision-select"
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
              <label htmlFor="decision-conditions">
                {t('admin.admissions.decision.conditions')} *
              </label>
              <textarea
                id="decision-conditions"
                className="input"
                rows={2}
                value={conditions}
                required
                aria-required
                data-testid="admission-decision-conditions"
                onChange={(e) => setConditions(e.target.value)}
              />
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="decision-notes">
              {needsReason ? t('admin.admissions.rejection.reason') : t('common.note')}
              {needsReason ? ' *' : ''}
            </label>
            <textarea
              id="decision-notes"
              className="input"
              rows={2}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={
                needsReason ? t('admin.admissions.rejection.reasonPlaceholder') : undefined
              }
              required={needsReason}
              aria-required={needsReason}
              data-testid="admission-decision-notes"
            />
          </div>
          <button
            type="submit"
            className="btn btn--primary btn--sm"
            disabled={submitting}
            data-testid="admission-decision-submit"
          >
            {submitting ? t('common.submitting') : t('admin.admissions.decision.submit')}
          </button>
        </form>
      ) : null}
    </div>
  );
}
