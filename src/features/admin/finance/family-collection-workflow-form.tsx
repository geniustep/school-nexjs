'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { CollectionCashSessionGate, collectionBlockedByCashSession, resolveCashSessionCollectionAccess } from '@/features/admin/finance/cash-desk/collection-cash-session-gate';
import {
  familyCollectionConfirmBlockReasonKey,
  parseFamilyAllocationInputs,
  readInstallmentNotCollectibleId,
  resolveFamilyCollectionConfirmState,
  sanitizeFamilyAllocationInputs,
  sumFamilyAllocationAmounts,
} from '@/features/admin/finance/family-collection-allocation-utils';
import {
  buildChequeRegistrationPayload,
  resolveChequeCollectionReference,
} from '@/features/admin/finance/collection-cheque-payload';
import type { CollectionChequeFieldValues } from '@/features/admin/finance/collection-cheque-fields';
import { filterCollectibleFamilyInstallments } from '@/features/admin/finance/family-installment-collectibility';
import { FamilyCollectionManualEditor } from '@/features/admin/finance/family-collection-manual-editor';
import { fetchFamilyCollectionBackendPreview } from '@/features/admin/finance/family-collection-backend-preview';
import { FamilyCollectionReviewStep } from '@/features/admin/finance/family-collection-review-step';
import { resolveFamilyCollectionReceiptId } from '@/features/admin/finance/family-collection-receipt-resolve';
import { FamilyCollectionSmartSummary } from '@/features/admin/finance/family-collection-smart-summary';
import { buildSuggestedFamilyAllocations } from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyCollectSource } from '@/features/admin/finance/family-collect-query';
import { resolveDefaultPaymentJournal } from '@/features/admin/finance/format-payment-journal';
import { useFamilyCollectionContext } from '@/features/admin/finance/hooks/use-family-collection-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { QuickPaymentCoreFields } from '@/features/admin/finance/quick-payment-core-fields';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { fetchCollectionReceipt, issueCollectionReceipt } from '@/lib/api/finance-receipt';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { resolveCollectionErrorMessage } from '@/lib/utils/collection-errors';
import { currencyCode, paymentMethodLabel } from '@/lib/utils/finance';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import { isChequePayment } from '@/lib/utils/cheque';
import { normalizeFamilyCollectionConfirmResponse, normalizeFamilyCollectionCreateResponse, normalizeFamilyCollectionDetail } from '@/lib/utils/normalize-family-finance';
import { confirmFamilyCollection, getFamilyCollectionById, getFamilyFinanceSummary, submitFamilyCollection, updateFamilyCollectionDraft } from '@/features/admin/student-finance/api/family-finance-api';
import type { FamilyCollectionCreateResponse, FamilyCollectionDetail, FamilyCollectionPreviewResponse } from '@/types/family-finance';
import type { ApiErrorBody } from '@/types/api';
import type { CashSession } from '@/types/finance-cash-desk';

function FamilyCollectionWorkflowSteps({
  t,
}: {
  t: (key: string, params?: Record<string, string>) => string;
}) {
  const steps = [
    { id: 'amount' as const, label: t('admin.finance.billingAccounts.familyCollection.stepAmount') },
    { id: 'allocate' as const, label: t('admin.finance.billingAccounts.familyCollection.stepAllocate') },
    { id: 'confirm' as const, label: t('admin.finance.billingAccounts.familyCollection.stepConfirm') },
  ];
  const activeIndex = 1;

  return (
    <div
      className="finance-collection-workflow__steps finance-collection-workflow__steps--progress finance-family-collection-workflow__steps"
      aria-label={t('admin.finance.billingAccounts.familyCollection.stepsLabel')}
    >
      <div
        className="finance-collection-workflow__steps-track"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((item, index) => (
          <div
            key={item.id}
            className={`finance-collection-workflow__step-item${
              index === activeIndex ? ' is-active' : ''
            }${index < activeIndex ? ' is-done' : ''}`}
          >
            <span className="finance-collection-workflow__step-marker" aria-hidden>
              {index < activeIndex ? '✓' : index + 1}
            </span>
            <span className="finance-collection-workflow__step-label">{item.label}</span>
          </div>
        ))}
      </div>
      <p className="finance-family-collection-workflow__step-hint tiny muted" role="status">
        {t('admin.finance.billingAccounts.familyCollection.stepHintSmartSummary')}
      </p>
    </div>
  );
}

