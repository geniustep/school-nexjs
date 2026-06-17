'use client';

import { useState } from 'react';
import { SetupDrawer } from '@/features/admin/academic-setup/components/setup-drawer';
import { useToast } from '@/components/ui/toast';
import { useT } from '@/features/i18n/locale-context';
import { createAgreementAdjustment } from '../api/finance-admin-api';
import type { AgreementAdjustmentType, AgreementDiscountPolicy, FinancialAgreementLine } from '../types';

const ADJUSTMENT_TYPES: AgreementAdjustmentType[] = [
  'fixed_discount',
  'percentage_discount',
  'partial_waiver',
  'full_waiver',
  'surcharge',
  'manual_adjustment',
];

const POLICIES: AgreementDiscountPolicy[] = [
  'reduce_total_only',
  'spread_proportionally',
  'apply_to_selected_fee',
  'apply_to_future_installments',
  'apply_to_last_installments',
];

export function AgreementAdjustmentDrawer({
  open,
  agreementId,
  sourceFees,
  onClose,
  onSuccess,
}: {
  open: boolean;
  agreementId: number;
  sourceFees?: FinancialAgreementLine[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const t = useT();
  const toast = useToast();
  const [adjustmentType, setAdjustmentType] = useState<AgreementAdjustmentType>('fixed_discount');
  const [amount, setAmount] = useState('');
  const [percentage, setPercentage] = useState('');
  const [reason, setReason] = useState('');
  const [policy, setPolicy] = useState<AgreementDiscountPolicy>('reduce_total_only');
  const [targetFeeId, setTargetFeeId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const needsAmount =
    adjustmentType === 'fixed_discount' ||
    adjustmentType === 'partial_waiver' ||
    adjustmentType === 'surcharge' ||
    adjustmentType === 'manual_adjustment';
  const needsPercentage = adjustmentType === 'percentage_discount';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error(t('admin.student360.financialAgreement.adjustments.reasonRequired'));
      return;
    }
    setSubmitting(true);
    const payload = {
      adjustment_type: adjustmentType,
      reason: reason.trim(),
      application_policy: policy,
      ...(needsAmount && amount ? { amount: Number(amount) } : {}),
      ...(needsPercentage && percentage ? { percentage: Number(percentage) } : {}),
      ...(policy === 'apply_to_selected_fee' && targetFeeId
        ? { target_fee_id: Number(targetFeeId) }
        : {}),
    };
    const res = await createAgreementAdjustment(agreementId, payload);
    setSubmitting(false);
    if (!res.success) {
      toast.error(res.error.message);
      return;
    }
    toast.success(t('admin.student360.financialAgreement.adjustments.createSuccess'));
    onSuccess();
    onClose();
  }

  return (
    <SetupDrawer
      open={open}
      title={t('admin.student360.financialAgreement.adjustments.addTitle')}
      onClose={onClose}
      size="medium"
    >
      <form className="form-stack" onSubmit={handleSubmit}>
        <p className="muted">{t('admin.student360.financialAgreement.adjustments.addDesc')}</p>

        <label>
          {t('admin.student360.financialAgreement.adjustments.type')}
          <select
            className="input"
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as AgreementAdjustmentType)}
          >
            {ADJUSTMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`admin.student360.financialAgreement.adjustments.types.${type}`)}
              </option>
            ))}
          </select>
        </label>

        {needsAmount ? (
          <label>
            {t('admin.student360.financialAgreement.adjustments.amount')}
            <input
              className="input"
              dir="ltr"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        ) : null}

        {needsPercentage ? (
          <label>
            {t('admin.student360.financialAgreement.adjustments.percentage')}
            <input
              className="input"
              dir="ltr"
              inputMode="decimal"
              required
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
          </label>
        ) : null}

        <label>
          {t('admin.student360.financialAgreement.adjustments.reason')}
          <input className="input" required value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>

        <label>
          {t('admin.student360.financialAgreement.adjustments.policy')}
          <select
            className="input"
            value={policy}
            onChange={(e) => setPolicy(e.target.value as AgreementDiscountPolicy)}
          >
            {POLICIES.map((p) => (
              <option key={p} value={p}>
                {t(`admin.student360.financialAgreement.adjustments.policies.${p}`)}
              </option>
            ))}
          </select>
        </label>

        {policy === 'apply_to_selected_fee' && sourceFees?.length ? (
          <label>
            {t('admin.student360.financialAgreement.adjustments.targetFee')}
            <select
              className="input"
              value={targetFeeId}
              onChange={(e) => setTargetFeeId(e.target.value)}
              required
            >
              <option value="">{t('common.select')}</option>
              {sourceFees.map((fee) => (
                <option key={fee.id ?? fee.service_id} value={fee.id ?? fee.service_id}>
                  {fee.service?.name ?? fee.service_id}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? t('common.saving') : t('common.save')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </SetupDrawer>
  );
}
