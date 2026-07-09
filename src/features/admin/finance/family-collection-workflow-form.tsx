'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ApiErrorView, LoadingState } from '@/components/states/states';
import { CollectionCashSessionGate, collectionBlockedByCashSession, resolveCashSessionCollectionAccess } from '@/features/admin/finance/cash-desk/collection-cash-session-gate';
import { FamilyCollectionAllocationSection } from '@/features/admin/finance/family-collection-allocation-section';
import {
  hasActiveFamilyAllocations,
  hasUnsavedFamilyCollectionChanges,
  parseFamilyAllocationInputs,
  sumFamilyAllocationAmounts,
  validateFamilyAllocations,
  type FamilyInstallmentFilter,
} from '@/features/admin/finance/family-collection-allocation-utils';
import { buildSuggestedFamilyAllocations } from '@/features/admin/finance/family-suggested-allocation-utils';
import type { FamilyCollectSource } from '@/features/admin/finance/family-collect-query';
import { FamilyCollectionReviewStep } from '@/features/admin/finance/family-collection-review-step';
import { resolveFamilyCollectionReceiptId } from '@/features/admin/finance/family-collection-receipt-resolve';
import { resolveDefaultPaymentJournal } from '@/features/admin/finance/format-payment-journal';
import { useFamilyCollectionContext } from '@/features/admin/finance/hooks/use-family-collection-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { QuickPaymentCoreFields } from '@/features/admin/finance/quick-payment-core-fields';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useSession } from '@/features/auth/session-context';
import { useT } from '@/features/i18n/locale-context';
import { fetchCollectionReceipt } from '@/lib/api/finance-receipt';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import { resolveCollectionErrorMessage } from '@/lib/utils/collection-errors';
import { currencyCode } from '@/lib/utils/finance';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import { normalizeFamilyCollectionConfirmResponse, normalizeFamilyCollectionCreateResponse, normalizeFamilyCollectionDetail, normalizeFamilyCollectionPreviewResponse } from '@/lib/utils/normalize-family-finance';
import { confirmFamilyCollection, getFamilyCollectionById, getFamilyFinanceSummary, previewFamilyCollectionAllocation, submitFamilyCollection, updateFamilyCollectionDraft } from '@/features/admin/student-finance/api/family-finance-api';
import type { FamilyCollectionCreateResponse, FamilyCollectionDetail, FamilyCollectionPreviewResponse } from '@/types/family-finance';
import type { CashSession } from '@/types/finance-cash-desk';

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
  const [journalId, setJournalId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [academicYearId, setAcademicYearId] = useState('');
  const [step, setStep] = useState<'edit' | 'review'>('edit');
  const [draftId, setDraftId] = useState<number | null>(null);
  const [preview, setPreview] = useState<FamilyCollectionPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cashSession, setCashSession] = useState<CashSession | null>(null);
  const [checkingCashSession, setCheckingCashSession] = useState(false);
  const [accountStudentCount, setAccountStudentCount] = useState(0);
  const [installmentFilter, setInstallmentFilter] = useState<FamilyInstallmentFilter>('all');
  const [expandedStudentIds, setExpandedStudentIds] = useState<Set<number>>(() => new Set());
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const context = contextState.data;
  const currency = context?.currency;
  const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
  const allocatedAmount = sumFamilyAllocationAmounts(allocationInputs);
  const unallocatedAmount = Math.max(0, (parsedAmount || 0) - allocatedAmount);

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

  const previewValid = !!preview && !preview.errors.length && previewError == null;
  const studentScopedEntry = entrySource === 'student360' && prefilledStudentId != null;

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

  function handleCancel() {
    if (
      hasUnsavedFamilyCollectionChanges({
        amount,
        values: allocationInputs,
        draftId,
      }) &&
      !window.confirm(t('admin.finance.billingAccounts.familyCollection.unsavedExitWarning'))
    ) {
      return;
    }
    onCancel();
  }

  function handleSuggestAllocation() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !context?.open_installments.length) {
      return;
    }

    if (
      hasActiveFamilyAllocations(allocationInputs) &&
      !window.confirm(
        t('admin.finance.billingAccounts.familyCollection.replaceSuggestionConfirm'),
      )
    ) {
      return;
    }

    setAllocationInputs(
      buildSuggestedFamilyAllocations({
        amount: parsedAmount,
        installments: context.open_installments,
      }),
    );
    setSuggestionApplied(true);
    setExpandedStudentIds(new Set());
    setStep('edit');
    setPreview(null);
    setPreviewError(null);
  }

  async function runPreview() {
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPreviewError(t('admin.finance.billingAccounts.familyCollection.invalidAmount'));
      setPreview(null);
      return;
    }
    const validation = validateFamilyAllocations({
      amount: parsedAmount,
      values: allocationInputs,
      installments: context?.open_installments ?? [],
    });
    if (validation) {
      setPreviewError(
        resolveCollectionErrorMessage(
          validation,
          t('admin.finance.billingAccounts.familyCollection.previewFailed'),
          t,
        ),
      );
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    const res = await previewFamilyCollectionAllocation(
      {
        family_id: familyId,
        amount: parsedAmount,
        allocations: parseFamilyAllocationInputs(allocationInputs),
      },
      buildQuery(),
    );

    setPreviewLoading(false);

    if (!res.success) {
      setPreviewError(res.error.message?.trim() || t('admin.finance.billingAccounts.familyCollection.previewFailed'));
      return;
    }

    const normalized = normalizeFamilyCollectionPreviewResponse(res.data);
    if (!normalized) {
      setPreviewError(t('admin.finance.billingAccounts.familyCollection.previewFailed'));
      return;
    }
    if (normalized.errors.length) setPreviewError(normalized.errors.join(' · '));
    setPreview(normalized);
    setStep('review');
  }

  async function persistDraft(): Promise<FamilyCollectionDetail | null> {
    const payload = {
      family_id: familyId,
      amount: parsedAmount,
      journal_id: Number(journalId),
      payment_method: paymentMethod,
      collection_date: collectionDate,
      academic_year_id: Number(academicYearId),
      allocations: parseFamilyAllocationInputs(allocationInputs),
    };
    if (draftId != null) {
      const updated = await updateFamilyCollectionDraft(draftId, payload, buildQuery());
      if (!updated.success) return null;
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
    if (!created.success) return null;
    const normalized = normalizeFamilyCollectionCreateResponse(created.data);
    if (!normalized) return null;
    const id = normalized.id ?? normalized.collection_id ?? normalized.collections[0]?.id ?? null;
    if (id == null) return null;
    setDraftId(id);
    const readBack = await getFamilyCollectionById(id, buildQuery());
    if (!readBack.success) return null;
    return normalizeFamilyCollectionDetail(readBack.data);
  }

  async function handleSaveDraft(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || cashSessionBlocked) return;
    if (!journalId || !paymentMethod || !academicYearId || !collectionDate) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.missingFields'));
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    const saved = await persistDraft();
    setSubmitting(false);
    if (!saved) {
      setSubmitError(t('admin.finance.billingAccounts.familyCollection.submitFailed'));
      return;
    }
    setPreview((current) =>
      current
        ? {
            ...current,
            allocations: saved.allocations,
            allocated_amount: saved.allocated_amount ?? current.allocated_amount,
            unallocated_amount: saved.unallocated_amount ?? current.unallocated_amount,
          }
        : current,
    );
    setStep('review');
  }

  async function handleConfirm() {
    if (draftId == null || confirming) return;
    setConfirming(true);
    setSubmitError(null);
    const confirmed = await confirmFamilyCollection(draftId, buildQuery());
    setConfirming(false);
    if (!confirmed.success) {
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
      draftId,
      normalized,
      fetchCollectionReceipt,
    );
    idempotencyKeyRef.current = null;
    onDone({
      id: draftId,
      collection_id: normalized.collection_id ?? draftId,
      receipt_id: receiptId,
      allocated_amount: normalized.allocated_amount,
      unallocated_amount: normalized.unallocated_amount,
      collections: [{ id: normalized.collection_id ?? draftId, state: normalized.state ?? 'confirmed' }],
      receipts: receiptId ? [{ id: receiptId }] : [],
      warnings: normalized.warnings ?? [],
    });
  }

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

  return (
    <form className="finance-collection-workflow finance-family-collection-workflow" onSubmit={handleSaveDraft}>
      <div className="finance-collection-workflow__scroll">
        <p className="finance-family-collection-workflow__intro muted">
          {t('admin.finance.billingAccounts.familyCollection.intro')}
        </p>
        <dl className="detail-list compact finance-family-collection-preview-metrics">
          <div>
            <dt>{t('admin.finance.payer')}</dt>
            <dd dir="auto">{accountName?.trim() || t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.billingAccounts.columns.studentCount')}</dt>
            <dd>{accountStudentCount || context?.open_installments.length || 0}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.quickPayment.amountLabel')}</dt>
            <dd><FinanceMoney amount={parsedAmount} currency={currency} /></dd>
          </div>
          <div>
            <dt>{t('admin.finance.billingAccounts.familyCollection.preview.allocated')}</dt>
            <dd><FinanceMoney amount={allocatedAmount} currency={currency} /></dd>
          </div>
          <div>
            <dt>{t('admin.finance.billingAccounts.familyCollection.preview.unallocated')}</dt>
            <dd><FinanceMoney amount={unallocatedAmount} currency={currency} /></dd>
          </div>
        </dl>

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
                setStep('edit');
                setPreview(null);
                setPreviewError(null);
              }}
            >
              {t('admin.finance.quickPayment.useOverdueAmount')}
            </button>
          </section>
        ) : context?.total_remaining != null ? (
          <p className="finance-family-collection-workflow__balance tiny muted">
            {t('admin.finance.billingAccounts.metrics.remaining')}:{' '}
            <FinanceMoney amount={context.total_remaining} currency={currency} />
          </p>
        ) : null}

        <section className="collection-form-section finance-quick-payment-primary">
          <QuickPaymentCoreFields
            amount={amount}
            onAmountChange={(value) => {
              setAmount(value);
              setSuggestionApplied(false);
              setStep('edit');
              setPreview(null);
              setPreviewError(null);
            }}
            amountLabel={t('admin.finance.quickPayment.amountLabel')}
            currency={journalCurrency}
            journalId={journalId}
            onJournalChange={(value) => {
              setJournalId(value);
              setStep('edit');
              setPreview(null);
            }}
            journals={journals}
            selectedJournal={selectedJournal}
            journalsLoading={refLoading}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={(value) => {
              setPaymentMethod(value);
              setStep('edit');
              setPreview(null);
            }}
            allowedMethods={allowedMethods ?? []}
            collectionDate={collectionDate}
            onCollectionDateChange={setCollectionDate}
          />
        </section>

        <section className="finance-family-collection-allocation-options">
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
          <p className="tiny muted finance-family-collection-allocation-options__hint" role="status">
            {t('admin.finance.billingAccounts.familyCollection.manualAllocationHint')}
          </p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              disabled={
                !Number.isFinite(parsedAmount) ||
                parsedAmount <= 0 ||
                !context?.open_installments.length
              }
              onClick={handleSuggestAllocation}
            >
              {t('admin.finance.billingAccounts.familyCollection.suggestAllocationAction')}
            </button>
          </div>
          {suggestionApplied ? (
            <p className="tiny muted finance-family-collection-allocation-options__hint" role="status">
              {t('admin.finance.billingAccounts.familyCollection.suggestionExplainability')}
            </p>
          ) : null}
        </section>

        <details className="finance-collection-advanced">
          <summary>{t('admin.finance.quickPayment.additionalDetails')}</summary>
          <div className="finance-collection-advanced__body">
            <label>
              {t('admin.finance.hub.filterAcademicYear')}
              <select
                className="input"
                required
                value={academicYearId}
                onChange={(e) => {
                  setAcademicYearId(e.target.value);
                  setPreview(null);
                }}
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

        {previewError ? <p className="form-error collection-form-preview-error">{previewError}</p> : null}

        {context ? (
          <FamilyCollectionAllocationSection
            installments={context.open_installments}
            currency={currency}
            collectionAmount={parsedAmount || 0}
            allocationInputs={allocationInputs}
            installmentFilter={installmentFilter}
            onInstallmentFilterChange={setInstallmentFilter}
            expandedStudentIds={expandedStudentIds}
            onExpandedStudentIdsChange={setExpandedStudentIds}
            onAllocationChange={(values) => {
              setAllocationInputs(values);
              setSuggestionApplied(false);
              setPreview(null);
              setStep('edit');
            }}
            highlightStudentId={prefilledStudentId}
            compactAfterSuggestion={suggestionApplied}
          />
        ) : null}

        {step === 'review' && preview ? (
          <FamilyCollectionReviewStep
            accountName={accountName}
            amount={parsedAmount}
            allocated={preview.allocated_amount ?? allocatedAmount}
            unallocated={preview.unallocated_amount ?? unallocatedAmount}
            paymentMethod={paymentMethod}
            currency={currency}
            allocations={preview.allocations}
            installments={context?.open_installments ?? []}
            onBackToEdit={() => setStep('edit')}
          />
        ) : null}

        <CollectionCashSessionGate
          journal={selectedJournal}
          paymentMethod={paymentMethod}
          collectionPath={`/admin/finance/billing-accounts/${familyId}`}
          session={cashSession}
          checking={checkingCashSession}
        />

        {submitError ? <p className="form-error">{submitError}</p> : null}
      </div>

      <div className="finance-collection-workflow__actions">
        <div className="finance-collection-workflow__footer form-actions">
          <div className="finance-collection-workflow__footer-secondary">
            <button type="button" className="btn btn--ghost" onClick={handleCancel} disabled={submitting}>
              {t('common.cancel')}
            </button>
          </div>
          <div className="finance-collection-workflow__footer-primary">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={previewLoading || !Number.isFinite(parsedAmount) || parsedAmount <= 0}
              onClick={() => void runPreview()}
            >
              {previewLoading
                ? t('common.loading')
                : t('admin.finance.billingAccounts.familyCollection.reviewAction')}
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={submitting || cashSessionBlocked}
            >
              {submitting
                ? t('admin.finance.collections.submitting')
                : t('admin.finance.billingAccounts.familyCollection.saveDraftAction')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={confirming || !previewValid || cashSessionBlocked || draftId == null}
              onClick={() => void handleConfirm()}
            >
              {confirming
                ? t('admin.finance.collections.submitting')
                : t('admin.finance.billingAccounts.familyCollection.confirmAction')}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
