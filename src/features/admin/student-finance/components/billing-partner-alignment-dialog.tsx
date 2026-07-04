'use client';

import { useCallback, useState } from 'react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useT } from '@/features/i18n/locale-context';
import { useToast } from '@/components/ui/toast';
import { postResolveFinanceReview } from '../api/finance-admin-api';
import type { FinanceReviewBillingPartnerPresentation } from '../types/finance-review';
import {
  buildResolveFinanceReviewPayload,
  canSubmitResolveFinanceReview,
} from '../utils/build-resolve-finance-review-payload';
import { resolveFinanceReviewErrorMessage } from '../utils/resolve-finance-review-errors';

export function BillingPartnerAlignmentDialog({
  open,
  agreementId,
  mismatch,
  onClose,
  onSuccess,
}: {
  open: boolean;
  agreementId: number;
  mismatch: FinanceReviewBillingPartnerPresentation;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setReason('');
    onClose();
  }, [onClose, submitting]);

  const handleConfirm = useCallback(async () => {
    if (!canSubmitResolveFinanceReview(reason)) {
      toast.error(t('admin.student360.financeWorkspace.financeReview.errors.reasonRequired'));
      return;
    }
    setSubmitting(true);
    const payload = buildResolveFinanceReviewPayload(reason);
    const res = await postResolveFinanceReview(agreementId, payload);
    setSubmitting(false);

    if (!res.success) {
      toast.error(resolveFinanceReviewErrorMessage(res.error?.code, res.error?.message, t));
      return;
    }

    toast.success(t('admin.student360.financeWorkspace.financeReview.success'));
    setReason('');
    onClose();
    onSuccess();
  }, [agreementId, onClose, onSuccess, reason, t, toast]);

  return (
    <ConfirmationDialog
      open={open}
      title={t('admin.student360.financeWorkspace.financeReview.dialogTitle')}
      confirmLabel={t('admin.student360.financeWorkspace.financeReview.confirmLabel')}
      cancelLabel={t('common.cancel')}
      loading={submitting}
      onConfirm={() => void handleConfirm()}
      onClose={handleClose}
      body={
        <>
          <p>{t('admin.student360.financeWorkspace.financeReview.dialogIntro')}</p>
          <dl className="detail-list compact">
            <div>
              <dt>{t('admin.student360.financeWorkspace.financeReview.dialogAgreementPartner')}</dt>
              <dd dir="auto">{mismatch.agreementPartnerName ?? t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.student360.financeWorkspace.financeReview.dialogProfilePartner')}</dt>
              <dd dir="auto">{mismatch.profilePartnerName ?? t('common.dash')}</dd>
            </div>
          </dl>
          <label className="student-finance-agreement-context__reset-reason">
            <span>{t('admin.student360.financeWorkspace.financeReview.reasonField')}</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              disabled={submitting}
            />
          </label>
        </>
      }
    />
  );
}
