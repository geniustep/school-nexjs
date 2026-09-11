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
  resolveJournalAllowedMethodCodes,
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

type DrawerMethodKind = 'cash' | 'transfer' | 'cheque';

type DrawerMethodOption = {
  kind: DrawerMethodKind;
  methodCode: string;
  journal: PaymentJournal;
};

const DRAWER_METHOD_CANDIDATES: Record<DrawerMethodKind, string[]> = {
  cash: ['cash'],
  transfer: ['bank_transfer', 'transfer', 'bank'],
  cheque: ['cheque', 'check'],
};

function findDrawerMethodOption(
  journals: PaymentJournal[],
  kind: DrawerMethodKind,
): DrawerMethodOption | null {
  const candidates = DRAWER_METHOD_CANDIDATES[kind];
  for (const journal of journals) {
    const allowed = resolveJournalAllowedMethodCodes(journal);
    for (const candidate of candidates) {
      const actual = allowed.find((code) => code.toLowerCase() === candidate);
      if (actual) return { kind, methodCode: actual, journal };
    }
  }
  return null;
}

function drawerMethodActive(kind: DrawerMethodKind, method: string): boolean {
  const normalized = method.toLowerCase();
  return DRAWER_METHOD_CANDIDATES[kind].includes(normalized);
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
    () => ({
      cash: findDrawerMethodOption(journalOptions, 'cash'),
      transfer: findDrawerMethodOption(journalOptions, 'transfer'),
      cheque: findDrawerMethodOption(journalOptions, 'cheque'),
    }),
    [journalOptions],
  );

  useEffect(() => {
    if (isDrawer && !paymentMethod && drawerMethods.cash) {
      if (String(drawerMethods.cash.journal.id) !== journalId) {
        onJournalChange(String(drawerMethods.cash.journal.id));
      }
      onPaymentMethodChange(drawerMethods.cash.methodCode);
      return;
    }

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
  }, [
    selectedJournal,
    paymentMethod,
    methodCodes,
    onPaymentMethodChange,
    manualPaymentMethod,
    isDrawer,
    drawerMethods.cash,
    journalId,
    onJournalChange,
  ]);

  function selectDrawerMethod(option: DrawerMethodOption | null) {
    if (!option) return;
    if (String(option.journal.id) !== journalId) {
      onJournalChange(String(option.journal.id));
    }
    onPaymentMethodChange(option.methodCode);
  }

  const amountField = (
    <label
      className={`finance-amount-field finance-amount-field--prominent${
        isDrawer ? ' finance-quick-payment-drawer-amount__field' : ''
      }`}
    >
      {amountLabel ?? t('admin.finance.quickPayment.amountLabel')}
      <div className="finance-amount-field__input">
        <FinanceAmountInput value={amount} onChange={onAmountChange} disabled={amountDisabled} />
        {currency ? <span className="finance-amount-field__suffix">{currency}</span> : null}
      </div>
      {amountHint ? (
        <span
          className={`finance-amount-field__hint tiny muted${
            isDrawer ? ' finance-quick-payment-drawer-amount__hint' : ''
          }`}
        >
          {amountHint}
        </span>
      ) : null}
    </label>
  );

  const journalField = (
    <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment finance-payment-journal-row">
      {showJournalSelect ? (
        <label className="finance-collection-workflow__full-width">
          {t('admin.finance.quickPayment.cashDeskAccount')}
          <select
            className="input"
            required
            value={journalId}
            onChange={(e) => onJournalChange(e.target.value)}
            disabled={journalsLoading}
            data-testid="quick-payment-journal"
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
        <div className="finance-quick-payment-journal-summary finance-collection-workflow__full-width">
          <span className="tiny muted">
            {t('admin.finance.quickPayment.recordedIn', {
              journal: formatPaymentJournalLabel(selectedJournal),
              method: displayMethodLabel,
            })}
          </span>
        </div>
      ) : (
        <label className="finance-collection-workflow__full-width">
          {t('admin.finance.quickPayment.cashDeskAccount')}
          <select
            className="input"
            required
            value={journalId}
            onChange={(e) => onJournalChange(e.target.value)}
            disabled={journalsLoading}
            data-testid="quick-payment-journal"
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
    </div>
  );

  const paymentMethodBlock = isDrawer ? (
    <div
      className="finance-payment-method-block finance-quick-payment-drawer-method"
      data-testid="quick-payment-method-block"
    >
      <span className="finance-quick-payment-drawer-method__label">
        {t('admin.finance.paymentMethod')}
      </span>
      <div className="finance-quick-payment-method-buttons" role="group" aria-label={t('admin.finance.paymentMethod')}>
        {(['cash', 'transfer', 'cheque'] as DrawerMethodKind[]).map((kind) => {
          const option = drawerMethods[kind];
          const labelCode = kind === 'transfer' ? 'bank_transfer' : kind;
          const active = drawerMethodActive(kind, effectivePaymentMethod);
          return (
            <button
              key={kind}
              type="button"
              className={`finance-quick-payment-method-button${active ? ' is-active' : ''}`}
              onClick={() => selectDrawerMethod(option)}
              disabled={!option || journalsLoading}
              aria-pressed={active}
              data-testid={`quick-payment-method-${kind}`}
            >
              {active ? <span aria-hidden>✓</span> : null}
              <span>{paymentMethodLabel(labelCode, t)}</span>
            </button>
          );
        })}
      </div>
    </div>
  ) : (
    <div className="finance-payment-method-block" data-testid="quick-payment-method-block">
      <span className="finance-payment-method-block__label">{t('admin.finance.paymentMethod')}</span>
      {manualPaymentMethod ? (
        <label className="finance-payment-method-block__field">
          <select
            className="input"
            required
            value={paymentMethod}
            onChange={(e) => onPaymentMethodChange(e.target.value)}
            disabled={!journalId || methodCodes.length === 0}
            data-testid="quick-payment-method"
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
      ) : (
        <div className="finance-payment-method-block__value">
          <span className="finance-payment-method-block__pill" data-testid="quick-payment-method-readonly">
            {displayMethodLabel}
          </span>
        </div>
      )}
    </div>
  );

  const dateField = (
    <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment finance-payment-date-row">
      <label>
        {t('admin.finance.collectionDate')}
        <input
          className="input"
          required
          type="date"
          value={collectionDate}
          onChange={(e) => onCollectionDateChange(e.target.value)}
          data-testid="quick-payment-date"
        />
      </label>
    </div>
  );

  const methodSpecificFields = (
    <div className="finance-payment-method-fields" data-testid="quick-payment-method-fields">
      {showReference ? (
        <label className="finance-payment-method-fields__reference">
          {referenceLabel}
          <input
            className="input"
            dir="ltr"
            required={collectionReferenceRequired(effectivePaymentMethod)}
            value={reference}
            onChange={(e) => onReferenceChange?.(e.target.value)}
            data-testid="quick-payment-reference"
            aria-required={collectionReferenceRequired(effectivePaymentMethod)}
          />
        </label>
      ) : null}

      {isCheque && chequeValues && onChequeChange ? (
        <CollectionChequeFields
          collectionDate={collectionDate}
          values={chequeValues}
          onChange={onChequeChange}
        />
      ) : null}
    </div>
  );

  const notesField = onNotesChange ? (
    <label className="finance-collection-workflow__full-width">
      {t('common.note')}
      <textarea
        className="input"
        rows={3}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        data-testid="quick-payment-notes"
      />
    </label>
  ) : null;

  const notesBlock =
    onNotesChange && !isCheque && !isDrawer ? (
      <div className="finance-quick-payment-details">
        {!showNotes ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm finance-quick-payment-details__toggle"
            onClick={() => setShowNotes(true)}
          >
            {t('admin.finance.quickPayment.additionalDetails')}
          </button>
        ) : (
          <details className="finance-quick-payment-details__panel" open>
            <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
            {notesField}
          </details>
        )}
      </div>
    ) : null;

  const drawerDetails = isDrawer ? (
    <details className="finance-quick-payment-details finance-quick-payment-details--drawer">
      <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
      <div className="finance-quick-payment-details__body form-stack">
        {journalField}
        {!isCheque ? notesField : null}
      </div>
    </details>
  ) : null;

  return (
    <div
      className={`finance-quick-payment-core form-stack${
        isDrawer ? ' finance-quick-payment-core--drawer' : ''
      }`}
      data-testid="quick-payment-core"
    >
      {isDrawer ? (
        <div className="finance-quick-payment-drawer-amount">{amountField}</div>
      ) : (
        amountField
      )}

      {afterAmount}

      {!isDrawer ? journalField : null}

      {paymentMethodBlock}

      {isDrawer ? (
        <div className="finance-quick-payment-drawer-meta">{dateField}</div>
      ) : (
        dateField
      )}

      {methodSpecificFields}

      {drawerDetails}
      {notesBlock}

      {footer}
    </div>
  );
}
