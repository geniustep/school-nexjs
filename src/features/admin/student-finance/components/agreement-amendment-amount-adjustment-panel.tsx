'use client';

import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useT } from '@/features/i18n/locale-context';
import type { AgreementAmendmentLineOption } from '../utils/resolve-amendment-form-options';
import { computeAmountAdjustmentDelta } from '../utils/agreement-amendment-path';
import { resolveAgreementAmendmentBlockReasonKey } from '../utils/agreement-amendment-line-display';

export function AgreementAmendmentAmountAdjustmentPanel({
  line,
  currency,
  newAmount,
  disabled,
  onAmountChange,
}: {
  line: AgreementAmendmentLineOption;
  currency?: string | null;
  newAmount: string;
  disabled?: boolean;
  onAmountChange: (value: string) => void;
}) {
  const t = useT();
  const currentAmount = line.unitPrice ?? line.amount;
  const { diff, kind } = computeAmountAdjustmentDelta(currentAmount, newAmount);

  const blockReasonKey = line.amountAmendmentBlockReason
    ? resolveAgreementAmendmentBlockReasonKey(line.amountAmendmentBlockReason)
    : null;
  const blockReason =
    blockReasonKey && t(blockReasonKey) !== blockReasonKey ? t(blockReasonKey) : null;

  return (
    <section className="student-finance-amendment-amount-panel stack">
      <h4>{t('admin.student360.financeWorkspace.agreementAmendment.adjustLineAmountTitle')}</h4>
      <p className="tiny muted student-finance-amendment-amount-panel__note">
        {t('admin.student360.financeWorkspace.agreementAmendment.oneTimeAmountAmendableNote')}
      </p>

      <dl className="detail-list compact">
        <div>
          <dt>{t('admin.student360.financeWorkspace.agreementAmendment.currentAmount')}</dt>
          <dd>
            {currentAmount != null ? (
              <FinanceMoney amount={currentAmount} currency={currency ?? undefined} />
            ) : (
              t('common.dash')
            )}
          </dd>
        </div>
      </dl>

      <label>
        <span className="tiny muted">
          {t('admin.student360.financeWorkspace.agreementAmendment.newAmount')}
        </span>
        <input
          className="input"
          type="number"
          min="0"
          step="0.01"
          value={newAmount}
          onChange={(e) => onAmountChange(e.target.value)}
          disabled={disabled || line.amountAmendable !== true}
        />
      </label>

      {kind === 'decrease' && diff != null ? (
        <p className="student-finance-amendment-amount-panel__delta student-finance-amendment-amount-panel__delta--decrease">
          {t('admin.student360.financeWorkspace.agreementAmendment.delta')}:{' '}
          <FinanceMoney amount={Math.abs(diff)} currency={currency ?? undefined} /> —{' '}
          {t('admin.student360.financeWorkspace.agreementAmendment.decrease')}
        </p>
      ) : null}
      {kind === 'increase' && diff != null ? (
        <p className="student-finance-amendment-amount-panel__delta student-finance-amendment-amount-panel__delta--increase">
          {t('admin.student360.financeWorkspace.agreementAmendment.delta')}:{' '}
          <FinanceMoney amount={diff} currency={currency ?? undefined} /> —{' '}
          {t('admin.student360.financeWorkspace.agreementAmendment.increase')}
        </p>
      ) : null}

      {line.amountAmendable !== true ? (
        <p className="form-error" role="alert">
          {blockReason ??
            t('admin.student360.financeWorkspace.agreementAmendment.lineAmountNotAmendable')}
        </p>
      ) : null}
    </section>
  );
}
