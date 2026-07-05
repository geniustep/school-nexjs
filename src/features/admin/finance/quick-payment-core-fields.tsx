'use client';

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { isChequePayment } from '@/lib/utils/cheque';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import {
  formatPaymentJournalLabel,
  inferPaymentMethodFromJournal,
  needsManualPaymentMethodSelection,
} from '@/features/admin/finance/format-payment-journal';
import {
  collectionReferenceLabel,
  collectionReferenceRequired,
} from '@/features/admin/finance/collection-allocation-summary';
import {
  CollectionChequeFields,
  type CollectionChequeFieldValues,
} from '@/features/admin/finance/collection-cheque-fields';
import type { PaymentJournal } from '@/types/finance';

function resolveMethodCode(method: string | { code?: string }): string {
  return typeof method === 'string' ? method : method.code ?? '';
}

export type QuickPaymentCoreFieldsProps = {
  amount: string;
  onAmountChange: (value: string) => void;
  amountLabel?: string;
  amountHint?: string;
  amountDisabled?: boolean;
  currency?: string | null;
  journalId: string;
  onJournalChange: (value: string) => void;
  journals: PaymentJournal[];
  journalSelectOptions?: PaymentJournal[];
  selectedJournal?: PaymentJournal | null;
  journalReadOnly?: boolean;
  journalsLoading?: boolean;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  allowedMethods: Array<string | { code?: string }>;
  collectionDate: string;
  onCollectionDateChange: (value: string) => void;
  reference?: string;
  onReferenceChange?: (value: string) => void;
  chequeValues?: CollectionChequeFieldValues;
  onChequeChange?: (patch: Partial<CollectionChequeFieldValues>) => void;
  notes?: string;
  onNotesChange?: (value: string) => void;
  afterAmount?: React.ReactNode;
  footer?: React.ReactNode;
};

