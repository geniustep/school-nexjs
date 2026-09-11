'use client';

import { useEffect, useMemo, useState } from 'react';
import { useT } from '@/features/i18n/locale-context';
import { paymentMethodLabel } from '@/lib/utils/finance';
import { isChequePayment } from '@/lib/utils/cheque';
import { FinanceAmountInput } from '@/features/admin/finance/finance-amount-input';
import {
  formatPaymentJournalLabel,
  inferPaymentMethodFromJournal,
  journalsSupportingMethod,
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

function methodMatches(current: string, candidates: string[]): boolean {
  const normalized = current.toLowerCase();
  return candidates.some((candidate) => candidate.toLowerCase() === normalized);
}

function resolveDrawerMethod(
  journals: PaymentJournal[],
  candidates: string[],
): { code: string; journal: PaymentJournal } | null {
  for (const candidate of candidates) {
    const journal = journalsSupportingMethod(journals, candidate)[0];
    if (journal) return { code: candidate, journal };
  }
  return null;
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
  detailsContent?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'drawer';
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
  detailsContent,
  footer,
  variant = 'default',
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
  const showReference = Boolean(referenceLabel && onReferenceChange && !isCheque);
  const displayMethodLabel = effectivePaymentMethod
    ? paymentMethodLabel(effectivePaymentMethod, t)
    : '—';
  const isDrawer = variant === 'drawer';

  const drawerMethods = useMemo(
    () => [
      {
        key: 'cash',
        label: paymentMethodLabel('cash', t),
        candidates: ['cash'],
        resolved: resolveDrawerMethod(journalOptions, ['cash']),
      },
      {
        key: 'transfer',
        label: paymentMethodLabel('bank_transfer', t),
        candidates: ['bank_transfer', 'transfer', 'bank'],
        resolved: resolveDrawerMethod(journalOptions, ['bank_transfer', 'transfer', 'bank']),
      },
      {
        key: 'cheque',
        label: paymentMethodLabel('cheque', t),
        candidates: ['cheque', 'check'],
        resolved: resolveDrawerMethod(journalOptions, ['cheque', 'check']),
      },
    ],
    [journalOptions, t],
  );

  useEffect(() => {
    if (!selectedJournal) return;
    const inference = inferPaymentMethodFromJournal(selectedJournal);
    if (manualPaymentMethod) {
      if (!paymentMethod || !methodCodes.includes(paymentMethod)) {
        onPaymentMethodChange(inference.method ?? methodCodes[0] ?? '');
      }
      return;
    }
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
  }, [selectedJournal, paymentMethod, methodCodes, onPaymentMethodChange, manualPaymentMethod]);

  const amountField = (
    <label className={`finance-amount-field finance-amount-field--prominent${isDrawer ? ' finance-quick-payment-drawer-amount__field' : ''}`}>
      {amountLabel ?? t('admin.finance.quickPayment.amountLabel')}
      <div className="finance-amount-field__input">
        <FinanceAmountInput value={amount} onChange={onAmountChange} disabled={amountDisabled} />
        {currency ? <span className="finance-amount-field__suffix">{currency}</span> : null}
      </div>
      {amountHint ? <span className={`finance-amount-field__hint tiny muted${isDrawer ? ' finance-quick-payment-drawer-amount__hint' : ''}`}>{amountHint}</span> : null}
    </label>
  );

  const journalField = (
    <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment finance-payment-journal-row">
      {showJournalSelect ? (
        <label className="finance-collection-workflow__full-width">
          {t('admin.finance.quickPayment.cashDeskAccount')}
          <select className="input" required value={journalId} onChange={(e) => onJournalChange(e.target.value)} disabled={journalsLoading} data-testid="quick-payment-journal">
            <option value="">{journalsLoading ? t('admin.finance.collections.loadingJournals') : t('admin.finance.quickPayment.selectCashDeskAccount')}</option>
            {journalOptions.map((j) => <option key={j.id} value={j.id}>{formatPaymentJournalLabel(j)}</option>)}
          </select>
        </label>
      ) : selectedJournal ? (
        <div className="finance-quick-payment-journal-summary finance-collection-workflow__full-width">
          <span className="tiny muted">{t('admin.finance.quickPayment.recordedIn', { journal: formatPaymentJournalLabel(selectedJournal), method: displayMethodLabel })}</span>
        </div>
      ) : (
        <label className="finance-collection-workflow__full-width">
          {t('admin.finance.quickPayment.cashDeskAccount')}
          <select className="input" required value={journalId} onChange={(e) => onJournalChange(e.target.value)} disabled={journalsLoading} data-testid="quick-payment-journal">
            <option value="">{journalsLoading ? t('admin.finance.collections.loadingJournals') : t('admin.finance.quickPayment.selectCashDeskAccount')}</option>
            {journalOptions.map((j) => <option key={j.id} value={j.id}>{formatPaymentJournalLabel(j)}</option>)}
          </select>
        </label>
      )}
    </div>
  );

  const paymentMethodBlock = (
    <div className={`finance-payment-method-block${isDrawer ? ' finance-quick-payment-drawer-method' : ''}`} data-testid="quick-payment-method-block">
      <span className={isDrawer ? 'finance-quick-payment-drawer-method__label' : 'finance-payment-method-block__label'}>{t('admin.finance.paymentMethod')}</span>
      {isDrawer ? (
        <div className="row finance-quick-payment-drawer-method__choices" data-testid="quick-payment-method">
          {drawerMethods.map((option) => {
            const available = option.resolved != null;
            const active = methodMatches(effectivePaymentMethod, option.candidates);
            return (
              <button key={option.key} type="button" className={`btn btn--sm ${active ? 'btn--primary' : 'btn--ghost'}`} disabled={!available || journalsLoading} aria-pressed={active} onClick={() => {
                if (!option.resolved) return;
                onJournalChange(String(option.resolved.journal.id));
                onPaymentMethodChange(option.resolved.code);
              }}>
                {active ? '✓ ' : ''}{option.label}
              </button>
            );
          })}
        </div>
      ) : manualPaymentMethod ? (
        <label className="finance-payment-method-block__field">
          <select className="input" required value={paymentMethod} onChange={(e) => onPaymentMethodChange(e.target.value)} disabled={!journalId || methodCodes.length === 0} data-testid="quick-payment-method">
            <option value="">{!journalId ? t('admin.finance.collections.selectJournalFirst') : t('admin.finance.selectPaymentMethod')}</option>
            {methodCodes.map((code) => <option key={code} value={code}>{paymentMethodLabel(code, t)}</option>)}
          </select>
        </label>
      ) : (
        <div className="finance-payment-method-block__value"><span className="finance-payment-method-block__pill" data-testid="quick-payment-method-readonly">{displayMethodLabel}</span></div>
      )}
    </div>
  );

  const dateField = (
    <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment finance-payment-date-row">
      <label>
        {t('admin.finance.collectionDate')}
        <input className="input" required type="date" value={collectionDate} onChange={(e) => onCollectionDateChange(e.target.value)} data-testid="quick-payment-date" />
      </label>
    </div>
  );

  const methodSpecificFields = (
    <div className="finance-payment-method-fields" data-testid="quick-payment-method-fields">
      {showReference ? (
        <label className="finance-payment-method-fields__reference">
          {referenceLabel}
          <input className="input" dir="ltr" required={collectionReferenceRequired(effectivePaymentMethod)} value={reference} onChange={(e) => onReferenceChange?.(e.target.value)} data-testid="quick-payment-reference" aria-required={collectionReferenceRequired(effectivePaymentMethod)} />
        </label>
      ) : null}
      {isCheque && chequeValues && onChequeChange ? <CollectionChequeFields collectionDate={collectionDate} values={chequeValues} onChange={onChequeChange} /> : null}
    </div>
  );

  const defaultNotesBlock = !isDrawer && onNotesChange && !isCheque ? (
    <div className="finance-quick-payment-details">
      {!showNotes ? (
        <button type="button" className="btn btn--ghost btn--sm finance-quick-payment-details__toggle" onClick={() => setShowNotes(true)}>{t('admin.finance.quickPayment.additionalDetails')}</button>
      ) : (
        <details className="finance-quick-payment-details__panel" open>
          <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
          <label className="finance-collection-workflow__full-width">
            {t('common.note')}
            <textarea className="input" rows={3} value={notes} onChange={(e) => onNotesChange(e.target.value)} data-testid="quick-payment-notes" />
          </label>
        </details>
      )}
    </div>
  ) : null;

  const drawerDetails = isDrawer ? (
    <details className="finance-quick-payment-details__panel">
      <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
      <div className="form-stack">
        {detailsContent}
        {journalField}
        {onNotesChange && !isCheque ? (
          <label className="finance-collection-workflow__full-width">
            {t('common.note')}
            <textarea className="input" rows={3} value={notes} onChange={(e) => onNotesChange(e.target.value)} data-testid="quick-payment-notes" />
          </label>
        ) : null}
      </div>
    </details>
  ) : null;

  return (
    <div className={`finance-quick-payment-core form-stack${isDrawer ? ' finance-quick-payment-core--drawer' : ''}`} data-testid="quick-payment-core">
      {isDrawer ? <div className="finance-quick-payment-drawer-amount">{amountField}</div> : amountField}
      {afterAmount}
      {paymentMethodBlock}
      {isDrawer ? <div className="finance-quick-payment-drawer-meta">{dateField}</div> : dateField}
      {methodSpecificFields}
      {isDrawer ? drawerDetails : journalField}
      {defaultNotesBlock}
      {footer}
    </div>
  );
}
