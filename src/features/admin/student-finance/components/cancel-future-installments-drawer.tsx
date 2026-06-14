'use client';

import { useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { cancelFutureAgreementInstallments } from '../api/finance-admin-api';
import {
  validateCancelFutureInstallments,
  type CancelFutureTargetState,
} from '../utils/cancel-future-validation';

export type { CancelFutureTargetState };
export { validateCancelFutureInstallments };

export function CancelFutureInstallmentsDrawer({
  open,
  agreementId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  agreementId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [effectiveDate, setEffectiveDate] = useState('');
  const [targetState, setTargetState] = useState<CancelFutureTargetState>('cancelled');
  const [reason, setReason] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetAndClose() {
    setEffectiveDate('');
    setTargetState('cancelled');
    setReason('');
    setConfirmOpen(false);
    setFieldError(null);
    onClose();
  }

  function validate(): boolean {
    const code = validateCancelFutureInstallments({ effectiveDate, reason, targetState });
    if (code) {
      setFieldError(t(`admin.student360.financialAgreement.cancelFuture.errors.${code}`));
      return false;
    }
    setFieldError(null);
    return true;
  }

  function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setConfirmOpen(true);
  }

  async function handleConfirm() {
    if (!validate()) return;
    setSubmitting(true);
    const res = await cancelFutureAgreementInstallments(agreementId, {
      effective_date: effectiveDate,
      reason: reason.trim(),
      target_state: targetState,
    });
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.student360.financialAgreement.cancelFuture.success'));
    resetAndClose();
    onSuccess();
  }

  if (!open) return null;

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.financialAgreement.cancelFuture.drawerTitle')}
      onClose={resetAndClose}
    >
      {!confirmOpen ? (
        <form className="form-stack student-finance-cancel-future-drawer" onSubmit={handleContinue}>
          <p className="muted">{t('admin.student360.financialAgreement.cancelFuture.drawerDesc')}</p>
          <label>
            {t('admin.student360.financialAgreement.cancelFuture.effectiveDate')}
            <input
              className="input"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              required
            />
          </label>
          <label>
            {t('admin.student360.financialAgreement.cancelFuture.targetState')}
            <select
              className="input"
              value={targetState}
              onChange={(e) => setTargetState(e.target.value as CancelFutureTargetState)}
            >
              <option value="cancelled">
                {t('admin.student360.financialAgreement.cancelFuture.targetCancelled')}
              </option>
              <option value="waived">
                {t('admin.student360.financialAgreement.cancelFuture.targetWaived')}
              </option>
            </select>
          </label>
          <label>
            {t('admin.student360.financialAgreement.cancelFuture.reason')}
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </label>
          {fieldError ? (
            <p className="form-error" role="alert">
              {fieldError}
            </p>
          ) : null}
          <div className="row">
            <button type="submit" className="btn btn--primary btn--sm">
              {t('admin.student360.financialAgreement.cancelFuture.continue')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={resetAndClose}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      ) : (
        <div className="form-stack student-finance-cancel-future-drawer">
          <p>{t('admin.student360.financialAgreement.cancelFuture.confirmBody')}</p>
          <dl className="detail-list">
            <div>
              <dt>{t('admin.student360.financialAgreement.cancelFuture.effectiveDate')}</dt>
              <dd>{effectiveDate}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.financialAgreement.cancelFuture.targetState')}</dt>
              <dd>
                {targetState === 'waived'
                  ? t('admin.student360.financialAgreement.cancelFuture.targetWaived')
                  : t('admin.student360.financialAgreement.cancelFuture.targetCancelled')}
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.financialAgreement.cancelFuture.reason')}</dt>
              <dd>{reason.trim()}</dd>
            </div>
          </dl>
          <div className="row">
            <button
              type="button"
              className="btn btn--primary btn--sm"
              disabled={submitting}
              onClick={() => void handleConfirm()}
            >
              {submitting
                ? t('common.saving')
                : t('admin.student360.financialAgreement.cancelFuture.confirmSubmit')}
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={submitting}
              onClick={() => setConfirmOpen(false)}
            >
              {t('common.back')}
            </button>
          </div>
        </div>
      )}
    </SetupDrawer>
  );
}
