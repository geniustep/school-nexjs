'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { ApiErrorBody } from '@/types/api';
import type {
  StudentDepartureDecisionPayload,
  StudentDepartureFinancialPolicy,
  StudentDeparturePreview,
  StudentDepartureType,
} from '@/types/student-departure';
import {
  confirmStudentDeparture,
  previewStudentDeparture,
} from '../api/student-departure-api';
import styles from './student-departure-drawer.module.css';

const POLICIES: StudentDepartureFinancialPolicy[] = [
  'FULL_CURRENT_PERIOD',
  'PRORATE_TO_DEPARTURE_DATE',
  'KEEP_CURRENT_STATE_STOP_NEXT_PERIOD',
];

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `departure-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function policyLabelKey(policy: StudentDepartureFinancialPolicy): string {
  if (policy === 'FULL_CURRENT_PERIOD') return 'admin.student360.departure.policy.full';
  if (policy === 'PRORATE_TO_DEPARTURE_DATE') return 'admin.student360.departure.policy.prorate';
  return 'admin.student360.departure.policy.keep';
}

function policyDescriptionKey(policy: StudentDepartureFinancialPolicy): string {
  if (policy === 'FULL_CURRENT_PERIOD') return 'admin.student360.departure.policy.fullDescription';
  if (policy === 'PRORATE_TO_DEPARTURE_DATE') return 'admin.student360.departure.policy.prorateDescription';
  return 'admin.student360.departure.policy.keepDescription';
}

function departureErrorMessage(error: ApiErrorBody, t: ReturnType<typeof useT>): string {
  switch (error.code) {
    case 'forbidden':
    case 'permission_denied':
      return t('admin.student360.departure.error.forbidden');
    case 'departure_finance_capability_required':
      return t('admin.student360.departure.error.financeCapability');
    case 'financial_policy_unavailable':
      return t('admin.student360.departure.error.policyUnavailable');
    case 'preview_stale':
      return t('admin.student360.departure.previewStale');
    case 'departure_idempotency_conflict':
      return t('admin.student360.departure.error.idempotencyConflict');
    case 'departure_idempotency_in_progress':
      return t('admin.student360.departure.error.inProgress');
    default:
      return error.message || t('admin.student360.departure.error.generic');
  }
}

export function StudentDepartureDrawer({
  open,
  studentId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  studentId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [departureType, setDepartureType] = useState<StudentDepartureType | ''>('');
  const [lastDay, setLastDay] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [destinationSchool, setDestinationSchool] = useState('');
  const [financialPolicy, setFinancialPolicy] = useState<StudentDepartureFinancialPolicy | null>(null);
  const [preview, setPreview] = useState<StudentDeparturePreview | null>(null);
  const [previewFresh, setPreviewFresh] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const currency = preview?.finance_impact.current_agreement?.currency ?? undefined;
  const hasAgreement = preview?.finance_impact.has_agreement === true;
  const canConfirm = Boolean(preview && previewFresh && preview.can_confirm && !stale);

  const serviceCounts = useMemo(() => ({
    ending: preview?.service_impact.recurring_to_end?.length ?? 0,
    preserved: preview?.service_impact.preserve?.length ?? 0,
  }), [preview]);

  function resetState() {
    setDepartureType('');
    setLastDay('');
    setReason('');
    setNote('');
    setDestinationSchool('');
    setFinancialPolicy(null);
    setPreview(null);
    setPreviewFresh(false);
    setPreviewLoading(false);
    setConfirmLoading(false);
    setConfirmOpen(false);
    setFormError(null);
    setStale(false);
    setIdempotencyKey(newIdempotencyKey());
  }

  function close() {
    if (previewLoading || confirmLoading) return;
    resetState();
    onClose();
  }

  function invalidatePreview(options?: { newDecision?: boolean }) {
    setPreviewFresh(false);
    setStale(false);
    setConfirmOpen(false);
    setFormError(null);
    if (options?.newDecision !== false) setIdempotencyKey(newIdempotencyKey());
  }

  function buildDecision(): StudentDepartureDecisionPayload | null {
    if (!departureType) {
      setFormError(t('admin.student360.departure.validation.type'));
      return null;
    }
    if (!lastDay) {
      setFormError(t('admin.student360.departure.validation.date'));
      return null;
    }
    if (!reason.trim() && !note.trim()) {
      setFormError(t('admin.student360.departure.validation.reason'));
      return null;
    }
    setFormError(null);
    return {
      departure_type: departureType,
      last_day: lastDay,
      reason: reason.trim(),
      note: note.trim() || null,
      destination_school: departureType === 'transferred' ? destinationSchool.trim() || null : null,
      financial_policy: financialPolicy,
    };
  }

  async function handlePreview(event?: FormEvent) {
    event?.preventDefault();
    const decision = buildDecision();
    if (!decision) return;
    setPreviewLoading(true);
    setStale(false);
    const result = await previewStudentDeparture(studentId, decision);
    setPreviewLoading(false);
    if (!result.success) {
      setPreviewFresh(false);
      setFormError(departureErrorMessage(result.error, t));
      return;
    }
    setPreview(result.data);
    setPreviewFresh(true);
    setFormError(null);
  }

  function policyUnavailable(policy: StudentDepartureFinancialPolicy): boolean {
    if (!preview || !hasAgreement) return false;
    return !preview.allowed_financial_policies.includes(policy);
  }

  function openConfirmation() {
    if (!preview || !previewFresh) {
      setFormError(t('admin.student360.departure.previewRequired'));
      return;
    }
    if (hasAgreement && !financialPolicy) {
      setFormError(t('admin.student360.departure.validation.policy'));
      return;
    }
    if (!preview.can_confirm) {
      setFormError(t('admin.student360.departure.cannotConfirm'));
      return;
    }
    setFormError(null);
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!preview || !previewFresh || !preview.can_confirm || confirmLoading) return;
    const decision = buildDecision();
    if (!decision) return;
    setConfirmLoading(true);
    const result = await confirmStudentDeparture(studentId, {
      ...decision,
      preview_fingerprint: preview.preview_fingerprint,
      idempotency_key: idempotencyKey,
    });
    setConfirmLoading(false);
    if (!result.success) {
      setConfirmOpen(false);
      const staleResponse = result.error.code === 'preview_stale';
      if (staleResponse || result.error.code === 'departure_idempotency_conflict') {
        setPreviewFresh(false);
        setStale(staleResponse);
        setIdempotencyKey(newIdempotencyKey());
      }
      setFormError(staleResponse ? null : departureErrorMessage(result.error, t));
      return;
    }
    toast.success(t('admin.student360.departure.success'));
    resetState();
    onClose();
    onSuccess();
  }

  if (!open) return null;

  return (
    <>
      <SetupDrawer
        open={open}
        title={t('admin.student360.departure.title')}
        subtitle={t('admin.student360.departure.subtitle')}
        onClose={close}
        size="wide"
        footer={
          <div className={styles.footerActions}>
            <button type="button" className="btn btn--ghost" onClick={close} disabled={previewLoading || confirmLoading}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handlePreview()}
              disabled={previewLoading || confirmLoading}
            >
              {previewLoading
                ? t('admin.student360.departure.previewLoading')
                : preview
                  ? t('admin.student360.departure.previewAgain')
                  : t('admin.student360.departure.preview')}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={openConfirmation}
              disabled={!canConfirm || previewLoading || confirmLoading}
            >
              {t('admin.student360.departure.confirm')}
            </button>
          </div>
        }
      >
        <form onSubmit={(event) => void handlePreview(event)} className={styles.form}>
          <section className={styles.sectionCard} aria-labelledby="departure-details-title">
            <div className={styles.sectionHeader}>
              <div>
                <h3 id="departure-details-title">{t('admin.student360.departure.detailsTitle')}</h3>
                <p>{t('admin.student360.departure.detailsHelp')}</p>
              </div>
            </div>

            <div className={styles.detailsGrid}>
              <label className="field">
                <span className="label">{t('admin.student360.departure.type')}</span>
                <select
                  value={departureType}
                  onChange={(event) => {
                    setDepartureType(event.target.value as StudentDepartureType | '');
                    invalidatePreview();
                  }}
                  disabled={previewLoading || confirmLoading}
                >
                  <option value="">{t('common.select')}</option>
                  <option value="withdrawn">{t('admin.student360.departure.type.withdrawn')}</option>
                  <option value="transferred">{t('admin.student360.departure.type.transferred')}</option>
                </select>
              </label>

              <label className="field">
                <span className="label">{t('admin.student360.departure.lastDay')}</span>
                <input
                  type="date"
                  value={lastDay}
                  onChange={(event) => {
                    setLastDay(event.target.value);
                    invalidatePreview();
                  }}
                  disabled={previewLoading || confirmLoading}
                />
              </label>

              <label className={`field ${styles.fieldWide}`}>
                <span className="label">{t('admin.student360.departure.reason')}</span>
                <input
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    invalidatePreview();
                  }}
                  placeholder={t('admin.student360.departure.reasonPlaceholder')}
                  disabled={previewLoading || confirmLoading}
                />
              </label>

              <label className={`field ${styles.fieldWide} ${styles.secondaryField}`}>
                <span className="label">{t('admin.student360.departure.note')}</span>
                <textarea
                  value={note}
                  onChange={(event) => {
                    setNote(event.target.value);
                    invalidatePreview();
                  }}
                  placeholder={t('admin.student360.departure.notePlaceholder')}
                  rows={3}
                  disabled={previewLoading || confirmLoading}
                />
              </label>

              {departureType === 'transferred' ? (
                <label className={`field ${styles.fieldWide}`}>
                  <span className="label">{t('admin.student360.departure.destinationSchool')}</span>
                  <input
                    value={destinationSchool}
                    onChange={(event) => {
                      setDestinationSchool(event.target.value);
                      invalidatePreview();
                    }}
                    placeholder={t('admin.student360.departure.destinationSchoolPlaceholder')}
                    disabled={previewLoading || confirmLoading}
                  />
                </label>
              ) : null}
            </div>
          </section>

          <fieldset className={styles.policySection}>
            <legend className={styles.policyLegend}>
              {t('admin.student360.departure.financialPolicy')}
            </legend>
            <p className={styles.sectionHint}>{t('admin.student360.departure.financialPolicyHelp')}</p>

            <div className={styles.policyGrid}>
              {POLICIES.map((policy) => {
                const unavailable = policyUnavailable(policy);
                const selected = financialPolicy === policy;
                const descriptionId = `departure-policy-${policy.toLowerCase()}-description`;

                return (
                  <label
                    key={policy}
                    className={`${styles.policyCard} ${selected ? styles.policyCardSelected : ''} ${unavailable ? styles.policyCardDisabled : ''}`}
                    data-selected={selected ? 'true' : 'false'}
                    data-unavailable={unavailable ? 'true' : 'false'}
                  >
                    <input
                      className={styles.policyRadio}
                      type="radio"
                      name="departure-financial-policy"
                      value={policy}
                      checked={selected}
                      aria-label={t(policyLabelKey(policy))}
                      aria-describedby={descriptionId}
                      disabled={unavailable || previewLoading || confirmLoading}
                      onChange={() => {
                        setFinancialPolicy(policy);
                        invalidatePreview();
                      }}
                    />
                    <span className={styles.policyCopy}>
                      <span className={styles.policyTitle}>{t(policyLabelKey(policy))}</span>
                      <span id={descriptionId} className={styles.policyDescription}>
                        {t(policyDescriptionKey(policy))}
                      </span>
                      {unavailable ? (
                        <span className={styles.policyBadge}>
                          {t('admin.student360.departure.policy.unavailable')}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>

            {preview && !hasAgreement ? (
              <p className={styles.noAgreement}>
                {t('admin.student360.departure.policy.noAgreement')}
              </p>
            ) : null}
          </fieldset>

          {formError ? (
            <div className="alert alert--error" role="alert" aria-live="assertive">
              {formError}
            </div>
          ) : null}

          {stale ? (
            <div className="alert alert--warning" role="status" aria-live="polite">
              {t('admin.student360.departure.previewStale')}
            </div>
          ) : null}

          {preview ? (
            <section className={styles.impactSection} aria-live="polite" aria-labelledby="departure-impact-title">
              <div className={styles.impactHeader}>
                <div>
                  <h3 id="departure-impact-title">{t('admin.student360.departure.impact')}</h3>
                  <p>{t('admin.student360.departure.impactHelp')}</p>
                </div>
                <span className={`badge ${preview.can_confirm && previewFresh ? 'badge--success' : 'badge--warning'}`}>
                  {preview.can_confirm && previewFresh
                    ? t('admin.student360.departure.canConfirm')
                    : t('admin.student360.departure.cannotConfirm')}
                </span>
              </div>

              <div className={styles.impactGrid}>
                <div className={styles.impactCard}>
                  <strong>{t('admin.student360.departure.academicImpact')}</strong>
                  <p className="muted">
                    {t('admin.student360.departure.academicEnd', { date: preview.academic_impact.date_end })}
                  </p>
                </div>
                <div className={styles.impactCard}>
                  <strong>{t('admin.student360.departure.classImpact')}</strong>
                  <p className="muted">
                    {preview.class_impact.clear_current_class_id
                      ? t('admin.student360.departure.classCleared')
                      : t('admin.student360.departure.classPreserved')}
                  </p>
                </div>
                <div className={styles.impactCard}>
                  <strong>{t('admin.student360.departure.servicesImpact')}</strong>
                  <p className="muted">{t('admin.student360.departure.servicesToEnd', { count: serviceCounts.ending })}</p>
                  <p className="muted">{t('admin.student360.departure.servicesPreserved', { count: serviceCounts.preserved })}</p>
                </div>
              </div>

              <div className={styles.financeCard}>
                <div className={styles.financeCardHeader}>
                  <strong>{t('admin.student360.departure.financeImpact')}</strong>
                </div>
                <div className={styles.metricGrid}>
                  <div className={styles.metric}>
                    <span>{t('admin.student360.departure.currentPeriodAmount')}</span>
                    <strong><FinanceMoney amount={preview.finance_impact.current_period_amount} currency={currency} /></strong>
                  </div>
                  <div className={styles.metric}>
                    <span>{t('admin.student360.departure.remaining')}</span>
                    <strong><FinanceMoney amount={preview.finance_impact.remaining} currency={currency} /></strong>
                  </div>
                  <div className={styles.metric}>
                    <span>{t('admin.student360.departure.creditBalance')}</span>
                    <strong><FinanceMoney amount={preview.finance_impact.credit_balance} currency={currency} /></strong>
                  </div>
                  <div className={styles.metric}>
                    <span>{t('admin.student360.departure.futureInstallments')}</span>
                    <strong>{preview.finance_impact.future_installments?.length ?? 0}</strong>
                  </div>
                  <div className={styles.metric}>
                    <span>{t('admin.student360.departure.lockedFutureInstallments')}</span>
                    <strong>{preview.finance_impact.locked_future_installments?.length ?? 0}</strong>
                  </div>
                </div>
              </div>

              {preview.warnings.length ? (
                <div className="alert alert--warning">
                  <strong>{t('admin.student360.departure.warnings')}</strong>
                  <ul>
                    {preview.warnings.map((warning, index) => (
                      <li key={`${warning.code}-${index}`}>{warning.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {preview.blocking_reasons.length ? (
                <div className="alert alert--error">
                  <strong>{t('admin.student360.departure.blockers')}</strong>
                  <ul>
                    {preview.blocking_reasons.map((blocker, index) => (
                      <li key={`${blocker.code}-${index}`}>{blocker.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          ) : null}

          <button type="submit" hidden aria-hidden="true" />
        </form>
      </SetupDrawer>

      <ConfirmationDialog
        open={confirmOpen}
        title={t('admin.student360.departure.confirmTitle')}
        body={<p>{t('admin.student360.departure.confirmBody')}</p>}
        confirmLabel={t('admin.student360.departure.confirm')}
        variant="danger"
        loading={confirmLoading}
        closeOnBackdrop={!confirmLoading}
        onClose={() => {
          if (!confirmLoading) setConfirmOpen(false);
        }}
        onConfirm={handleConfirm}
      />
    </>
  );
}