export function QuickPaymentCoreFields({
  amount,
  onAmountChange,
  amountLabel,
  amountHint,
  amountDisabled = false,
  currency,
  journalId,
  onJournalChange,
  journals,
  journalSelectOptions,
  selectedJournal,
  journalReadOnly = false,
  journalsLoading = false,
  paymentMethod,
  onPaymentMethodChange,
  allowedMethods,
  collectionDate,
  onCollectionDateChange,
  reference = '',
  onReferenceChange,
  chequeValues,
  onChequeChange,
  notes = '',
  onNotesChange,
  afterAmount,
  footer,
}: QuickPaymentCoreFieldsProps) {
  const t = useT();
  const [showNotes, setShowNotes] = useState(Boolean(notes.trim()));
  const journalOptions = journalSelectOptions ?? journals;
  const methodCodes = allowedMethods.map(resolveMethodCode).filter(Boolean);
  const singleJournal = journalOptions.length === 1;
  const showJournalSelect = !journalReadOnly && !singleJournal && journalOptions.length > 1;
  const manualPaymentMethod = needsManualPaymentMethodSelection(selectedJournal);
  const inferredMethod = useMemo(
    () => inferPaymentMethodFromJournal(selectedJournal).method,
    [selectedJournal],
  );
  const effectivePaymentMethod = paymentMethod || inferredMethod || '';
  const isCheque = isChequePayment(effectivePaymentMethod);
  const referenceLabel = collectionReferenceLabel(effectivePaymentMethod, t);
  const displayMethodLabel = effectivePaymentMethod
    ? paymentMethodLabel(effectivePaymentMethod, t)
    : '—';

  useEffect(() => {
    if (!selectedJournal) return;
    const inference = inferPaymentMethodFromJournal(selectedJournal);
    if (!inference.ambiguous && inference.method && inference.method !== paymentMethod) {
      onPaymentMethodChange(inference.method);
      return;
    }
    if (inference.ambiguous) {
      if (!paymentMethod && methodCodes.length) {
        onPaymentMethodChange(methodCodes[0]);
        return;
      }
      if (paymentMethod && !methodCodes.includes(paymentMethod)) {
        onPaymentMethodChange(methodCodes[0] ?? '');
      }
    }
  }, [
    selectedJournal,
    paymentMethod,
    methodCodes,
    onPaymentMethodChange,
  ]);

  const showAdditionalDetails = manualPaymentMethod || Boolean(onNotesChange);
  const additionalDetailsOpen = manualPaymentMethod || showNotes;

  return (
    <div className="finance-quick-payment-core form-stack">
      <label className="finance-amount-field finance-amount-field--prominent">
        {amountLabel ?? t('admin.finance.quickPayment.amountLabel')}
        <div className="finance-amount-field__input">
          <FinanceAmountInput value={amount} onChange={onAmountChange} disabled={amountDisabled} />
          {currency ? <span className="finance-amount-field__suffix">{currency}</span> : null}
        </div>
        {amountHint ? (
          <span className="finance-amount-field__hint tiny muted">{amountHint}</span>
        ) : null}
      </label>

      {afterAmount}

      <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment">
        {showJournalSelect ? (
          <label>
            {t('admin.finance.quickPayment.cashDeskAccount')}
            <select
              className="input"
              required
              value={journalId}
              onChange={(e) => onJournalChange(e.target.value)}
              disabled={journalsLoading}
            >
              <option value="">
                {journalsLoading
                  ? t('admin.finance.collections.loadingJournals')
                  : t('admin.finance.quickPayment.selectCashDeskAccount')}
              </option>
              {journalOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatPaymentJournalLabel(j)}
                </option>
              ))}
            </select>
          </label>
        ) : selectedJournal ? (
          <div className="finance-quick-payment-journal-summary">
            <span className="tiny muted">
              {t('admin.finance.quickPayment.recordedIn', {
                journal: formatPaymentJournalLabel(selectedJournal),
                method: displayMethodLabel,
              })}
            </span>
          </div>
        ) : (
          <label>
            {t('admin.finance.quickPayment.cashDeskAccount')}
            <select
              className="input"
              required
              value={journalId}
              onChange={(e) => onJournalChange(e.target.value)}
              disabled={journalsLoading}
            >
              <option value="">
                {journalsLoading
                  ? t('admin.finance.collections.loadingJournals')
                  : t('admin.finance.quickPayment.selectCashDeskAccount')}
              </option>
              {journalOptions.map((j) => (
                <option key={j.id} value={j.id}>
                  {formatPaymentJournalLabel(j)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          {t('admin.finance.collectionDate')}
          <input
            className="input"
            required
            type="date"
            value={collectionDate}
            onChange={(e) => onCollectionDateChange(e.target.value)}
          />
        </label>

        {referenceLabel && onReferenceChange ? (
          <label>
            {referenceLabel}
            <input
              className="input"
              dir="ltr"
              required={collectionReferenceRequired(effectivePaymentMethod)}
              value={reference}
              onChange={(e) => onReferenceChange(e.target.value)}
            />
          </label>
        ) : null}
      </div>

      {isCheque && chequeValues && onChequeChange ? (
        <CollectionChequeFields
          collectionDate={collectionDate}
          values={chequeValues}
          onChange={onChequeChange}
        />
      ) : null}

      {showAdditionalDetails ? (
        <div className="finance-quick-payment-details">
          {!additionalDetailsOpen ? (
            <button
              type="button"
              className="btn btn--ghost btn--sm finance-quick-payment-details__toggle"
              onClick={() => setShowNotes(true)}
            >
              {t('admin.finance.quickPayment.additionalDetails')}
            </button>
          ) : (
            <details className="finance-quick-payment-details__panel" open={additionalDetailsOpen}>
              <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
              {manualPaymentMethod ? (
                <label>
                  {t('admin.finance.paymentMethod')}
                  <select
                    className="input"
                    required
                    value={paymentMethod}
                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                    disabled={!journalId || methodCodes.length === 0}
                  >
                    <option value="">
                      {!journalId
                        ? t('admin.finance.collections.selectJournalFirst')
                        : t('admin.finance.selectPaymentMethod')}
                    </option>
                    {methodCodes.map((code) => (
                      <option key={code} value={code}>
                        {paymentMethodLabel(code, t)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {onNotesChange && !isCheque ? (
                <label className="finance-collection-workflow__full-width">
                  {t('common.note')}
                  <textarea
                    className="input"
                    rows={3}
                    value={notes}
                    onChange={(e) => onNotesChange(e.target.value)}
                  />
                </label>
              ) : null}
            </details>
          )}
        </div>
      ) : null}

      {footer}
    </div>
  );
}