export function FamilyCollectionWorkflowForm({
  familyId,
  accountName,
  suggestedAmount,
  source,
  currency: suggestedCurrency,
  prefilledStudentId,
  prefilledStudentName,
  entrySource,
  onDone,
  onCancel,
}: {
  familyId: number;
  accountName?: string;
  suggestedAmount?: number | null;
  source?: FamilyCollectSource | null;
  currency?: unknown;
  prefilledStudentId?: number;
  prefilledStudentName?: string;
  entrySource?: 'student360';
  onDone: (result: FamilyCollectionCreateResponse) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const user = useSession();
  const { activeSchoolId } = useAdminSession();
  const contextState = useFamilyCollectionContext(familyId);
  const { journals, academicYears, loading: refLoading } = useFinanceReferenceData();

  const [amount, setAmount] = useState('');
  const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({});
  const [allocationSource, setAllocationSource] = useState<'auto' | 'manual'>('auto');
  const [journalId, setJournalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [academicYearId, setAcademicYearId] = useState('');
  const [actualPayerName, setActualPayerName] = useState('');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [checkingCashSession, setCheckingCashSession] = useState(false);
  const [accountStudentCount, setAccountStudentCount] = useState(0);
  const [manualEditorOpen, setManualEditorOpen] = useState(false);
  const [backendPreview, setBackendPreview] = useState<FamilyCollectionPreviewResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeBranch, setChequeBranch] = useState('');
  const [chequeHolder, setChequeHolder] = useState('');
  const [chequeWrittenDate, setChequeWrittenDate] = useState('');
  const [chequePostdated, setChequePostdated] = useState(false);
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeNotes, setChequeNotes] = useState('');
  const idempotencyKeyRef = useRef<string | null>(null);
  const pendingCollectibilityRefreshRef = useRef(false);

  const context = contextState.data;
  const currency = context?.currency;
  const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
  const allocatedAmount = sumFamilyAllocationAmounts(allocationInputs);
  const unallocatedAmount = Math.max(0, (parsedAmount || 0) - allocatedAmount);
  const studentCount = accountStudentCount || new Set(context?.open_installments.map((row) => row.student_id)).size || 0;
  const openInstallments = context?.open_installments ?? [];
  const collectibleInstallments = useMemo(
    () => filterCollectibleFamilyInstallments(openInstallments),
    [openInstallments],
  );
  const isCheque = isChequePayment(paymentMethod);
  const chequeValues: CollectionChequeFieldValues = {
    chequeNumber,
    chequeBank,
    chequeHolder,
    chequeWrittenDate,
    chequePostdated,
    chequeDueDate,
    chequeNotes,
    chequeBranch,
  };

  useEffect(() => {
    if (!isCheque) {
      setChequeNumber('');
      setChequeBank('');
      setChequeBranch('');
      setChequeHolder('');
      setChequeWrittenDate('');
      setChequePostdated(false);
      setChequeDueDate('');
      setChequeNotes('');
      return;
    }
    setReference('');
    if (!chequeWrittenDate && collectionDate) {
      setChequeWrittenDate(collectionDate);
    }
  }, [isCheque, collectionDate, chequeWrittenDate]);

  useEffect(() => {
    if (!familyId) return;
    let active = true;
    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    void getFamilyFinanceSummary(familyId, query).then((res) => {
      if (!active || !res.success || !res.data) return;
      setAccountStudentCount(res.data.children.length);
    });

    return () => {
      active = false;
    };
  }, [familyId, activeSchoolId]);

  const selectedJournal = useMemo(
    () => journals.find((j) => String(j.id) === journalId) ?? null,
    [journals, journalId],
  );
  const allowedMethods = selectedJournal?.allowed_payment_methods ?? [];
  const journalCurrency = currencyCode(selectedJournal?.currency) ?? currency ?? undefined;

  useEffect(() => {
    if (!journals.length || journalId) return;
    const defaultJournal = resolveDefaultPaymentJournal(journals);
    if (defaultJournal) setJournalId(String(defaultJournal.id));
  }, [journals, journalId]);

  useEffect(() => {
    if (!academicYears.length || academicYearId) return;
    const current = academicYears.find((y) => y.is_current) ?? academicYears[0];
    if (current) setAcademicYearId(String(current.id));
  }, [academicYears, academicYearId]);

  const requiresCashSession =
    !!selectedJournal &&
    isCashJournal(selectedJournal) &&
    paymentMethodRequiresCashSession(paymentMethod);

  useEffect(() => {
    if (!requiresCashSession || !selectedJournal?.id) {
      setCashSession(null);
      return;
    }
    let active = true;
    setCheckingCashSession(true);
    void fetchCurrentCashSession(selectedJournal.id).then((session) => {
      if (!active) return;
      setCashSession(session);
      setCheckingCashSession(false);
    });
    return () => {
      active = false;
    };
  }, [requiresCashSession, selectedJournal?.id]);

  const cashSessionAccess = useMemo(
    () =>
      resolveCashSessionCollectionAccess({
        requiresSession: requiresCashSession,
        checking: checkingCashSession,
        session: cashSession,
        currentUserId: user?.id,
      }),
    [requiresCashSession, checkingCashSession, cashSession, user?.id],
  );
  const cashSessionBlocked = collectionBlockedByCashSession(cashSessionAccess);

  const confirmState = useMemo(
    () =>
      resolveFamilyCollectionConfirmState({
        parsedAmount,
        journalId,
        paymentMethod,
        academicYearId,
        collectionDate,
        cashSessionBlocked,
        allocationInputs,
        installments: openInstallments,
        reference,
        isCheque,
        chequeNumber,
        chequeBank,
        chequeHolder,
        chequeWrittenDate,
        chequePostdated,
        chequeDueDate,
      }),
    [
      parsedAmount,
      journalId,
      paymentMethod,
      academicYearId,
      collectionDate,
      cashSessionBlocked,
      allocationInputs,
      openInstallments,
      reference,
      isCheque,
      chequeNumber,
      chequeBank,
      chequeHolder,
      chequeWrittenDate,
      chequePostdated,
      chequeDueDate,
    ],
  );

  const canAutoSuggest =
    Number.isFinite(parsedAmount) &&
    parsedAmount > 0 &&
    collectibleInstallments.length > 0 &&
    paymentMethod.trim().length > 0;

  useEffect(() => {
    if (!canAutoSuggest || allocationSource !== 'auto') return;
    const suggested = buildSuggestedFamilyAllocations({
      amount: parsedAmount,
      installments: collectibleInstallments,
    });
    setAllocationInputs(suggested);
    setBackendPreview(null);
  }, [canAutoSuggest, allocationSource, parsedAmount, collectibleInstallments]);

  useEffect(() => {
    if (!openInstallments.length) return;
    setAllocationInputs((current) => {
      const sanitized = sanitizeFamilyAllocationInputs({
        values: current,
        installments: openInstallments,
      });
      if (Object.keys(sanitized).length === Object.keys(current).length) {
        let unchanged = true;
        for (const [key, value] of Object.entries(current)) {
          if (sanitized[Number(key)] !== value) {
            unchanged = false;
            break;
          }
        }
        if (unchanged) return current;
      }
      return sanitized;
    });
  }, [openInstallments]);

  useEffect(() => {
    if (
      !pendingCollectibilityRefreshRef.current ||
      contextState.loading ||
      !canAutoSuggest
    ) {
      return;
    }
    pendingCollectibilityRefreshRef.current = false;
    setAllocationInputs(
      buildSuggestedFamilyAllocations({
        amount: parsedAmount,
        installments: collectibleInstallments,
      }),
    );
  }, [
    contextState.loading,
    contextState.data,
    canAutoSuggest,
    parsedAmount,
    collectibleInstallments,
  ]);

  function buildQuery() {
    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;
    return query;
  }

  function ensureIdempotencyKey(): string {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `fam-coll-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return idempotencyKeyRef.current;
  }

  function buildDraftPayload() {
    const sanitizedInputs = sanitizeFamilyAllocationInputs({
      values: allocationInputs,
      installments: openInstallments,
    });
    const payload: Parameters<typeof submitFamilyCollection>[0] = {
      family_id: familyId,
      amount: parsedAmount,
      journal_id: Number(journalId),
      payment_method: paymentMethod,
      collection_date: collectionDate,
      academic_year_id: Number(academicYearId),
      allocations: parseFamilyAllocationInputs(sanitizedInputs),
    };
    const trimmedPayer = actualPayerName.trim();
    if (trimmedPayer) {
      payload.actual_payer_name = trimmedPayer;
    }
    if (isCheque) {
      const chequePayload = buildChequeRegistrationPayload({
        chequeNumber,
        chequeBank,
        chequeHolder,
        chequeWrittenDate,
        chequePostdated,
        chequeDueDate,
        collectionDate,
        chequeBranch: chequeBranch.trim() || undefined,
      });
      if (chequePayload) {
        payload.payment_method = 'cheque';
        payload.reference = resolveChequeCollectionReference(chequeNumber);
        payload.cheque = chequePayload;
      }
      const trimmedNotes = chequeNotes.trim();
      if (trimmedNotes) {
        payload.notes = trimmedNotes;
      }
    } else if (reference.trim()) {
      payload.reference = reference.trim();
    }
    return payload;
  }

  function handleInstallmentNotCollectible(error: ApiErrorBody) {
    const installmentId = readInstallmentNotCollectibleId(error.details);
    setAllocationSource('auto');
    setSubmitError(
      t('admin.finance.billingAccounts.familyCollection.installmentStateChanged', {
        installmentId: installmentId != null ? String(installmentId) : '',
      }),
    );
    if (!pendingCollectibilityRefreshRef.current) {
      pendingCollectibilityRefreshRef.current = true;
      contextState.reload();
    }
  }

  async function persistDraft(): Promise<FamilyCollectionDetail | null> {
    const payload = buildDraftPayload();
    if (draftId != null) {
      const updated = await updateFamilyCollectionDraft(draftId, payload, buildQuery());
      if (!updated.success) {
        if (updated.error.code === 'installment_not_collectible') {
          handleInstallmentNotCollectible(updated.error);
        }
        return null;
      }
      const normalized = normalizeFamilyCollectionDetail(updated.data);
      if (!normalized) return null;
      const readBack = await getFamilyCollectionById(normalized.id, buildQuery());
      if (!readBack.success) return normalized;
      return normalizeFamilyCollectionDetail(readBack.data) ?? normalized;
    }
    const created = await submitFamilyCollection(
      { ...payload, idempotency_key: ensureIdempotencyKey() },
      buildQuery(),
    );
    if (!created.success) {
      if (created.error.code === 'installment_not_collectible') {
        handleInstallmentNotCollectible(created.error);
      }
      return null;
    }
    const normalized = normalizeFamilyCollectionCreateResponse(created.data);
    if (!normalized) return null;
    const id = normalized.id ?? normalized.collection_id ?? normalized.collections[0]?.id ?? null;
    if (id == null) return null;
    setDraftId(id);
    const readBack = await getFamilyCollectionById(id, buildQuery());
    if (!readBack.success) return null;
    return normalizeFamilyCollectionDetail(readBack.data);
  }

  async function handleSaveDraft(event?: React.FormEvent) {
    event?.preventDefault();
    if (submitting || cashSessionBlocked) return false;
    if (!journalId || !paymentMethod || !academicYearId || !collectionDate) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.missingFields'));
      return false;
    }
    setSubmitting(true);
    setSubmitError(null);
    const saved = await persistDraft();
    setSubmitting(false);
    if (!saved) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.submitFailed'));
      return false;
    }
    return true;
  }

  async function handleConfirm() {
    if (confirming || previewing || !confirmState.canConfirm) return;
    setConfirming(true);
    setSubmitError(null);

    const sanitizedInputs = sanitizeFamilyAllocationInputs({
      values: allocationInputs,
      installments: openInstallments,
    });
    const allocationLines = parseFamilyAllocationInputs(sanitizedInputs);

    setPreviewing(true);
    const previewResult = await fetchFamilyCollectionBackendPreview({
      familyId,
      amount: parsedAmount,
      allocations: allocationLines,
      query: buildQuery(),
    });
    setPreviewing(false);

    if (!previewResult.ok) {
      setConfirming(false);
      setBackendPreview(null);
      const previewMessage =
        previewResult.errors?.filter(Boolean).join(' · ') ||
        previewResult.message ||
        t('admin.finance.billingAccounts.familyCollection.previewFailed');
      setSubmitError(previewMessage);
      return;
    }

    setBackendPreview(previewResult.preview);

    let collectionId = draftId;
    if (collectionId == null) {
      const saved = await persistDraft();
      if (!saved) {
        setConfirming(false);
        setSubmitError(t('admin.finance.billingAccounts.familyCollection.submitFailed'));
        return;
      }
      collectionId = saved.id;
    }

    const confirmed = await confirmFamilyCollection(collectionId, buildQuery());
    setConfirming(false);
    if (!confirmed.success) {
      if (confirmed.error.code === 'installment_not_collectible') {
        handleInstallmentNotCollectible(confirmed.error);
        return;
      }
      setSubmitError(
        resolveCollectionErrorMessage(
          confirmed.error.code,
          confirmed.error.message?.trim() || t('admin.finance.billingAccounts.familyCollection.submitFailed'),
          t,
        ),
      );
      return;
    }
    const normalized = normalizeFamilyCollectionConfirmResponse(confirmed.data);
    if (!normalized) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.submitFailed'));
      return;
    }
    const receiptId = await resolveFamilyCollectionReceiptId(
      collectionId,
      normalized,
      fetchCollectionReceipt,
      async (id) => {
        const issued = await issueCollectionReceipt(id);
        return { receipt: issued.receipt };
      },
    );
    idempotencyKeyRef.current = null;
    onDone({
      id: collectionId,
      collection_id: normalized.collection_id ?? collectionId,
      receipt_id: receiptId,
      allocated_amount: normalized.allocated_amount,
      unallocated_amount: normalized.unallocated_amount,
      collections: [{ id: normalized.collection_id ?? collectionId, state: normalized.state ?? 'confirmed' }],
      receipts: receiptId ? [{ id: receiptId }] : [],
      warnings: normalized.warnings ?? [],
    });
  }

  const studentScopedEntry = entrySource === 'student360' && prefilledStudentId != null;

  if (contextState.loading || refLoading) {
    return <LoadingState label={t('admin.finance.billingAccounts.familyCollection.loading')} />;
  }

  if (contextState.error) {
    return (
      <ApiErrorView
        error={{
          code: contextState.error.code,
          message:
            contextState.error.message?.trim() ||
            t('admin.finance.billingAccounts.familyCollection.contextFailed'),
        }}
        onRetry={contextState.reload}
      />
    );
  }

  const confirmBlockMessage = confirmState.blockReason
    ? t(familyCollectionConfirmBlockReasonKey(confirmState.blockReason))
    : null;

  return (
    <form
      className="finance-collection-workflow finance-family-collection-workflow"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSaveDraft(event);
      }}
    >
      <div className="finance-collection-workflow__scroll">
        <header className="finance-family-collection-header-summary">
          <h4 className="finance-family-collection-header-summary__title">
            {t('admin.finance.billingAccounts.familyCollection.headerSummaryTitle')}
          </h4>
          <dl className="finance-family-collection-header-summary__grid">
            <div>
              <dt>{t('admin.finance.payer')}</dt>
              <dd dir="auto">{accountName?.trim() || t('common.dash')}</dd>
            </div>
            <div>
              <dt>{t('admin.finance.quickPayment.amountLabel')}</dt>
              <dd><FinanceMoney amount={parsedAmount} currency={currency} /></dd>
            </div>
            <div>
              <dt>{t('admin.finance.paymentMethod')}</dt>
              <dd>
                {paymentMethod
                  ? paymentMethodLabel(paymentMethod, t)
                  : t('admin.finance.billingAccounts.familyCollection.paymentMethodPending')}
              </dd>
            </div>
            <div>
              <dt>{t('admin.finance.billingAccounts.familyCollection.preview.allocated')}</dt>
              <dd><FinanceMoney amount={allocatedAmount} currency={currency} /></dd>
            </div>
            <div>
              <dt>{t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}</dt>
              <dd><FinanceMoney amount={unallocatedAmount} currency={currency} /></dd>
            </div>
            <div>
              <dt>{t('admin.finance.billingAccounts.columns.studentCount')}</dt>
              <dd>{studentCount}</dd>
            </div>
          </dl>
        </header>

        <FamilyCollectionWorkflowSteps t={t} />

        {suggestedAmount != null && suggestedAmount > 0 ? (
          <section
            className="finance-quick-payment-suggestion"
            aria-label={t('admin.finance.quickPayment.currentOverdueLabel')}
          >
            <div className="finance-quick-payment-suggestion__main">
              <span className="finance-quick-payment-suggestion__badge">
                {t('admin.finance.quickPayment.currentOverdueLabel')}
              </span>
              <FinanceMoney
                amount={suggestedAmount}
                currency={suggestedCurrency ?? currency}
                className="finance-quick-payment-suggestion__amount"
              />
            </div>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => {
                setAmount(String(suggestedAmount));
                setAllocationSource('auto');
              }}
            >
              {t('admin.finance.quickPayment.useOverdueAmount')}
            </button>
          </section>
        ) : null}

        <section className="collection-form-section finance-quick-payment-primary">
          <h4 className="collection-form-section__title">
            {t('admin.finance.billingAccounts.familyCollection.stepAmount')}
          </h4>
          <QuickPaymentCoreFields
            amount={amount}
            onAmountChange={(value) => {
              setAmount(value);
              setAllocationSource('auto');
            }}
            amountLabel={t('admin.finance.quickPayment.amountLabel')}
            currency={journalCurrency}
            journalId={journalId}
            onJournalChange={setJournalId}
            journals={journals}
            selectedJournal={selectedJournal}
            journalsLoading={refLoading}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            allowedMethods={allowedMethods ?? []}
            collectionDate={collectionDate}
            onCollectionDateChange={setCollectionDate}
            reference={reference}
            onReferenceChange={setReference}
            chequeValues={chequeValues}
            onChequeChange={(patch) => {
              if (patch.chequeNumber !== undefined) setChequeNumber(patch.chequeNumber);
              if (patch.chequeBank !== undefined) setChequeBank(patch.chequeBank);
              if (patch.chequeHolder !== undefined) setChequeHolder(patch.chequeHolder);
              if (patch.chequeWrittenDate !== undefined) setChequeWrittenDate(patch.chequeWrittenDate);
              if (patch.chequePostdated !== undefined) setChequePostdated(patch.chequePostdated);
              if (patch.chequeDueDate !== undefined) setChequeDueDate(patch.chequeDueDate);
              if (patch.chequeNotes !== undefined) setChequeNotes(patch.chequeNotes);
              if (patch.chequeBranch !== undefined) setChequeBranch(patch.chequeBranch);
            }}
          />
        </section>

        <section className="collection-form-section finance-family-actual-payer">
          <label className="finance-family-actual-payer__field">
            <span>{t('admin.finance.billingAccounts.familyCollection.actualPayerName')}</span>
            <input
              type="text"
              className="input"
              value={actualPayerName}
              onChange={(event) => setActualPayerName(event.target.value)}
              placeholder={t('admin.finance.billingAccounts.familyCollection.actualPayerNamePlaceholder')}
              dir="auto"
            />
            <span className="tiny muted">{t('admin.finance.billingAccounts.familyCollection.actualPayerHint')}</span>
          </label>
        </section>

        {studentScopedEntry ? (
          <div className="finance-family-collection-student360-context" role="status">
            <p className="finance-family-collection-student360-context__lead">
              {t('admin.finance.billingAccounts.familyCollection.student360Context', {
                accountName: accountName?.trim() || t('common.dash'),
                studentName: prefilledStudentName?.trim() || `#${prefilledStudentId}`,
              })}
            </p>
          </div>
        ) : null}

        {canAutoSuggest && context ? (
          <FamilyCollectionSmartSummary
            installments={collectibleInstallments}
            allocationInputs={allocationInputs}
            currency={currency}
            unallocatedAmount={unallocatedAmount}
          />
        ) : null}

        {backendPreview ? (
          <FamilyCollectionReviewStep
            amount={backendPreview.amount ?? parsedAmount}
            allocated={backendPreview.allocated_amount ?? allocatedAmount}
            unallocated={backendPreview.unallocated_amount ?? unallocatedAmount}
            paymentMethod={paymentMethod}
            currency={currency}
            allocations={backendPreview.allocations}
            installments={collectibleInstallments}
          />
        ) : null}

        <details className="finance-collection-advanced">
          <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
          <div className="finance-collection-advanced__body">
            <label>
              {t('admin.finance.hub.filterAcademicYear')}
              <select
                className="input"
                required
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
              >
                <option value="">{t('admin.finance.selectAcademicYear')}</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </details>

        <CollectionCashSessionGate
          journal={selectedJournal}
          paymentMethod={paymentMethod}
          collectionPath={`/admin/finance/billing-accounts/${familyId}`}
          session={cashSession}
          checking={checkingCashSession}
        />

        {submitError ? <p className="form-error">{submitError}</p> : null}
      </div>

      <div className="finance-collection-workflow__actions finance-family-collection-workflow__actions--sticky">
        <div className="finance-collection-workflow__footer form-actions">
          <div className="finance-collection-workflow__footer-secondary">
            <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting || confirming}>
              {t('common.cancel')}
            </button>
          </div>
          <div className="finance-collection-workflow__footer-primary">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!canAutoSuggest}
              onClick={() => setManualEditorOpen(true)}
            >
              {t('admin.finance.billingAccounts.familyCollection.editAllocationAction')}
            </button>
            <button
              type="submit"
              className="btn btn--ghost"
              disabled={submitting || cashSessionBlocked}
            >
              {submitting
                ? t('admin.finance.collections.submitting')
                : t('admin.finance.billingAccounts.familyCollection.saveDraftAction')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={confirming || previewing || !confirmState.canConfirm}
              onClick={() => void handleConfirm()}
            >
              {confirming || previewing
                ? t('admin.finance.collections.submitting')
                : t('admin.finance.billingAccounts.familyCollection.confirmAction')}
            </button>
          </div>
        </div>
        {!confirmState.canConfirm && confirmBlockMessage ? (
          <p className="finance-collection-workflow__footer-hint tiny muted" role="status">
            {confirmBlockMessage}
          </p>
        ) : null}
      </div>

      {context ? (
        <FamilyCollectionManualEditor
          open={manualEditorOpen}
          installments={collectibleInstallments}
          allocationInputs={allocationInputs}
          collectionAmount={parsedAmount || 0}
          currency={currency}
          onClose={() => setManualEditorOpen(false)}
          onSave={(values) => {
            setAllocationInputs(values);
            setAllocationSource('manual');
            setBackendPreview(null);
          }}
        />
      ) : null}
    </form>
  );
}
