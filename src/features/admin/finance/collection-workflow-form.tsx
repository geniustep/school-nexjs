'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { currencyCode, paymentMethodLabel } from '@/lib/utils/finance';
import { getStudentDisplayName } from '@/lib/utils/student';
import { normalizeStudentDetailsResponse } from '@/features/admin/students/utils/normalize-student-details';
import { journalErrorMessageKey, normalizePaymentMethodOptions } from '@/lib/utils/finance-normalize';
import { collectionErrorMessageKey, resolveCollectionErrorMessage } from '@/lib/utils/collection-errors';
import { cashSessionErrorMessageKey } from '@/lib/utils/cash-session-errors';
import { isChequePayment } from '@/lib/utils/cheque';
import { isCashJournal, paymentMethodRequiresCashSession } from '@/lib/utils/cash-payment';
import { cashSessionIsActive } from '@/lib/utils/cash-session-normalize';
import { fetchCurrentCashSession } from '@/lib/api/finance-cash-desk';
import {
  CollectionCashSessionGate,
  collectionBlockedByCashSession,
} from '@/features/admin/finance/cash-desk/collection-cash-session-gate';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { BillingPartnerSelect } from '@/features/admin/finance/billing-partner-select';
import {
  billingPartnerDisplayLabel,
  parseEligibleBillingPartners,
  resolveBillingPartnerSelection,
} from '@/features/admin/finance/billing-partner-resolve';
import { CollectionFormBlockers } from '@/features/admin/finance/collection-form-blockers';
import { getCollectionSubmitBlockers } from '@/features/admin/finance/collection-form-validation';
import { ReceivableAllocationSection } from '@/features/admin/finance/receivable-allocation-section';
import { CollectionDuesSelectionStep } from '@/features/admin/finance/collection-dues-selection-step';
import { SelectedStudentFinanceBar } from '@/features/admin/finance/selected-student-finance-bar';
import '@/features/admin/finance/finance-ui.css';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import type {
  CollectionUpdatedOverview,
  CreatePaymentCollectionResponse,
} from '@/types/student-financial-overview';
import type {
  CreatePaymentCollectionPayload,
  FinanceStudentSearchResult,
  PaymentCollection,
  PaymentJournal,
} from '@/types/finance';
import { useStudentCollectibleItems } from '@/features/admin/student-finance/hooks/use-student-collectible-items';
import { collectibleItemsToInstallments } from './collectible-item-mapper';
import {
  buildAllocationPayload,
  autoAllocateOldest,
  sumAllocationAmounts,
  validateAllocationTotals,
} from './collection-allocation-utils';
import {
  CollectionAllocationSummary,
  collectionReferenceLabel,
} from './collection-allocation-summary';
import {
  buildChequeRegistrationPayload,
  resolveChequeCollectionReference,
} from './collection-cheque-payload';
import { CollectionChequeFields } from './collection-cheque-fields';
import {
  formatPaymentJournalLabel,
  journalsSupportingMethod,
  resolveDefaultPaymentJournal,
} from './format-payment-journal';
import { resolveCollectionBilling } from './collection-billing-context';
import { CollectionReviewStep } from './collection-review-step';
import { FinanceAmountInput } from './finance-amount-input';
import { CollectionPrepaymentSummaryCard } from './collection-prepayment-summary-card';
import { CollectionAllocationPreviewPanel } from './collection-allocation-preview-panel';
import { previewPaymentCollection } from '@/lib/finance/payment-collection-api';
import {
  isCollectionPreviewStale,
  normalizePaymentCollectionPreview,
} from '@/lib/finance/normalize-collection-preview';
import { CollectionSuccessPanel } from './collection-success-panel';
import {
  mergeCreateCollectionResponse,
  resolveCollectionSuccessSummary,
  type CollectionSuccessFallback,
} from './resolve-collection-success-summary';
import { resolveCollectionGateBlocked } from '@/lib/finance/collection-gate';
import { useAdminSession } from '@/features/auth/admin-session-context';
import type { PaymentCollectionPreview } from '@/types/payment-collection-preview';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';

type WorkflowStep = 'dues' | 'payment' | 'review' | 'success';

function CollectionWorkflowSteps({
  step,
  flexiblePrepayment,
}: {
  step: WorkflowStep;
  flexiblePrepayment: boolean;
}) {
  const t = useT();
  const steps: { id: WorkflowStep; label: string }[] = flexiblePrepayment
    ? [
        { id: 'payment', label: t('admin.finance.collectionWorkflow.stepPaymentAndAmount') },
        { id: 'review', label: t('admin.finance.collectionWorkflow.stepReview') },
      ]
    : [
        { id: 'payment', label: t('admin.finance.collectionWorkflow.stepPaymentMethod') },
        { id: 'review', label: t('admin.finance.collectionWorkflow.stepReview') },
      ];

  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <nav
      className="finance-collection-workflow__steps finance-collection-workflow__steps--progress"
      aria-label={t('admin.finance.collectionWorkflow.recordPayment')}
    >
      <ol
        className="finance-collection-workflow__steps-track"
        style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
      >
        {steps.map((item, index) => (
          <li
            key={item.id}
            className={`finance-collection-workflow__step-item${
              step === item.id ? ' is-active' : ''
            }${step === 'success' || activeIndex > index ? ' is-done' : ''}`}
            title={item.label}
          >
            <span className="finance-collection-workflow__step-marker" aria-hidden>
              {activeIndex > index || step === 'success' ? '✓' : index + 1}
            </span>
            <span className="finance-collection-workflow__step-label">{item.label}</span>
          </li>
        ))}
      </ol>
      <p className="finance-collection-workflow__steps-mobile tiny muted">
        {t('admin.finance.collectionWorkflow.stepProgress', {
          current: String(Math.max(1, activeIndex + 1)),
          total: String(steps.length),
          label: steps[Math.max(0, activeIndex)]?.label ?? '',
        })}
      </p>
    </nav>
  );
}

export function CollectionWorkflowForm({
  onDone,
  onCancel,
  initialStudentId,
  lockStudent = false,
  initialAcademicYearId,
  initialBillingPartnerId,
  initialBillingProfileId,
  financialOverview,
  useInstallmentAllocations = false,
  onOverviewUpdate,
  embedded = false,
}: {
  onDone: (collection: PaymentCollection) => void;
  onCancel: () => void;
  initialStudentId?: number | string;
  lockStudent?: boolean;
  initialAcademicYearId?: number | string;
  initialBillingPartnerId?: number | string;
  initialBillingProfileId?: number | string;
  financialOverview?: StudentFinancialOverview | null;
  useInstallmentAllocations?: boolean;
  onOverviewUpdate?: (overview: CollectionUpdatedOverview) => void;
  embedded?: boolean;
}) {
  const t = useT();
  const { journals, academicYears, loading: refLoading } = useFinanceReferenceData();

  if (!refLoading && journals.length === 0) {
    return (
      <div className={embedded ? 'form-stack' : 'card form-stack'}>
        <h3>{t('admin.finance.recordCollection')}</h3>
        <p>{t('admin.finance.noPaymentJournalDesc')}</p>
        <div className="row form-actions">
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('common.back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <CollectionWorkflowFormReady
      journals={journals}
      academicYears={academicYears}
      refLoading={refLoading}
      initialStudentId={initialStudentId}
      lockStudent={lockStudent}
      initialAcademicYearId={initialAcademicYearId}
      initialBillingPartnerId={initialBillingPartnerId}
      initialBillingProfileId={initialBillingProfileId}
      financialOverview={financialOverview}
      useInstallmentAllocations={useInstallmentAllocations}
      onOverviewUpdate={onOverviewUpdate}
      embedded={embedded}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

function CollectionWorkflowFormReady({
  journals,
  academicYears,
  refLoading,
  initialStudentId,
  lockStudent = false,
  initialAcademicYearId,
  initialBillingPartnerId,
  initialBillingProfileId,
  financialOverview,
  useInstallmentAllocations = false,
  onOverviewUpdate,
  embedded = false,
  onDone,
  onCancel,
}: {
  journals: PaymentJournal[];
  academicYears: { id: number; name: string; is_current?: boolean }[];
  refLoading: boolean;
  initialStudentId?: number | string;
  lockStudent?: boolean;
  initialAcademicYearId?: number | string;
  initialBillingPartnerId?: number | string;
  initialBillingProfileId?: number | string;
  financialOverview?: StudentFinancialOverview | null;
  useInstallmentAllocations?: boolean;
  onOverviewUpdate?: (overview: CollectionUpdatedOverview) => void;
  embedded?: boolean;
  onDone: (collection: PaymentCollection) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const collectionPath = `${pathname}${searchParams.toString() ? `?${searchParams}` : ''}`;
  const flexiblePrepaymentFlow = useInstallmentAllocations;
  const [step, setStep] = useState<WorkflowStep>('payment');
  const [selectedInstallmentIds, setSelectedInstallmentIds] = useState<number[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudentSearchResult | null>(null);
  const [journalId, setJournalId] = useState('');
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ? String(initialAcademicYearId) : '');
  const [billingPartnerId, setBillingPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectionDate, setCollectionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({});
  const [skipAllocation, setSkipAllocation] = useState(false);
  const [manualAllocation, setManualAllocation] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const postedCollectionIdRef = useRef<number | null>(null);
  const amountManuallyEditedRef = useRef(false);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeBranch, setChequeBranch] = useState('');
  const [chequeHolder, setChequeHolder] = useState('');
  const [chequeWrittenDate, setChequeWrittenDate] = useState('');
  const [chequePostdated, setChequePostdated] = useState(false);
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [chequeNotes, setChequeNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCollection, setCreatedCollection] = useState<PaymentCollection | null>(null);
  const [successFallback, setSuccessFallback] = useState<CollectionSuccessFallback | null>(null);
  const [updatedOverview, setUpdatedOverview] = useState<CollectionUpdatedOverview | null>(null);
  const [hasCashSession, setHasCashSession] = useState<boolean | null>(null);
  const [checkingCashSession, setCheckingCashSession] = useState(false);
  const [preview, setPreview] = useState<PaymentCollectionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialStudentId || selectedStudent) return;
    let active = true;
    api.get<unknown>(endpoints.admin.student(initialStudentId)).then((res) => {
      if (!active || !res.success || !res.data) return;
      const details = normalizeStudentDetailsResponse(res.data);
      const s = details?.student;
      if (!s) return;
      setSelectedStudent({
        id: s.id,
        name: getStudentDisplayName(s),
        full_name: getStudentDisplayName(s),
        code: s.code ?? s.school_number ?? null,
      });
    });
    return () => {
      active = false;
    };
  }, [initialStudentId, selectedStudent]);

  const selectedJournal = journals.find((j) => String(j.id) === journalId) ?? null;
  const journalCurrency = currencyCode(selectedJournal?.currency ?? selectedJournal?.currency_code);
  const parsedAmount = Number(amount);

  const partnersState = useAdminResource<unknown>(
    selectedStudent ? endpoints.admin.financeEligibleBillingPartners(selectedStudent.id) : null,
  );
  const billingPartnerSelection = useMemo(
    () => resolveBillingPartnerSelection(parseEligibleBillingPartners(partnersState.data)),
    [partnersState.data],
  );
  const { partners, defaultId, hintKey, requiresUserChoice } = billingPartnerSelection;
  const partnersLoadFailed = !!partnersState.error || (!partnersState.loading && partners.length === 0);

  const collectibleState = useStudentCollectibleItems(
    selectedStudent?.id ?? null,
    academicYearId || null,
    !!(selectedStudent && flexiblePrepaymentFlow && academicYearId),
  );
  const collectibleData = collectibleState.data;
  const resolvedBilling = useMemo(
    () =>
      resolveCollectionBilling({
        collectible: collectibleData,
        overview: financialOverview,
        initialBillingProfileId,
        initialBillingPartnerId,
        selectedBillingPartnerId: billingPartnerId,
      }),
    [
      collectibleData,
      financialOverview,
      initialBillingProfileId,
      initialBillingPartnerId,
      billingPartnerId,
    ],
  );
  const openInstallments = useMemo(
    () => collectibleItemsToInstallments(collectibleData?.items ?? []),
    [collectibleData?.items],
  );

  const allowedMethods = useMemo(
    () => normalizePaymentMethodOptions(selectedJournal?.allowed_payment_methods),
    [selectedJournal],
  );
  const chequeCapableJournals = useMemo(
    () => journalsSupportingMethod(journals, 'cheque'),
    [journals],
  );
  const singleJournal = journals.length === 1;
  const journalReadOnly = singleJournal || (isChequePayment(paymentMethod) && chequeCapableJournals.length === 1);

  useEffect(() => {
    if (journalId || !journals.length) return;
    const defaultJournal = resolveDefaultPaymentJournal(journals);
    if (defaultJournal) setJournalId(String(defaultJournal.id));
  }, [journals, journalId]);

  useEffect(() => {
    if (!isChequePayment(paymentMethod) || chequeCapableJournals.length !== 1) return;
    const onlyId = String(chequeCapableJournals[0].id);
    if (journalId !== onlyId) setJournalId(onlyId);
  }, [paymentMethod, chequeCapableJournals, journalId]);

  const journalSelectOptions = isChequePayment(paymentMethod) ? chequeCapableJournals : journals;

  useEffect(() => {
    const current = academicYears.find((y) => y.is_current);
    if (current && !academicYearId) setAcademicYearId(String(current.id));
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (collectibleData?.billing_partner_id) {
      setBillingPartnerId(String(collectibleData.billing_partner_id));
      return;
    }
    if (!selectedStudent || partnersState.loading) return;
    if (partnersLoadFailed) {
      setBillingPartnerId('');
      return;
    }
    const preferredId =
      initialBillingPartnerId &&
      partners.some((p) => String(p.id) === String(initialBillingPartnerId))
        ? String(initialBillingPartnerId)
        : null;
    if (preferredId) {
      setBillingPartnerId(preferredId);
      return;
    }
    if (defaultId && !requiresUserChoice) {
      setBillingPartnerId((current) => current || String(defaultId));
      return;
    }
    setBillingPartnerId((current) =>
      current && partners.some((p) => String(p.id) === current) ? current : '',
    );
  }, [
    selectedStudent?.id,
    partnersState.loading,
    partnersLoadFailed,
    defaultId,
    requiresUserChoice,
    partners,
    initialBillingPartnerId,
    collectibleData?.billing_partner_id,
  ]);

  useEffect(() => {
    if (!allowedMethods.length) return;
    const codes = allowedMethods.map((m) => m.code);
    if (!paymentMethod) {
      setPaymentMethod(codes[0]);
      return;
    }
    if (!codes.includes(paymentMethod)) {
      setPaymentMethod(codes[0]);
    }
  }, [allowedMethods, paymentMethod]);

  const isCheque = isChequePayment(paymentMethod);

  useEffect(() => {
    if (!isCheque || chequeWrittenDate) return;
    if (collectionDate) setChequeWrittenDate(collectionDate);
  }, [isCheque, collectionDate, chequeWrittenDate]);

  const requiresCashSession =
    !!selectedJournal &&
    isCashJournal(selectedJournal) &&
    paymentMethodRequiresCashSession(paymentMethod);

  useEffect(() => {
    if (!requiresCashSession || !selectedJournal?.id) {
      setHasCashSession(null);
      return;
    }
    let active = true;
    setCheckingCashSession(true);
    void fetchCurrentCashSession(selectedJournal.id).then((session) => {
      if (!active) return;
      setHasCashSession(!!session && cashSessionIsActive(session.state));
      setCheckingCashSession(false);
    });
    return () => {
      active = false;
    };
  }, [requiresCashSession, selectedJournal?.id]);

  const cashSessionBlocked = collectionBlockedByCashSession({
    journal: selectedJournal,
    paymentMethod,
    hasOpenSession: hasCashSession,
  });
  const allocatedTotal = sumAllocationAmounts(allocationInputs);
  const showSelectionStep = false;
  const showAllocationStep = false;
  const collectionGate = collectibleData?.collection_gate ?? null;
  const gateBlock = useMemo(
    () => resolveCollectionGateBlocked(collectionGate, collectibleData?.summary ?? null),
    [collectionGate, collectibleData?.summary],
  );
  const agreementSummary =
    financialOverview?.special_agreement ?? null;
  const previewValid =
    !!preview?.is_valid && !isCollectionPreviewStale(preview, parsedAmount) && !gateBlock.blocked;

  const selectedInstallments = useMemo(
    () => openInstallments.filter((row) => selectedInstallmentIds.includes(row.id)),
    [openInstallments, selectedInstallmentIds],
  );

  function handleAmountChange(value: string) {
    amountManuallyEditedRef.current = true;
    setAmount(value);
    setPreview(null);
    setPreviewError(null);
  }

  function handleSelectedInstallmentIdsChange(ids: number[]) {
    amountManuallyEditedRef.current = false;
    setSelectedInstallmentIds(ids);
  }

  function applyQuickSelection(mode: 'overdue' | 'due' | 'next' | 'all_open' | 'custom') {
    amountManuallyEditedRef.current = false;
    if (mode === 'all_open') {
      const ids = openInstallments.map((row) => row.id);
      setSelectedInstallmentIds(ids);
      setAmount(String(openInstallments.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0)));
      return;
    }
    if (mode === 'overdue') {
      const rows = openInstallments.filter((row) => row.timing_status === 'overdue');
      setSelectedInstallmentIds(rows.map((row) => row.id));
      setAmount(String(rows.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0)));
      return;
    }
    if (mode === 'due') {
      const rows = openInstallments.filter((row) => row.timing_status === 'due');
      setSelectedInstallmentIds(rows.map((row) => row.id));
      setAmount(String(rows.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0)));
      return;
    }
    if (mode === 'next') {
      const next = [...openInstallments]
        .filter((row) => (row.remaining_amount ?? 0) > 0)
        .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))[0];
      if (!next) return;
      setSelectedInstallmentIds([next.id]);
      setAmount(String(next.remaining_amount ?? 0));
    }
  }

  useEffect(() => {
    if (!selectedInstallmentIds.length || manualAllocation) return;
    const rows = selectedInstallments;
    if (!rows.length) return;
    if (amountManuallyEditedRef.current) return;

    const total = rows.reduce((sum, row) => sum + (row.remaining_amount ?? 0), 0);
    if (total > 0) setAmount(String(total));
    const allocation: Record<number, string> = {};
    for (const row of rows) {
      allocation[row.id] = String(row.remaining_amount ?? 0);
    }
    setAllocationInputs(allocation);
  }, [selectedInstallmentIds, selectedInstallments, manualAllocation]);

  useEffect(() => {
    if (!selectedInstallmentIds.length || manualAllocation) return;
    if (!amountManuallyEditedRef.current) return;
    const rows = selectedInstallments;
    if (!rows.length) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setAllocationInputs(autoAllocateOldest(rows, parsedAmount));
  }, [parsedAmount, selectedInstallments, selectedInstallmentIds, manualAllocation]);

  const submitBlockers = useMemo(
    () =>
      getCollectionSubmitBlockers({
        hasStudent: !!selectedStudent,
        journalId,
        academicYearId,
        billingPartnerId,
        resolvedBillingPartnerId: resolvedBilling.billingPartnerId,
        partnersLoading: partnersState.loading,
        partnersLoadFailed,
        partnersCount: partners.length,
        requiresBillingPartnerChoice: requiresUserChoice,
        amount: parsedAmount,
        paymentMethod,
        allowedMethodCodes: allowedMethods.map((m) => m.code),
        collectionDate,
        isCheque,
        chequeNumber,
        chequeBank,
        chequeHolder,
        chequeWrittenDate,
        chequePostdated,
        chequeDueDate,
        reference,
        showAllocationStep: showAllocationStep && openInstallments.length > 0,
        skipAllocation,
        allocatedTotal,
        collectionAmount: parsedAmount,
        selectedInstallmentCount: selectedInstallmentIds.length,
        flexiblePrepayment: flexiblePrepaymentFlow,
        previewValid,
        collectionBlocked: gateBlock.blocked,
      }),
    [
      selectedStudent,
      journalId,
      academicYearId,
      billingPartnerId,
      partnersState.loading,
      partnersLoadFailed,
      partners.length,
      requiresUserChoice,
      parsedAmount,
      paymentMethod,
      allowedMethods,
      collectionDate,
      isCheque,
      chequeNumber,
      chequeBank,
      chequeHolder,
      chequeWrittenDate,
      chequePostdated,
      chequeDueDate,
      showAllocationStep,
      openInstallments.length,
      skipAllocation,
      allocatedTotal,
      reference,
      resolvedBilling.billingPartnerId,
      selectedInstallmentIds.length,
      flexiblePrepaymentFlow,
      previewValid,
      gateBlock.blocked,
    ],
  );

  const canProceedPayment = submitBlockers.length === 0 && !cashSessionBlocked && !checkingCashSession;
  const canContinueFromDues = Number.isFinite(parsedAmount) && parsedAmount > 0;

  function goToPaymentStep() {
    if (selectedInstallmentIds.length === 0) {
      setManualAllocation(true);
    }
    setStep('payment');
  }

  function resolveErrorMessage(code: string | undefined, fallback: string): string {
    return resolveCollectionErrorMessage(code, fallback, t, [
      cashSessionErrorMessageKey,
      journalErrorMessageKey,
    ]);
  }

  function ensureIdempotencyKey(): string {
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `coll-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
    return idempotencyKeyRef.current;
  }

  async function runCollectionPreview() {
    if (!selectedStudent || !academicYearId || gateBlock.blocked) return;
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPreviewError(t('admin.finance.errors.invalidAmount'));
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);
    setError(null);

    const query: Record<string, number> = {};
    if (activeSchoolId != null) query.active_school_id = activeSchoolId;

    const agreementId =
      agreementSummary?.id ??
      agreementSummary?.agreement_id ??
      undefined;

    const manualLines = manualAllocation
      ? buildAllocationPayload(allocationInputs, openInstallments)
      : [];
    const useManual = manualAllocation && manualLines.length > 0;

    const res = await previewPaymentCollection(
      {
        student_id: Number(selectedStudent.id),
        academic_year_id: Number(academicYearId),
        amount: parsedAmount,
        ...(useManual
          ? { allocation_mode: 'selected_installments' as const, allocations: manualLines }
          : { strategy: 'oldest_due_first' as const }),
        ...(agreementId ? { agreement_id: agreementId } : {}),
        ...(resolvedBilling.billingPartnerId
          ? { billing_partner_id: resolvedBilling.billingPartnerId }
          : {}),
        ...(resolvedBilling.billingProfileId
          ? { billing_profile_id: resolvedBilling.billingProfileId }
          : {}),
      },
      query,
    );

    setPreviewLoading(false);

    if (!res.success) {
      const message = resolveErrorMessage(res.error.code, res.error.message);
      setPreviewError(message);
      setError(message);
      return;
    }

    const normalized = normalizePaymentCollectionPreview(res.data);
    if (!normalized) {
      const message = t('admin.finance.collectionWorkflow.errors.genericSubmit');
      setPreviewError(message);
      setError(message);
      return;
    }

    if (normalized.errors.length) {
      setPreviewError(normalized.errors.join(' · '));
    }

    setPreview(normalized);
  }

  function buildPayload(): CreatePaymentCollectionPayload | null {
    if (!selectedStudent || !canProceedPayment) return null;
    const payload: CreatePaymentCollectionPayload = {
      student_id: selectedStudent.id,
      academic_year_id: Number(academicYearId),
      journal_id: Number(journalId),
      amount: parsedAmount,
      payment_method: paymentMethod,
      payment_date: collectionDate,
      collection_date: collectionDate,
      notes: [notes.trim(), chequeNotes.trim()].filter(Boolean).join('\n').trim() || undefined,
      idempotency_key: ensureIdempotencyKey(),
    };
    if (resolvedBilling.billingProfileId) {
      payload.billing_profile_id = resolvedBilling.billingProfileId;
    }
    if (resolvedBilling.billingPartnerId) {
      payload.billing_partner_id = resolvedBilling.billingPartnerId;
    }

    if (flexiblePrepaymentFlow) {
      if (!preview?.is_valid || isCollectionPreviewStale(preview, parsedAmount)) {
        setError(t('admin.finance.collections.blockers.previewRequired'));
        return null;
      }
      payload.allocation_mode = manualAllocation ? 'selected_installments' : 'oldest_due_first';
      payload.allocations = preview.allocations.map((row) => ({
        installment_id: row.installment_id,
        student_fee_id: row.student_fee_id ?? undefined,
        amount: row.amount,
      }));
    } else if (useInstallmentAllocations && showSelectionStep && selectedInstallments.length > 0 && !skipAllocation) {
      const lines = buildAllocationPayload(allocationInputs, selectedInstallments);
      const validation = validateAllocationTotals({
        collectionAmount: parsedAmount,
        allocatedAmount: allocatedTotal,
        lines,
        installments: selectedInstallments,
      });
      if (validation) {
        setError(t(`admin.finance.collectionWorkflow.errors.${validation}`));
        return null;
      }
      if (lines.length) {
        payload.allocation_mode = 'selected_installments';
        payload.allocations = lines;
      }
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
      if (!chequePayload) {
        setError(t('admin.finance.collectionWorkflow.errors.invalidChequeDateOrder'));
        return null;
      }
      payload.payment_method = 'cheque';
      payload.reference = resolveChequeCollectionReference(chequeNumber);
      payload.cheque = chequePayload;
    } else if (reference.trim()) {
      payload.reference = reference.trim();
    }
    return payload;
  }

  async function submitCollection() {
    const payload = buildPayload();
    if (!payload) return;
    if (cashSessionBlocked) {
      setError(t('admin.finance.cashDesk.collectionGateDesc'));
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await api.post<CreatePaymentCollectionResponse | PaymentCollection>(
      endpoints.admin.financePaymentCollections,
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[collection]', res.error?.code, res.error?.message);
      }
      setError(resolveErrorMessage(res.error.code, res.error.message));
      return;
    }
    idempotencyKeyRef.current = null;
    const body = res.data;
    const merged = mergeCreateCollectionResponse(body);
    const collection = merged.collection;
    const overview =
      body && typeof body === 'object' && 'updated_overview' in body
        ? (body as CreatePaymentCollectionResponse).updated_overview ?? null
        : collection.updated_overview ?? null;
    const isReplay = postedCollectionIdRef.current === collection.id;
    if (!isReplay) {
      postedCollectionIdRef.current = collection.id;
      if (overview) onOverviewUpdate?.(overview);
    }
    setSuccessFallback({
      amount: parsedAmount,
      paymentMethod,
      journalLabel: selectedJournal ? formatPaymentJournalLabel(selectedJournal) : null,
      ...merged.fallback,
    });
    setCreatedCollection(collection);
    setUpdatedOverview(overview);
    setStep('success');
  }

  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (flexiblePrepaymentFlow && step !== 'review') return;
    if (!canProceedPayment || submitting) return;
    void submitCollection();
  }

  const wrapperClass = embedded ? 'form-stack finance-collection-workflow' : 'card form-stack finance-collection-workflow finance-collection-workflow--page';
  const pageMode = !embedded;
  const installmentFlow = false;
  const reviewAllocationInputs = useMemo(() => {
    if (!preview?.allocations.length) return allocationInputs;
    const mapped: Record<number, string> = {};
    for (const row of preview.allocations) {
      mapped[row.installment_id] = String(row.amount);
    }
    return mapped;
  }, [preview, allocationInputs]);
  const reviewInstallments = useMemo(() => {
    if (!preview?.allocations.length) return selectedInstallments;
    return preview.allocations
      .map((row) => openInstallments.find((item) => item.id === row.installment_id))
      .filter((row): row is StudentInstallment => row != null);
  }, [preview, openInstallments, selectedInstallments]);

  if (step === 'success' && createdCollection) {
    const successSummary = resolveCollectionSuccessSummary(createdCollection, successFallback ?? undefined);
    return (
      <div className={`${wrapperClass} finance-collection-workflow__success-panel`}>
        {installmentFlow || flexiblePrepaymentFlow || pageMode ? (
          <CollectionWorkflowSteps step={step} flexiblePrepayment={flexiblePrepaymentFlow} />
        ) : null}
        <CollectionSuccessPanel
          summary={successSummary}
          updatedOverview={updatedOverview}
          pageMode={pageMode}
          onViewCollection={() => onDone(createdCollection)}
          onClose={() => (pageMode ? onCancel() : onDone(createdCollection))}
        />
        {isChequePayment(successSummary.paymentMethodCode ?? createdCollection.payment_method) ? (
          <p className="finance-cheque-pending-note">{t('admin.finance.collectionWorkflow.chequePendingNote')}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form className={wrapperClass} onSubmit={onFormSubmit}>
      <div className="finance-collection-workflow__scroll">
      {installmentFlow || flexiblePrepaymentFlow || pageMode ? (
        <CollectionWorkflowSteps step={step} flexiblePrepayment={flexiblePrepaymentFlow} />
      ) : null}
      {!embedded ? (
        <p className="muted finance-collection-workflow__intro">
          {flexiblePrepaymentFlow
            ? t('admin.finance.collectionWorkflow.flexiblePrepaymentIntro')
            : t('admin.finance.collectionWorkflow.paymentStepDesc')}
        </p>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {previewError ? <p className="form-error collection-form-preview-error">{previewError}</p> : null}

      {!embedded && !selectedStudent ? (
        <FinanceStudentSearch compact onSelect={setSelectedStudent} showProfileLink={false} />
      ) : !embedded && selectedStudent ? (
        <SelectedStudentFinanceBar
          student={selectedStudent}
          allowChange={!lockStudent}
          onChangeStudent={() => {
            setSelectedStudent(null);
            setBillingPartnerId('');
            setAllocationInputs({});
            setSkipAllocation(false);
            setManualAllocation(false);
          }}
        />
      ) : null}

      {selectedStudent && flexiblePrepaymentFlow && step === 'payment' ? (
        <CollectionPrepaymentSummaryCard
          studentName={selectedStudent.name ?? selectedStudent.full_name}
          studentCode={selectedStudent.code}
          agreement={agreementSummary}
          billingContext={collectibleData?.billing_context ?? null}
          summary={collectibleData?.summary ?? null}
          collectionGate={collectionGate}
          currency={journalCurrency}
        />
      ) : null}

      {selectedStudent && installmentFlow && step === 'dues' ? (
        <CollectionDuesSelectionStep
          items={collectibleData?.items ?? []}
          summary={collectibleData?.summary ?? null}
          loading={collectibleState.loading}
          currency={journalCurrency}
          selectedIds={selectedInstallmentIds}
          amount={amount}
          onAmountChange={handleAmountChange}
          onSelectedIdsChange={handleSelectedInstallmentIdsChange}
          onQuickSelect={applyQuickSelection}
        />
      ) : null}

      {selectedStudent && ((flexiblePrepaymentFlow && step === 'payment') || (!flexiblePrepaymentFlow && (!installmentFlow || step === 'payment'))) ? (
        <>
          <section className="collection-form-section">
            <h4 className="collection-form-section__title">{t('admin.finance.collections.contextSection')}</h4>
            <div className="finance-collection-workflow__fields finance-collection-workflow__fields--context">
              <label>
                {t('admin.finance.academicYear')}
                <select
                  className="input"
                  required
                  value={academicYearId}
                  onChange={(e) => {
                    if (
                      Object.keys(allocationInputs).length > 0 &&
                      !window.confirm(t('admin.finance.collections.confirmYearChange'))
                    ) {
                      return;
                    }
                    setAcademicYearId(e.target.value);
                    setAllocationInputs({});
                  }}
                  disabled={refLoading || academicYears.length === 0 || !!initialAcademicYearId}
                >
                  <option value="">
                    {refLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}
                  </option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.name}
                    </option>
                  ))}
                </select>
              </label>

              {journalReadOnly && selectedJournal ? (
                <div className="finance-collection-workflow__journal-readonly">
                  <span className="tiny muted">{t('admin.finance.paymentJournal')}</span>
                  <strong dir="auto">{formatPaymentJournalLabel(selectedJournal)}</strong>
                </div>
              ) : (
                <label>
                  {t('admin.finance.paymentJournal')}
                  <select
                    className="input"
                    required
                    value={journalId}
                    onChange={(e) => setJournalId(e.target.value)}
                    disabled={refLoading}
                  >
                    <option value="">
                      {refLoading
                        ? t('admin.finance.collections.loadingJournals')
                        : t('admin.finance.selectPaymentJournal')}
                    </option>
                    {journalSelectOptions.map((j) => (
                      <option key={j.id} value={j.id}>
                        {formatPaymentJournalLabel(j)}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="finance-collection-workflow__billing-readonly">
                <span className="tiny muted">{t('admin.finance.billingPartyTitle')}</span>
                <strong dir="auto">
                  {resolvedBilling.billingPartnerName ??
                    (billingPartnerId
                      ? billingPartnerDisplayLabel(
                          partners.find((p) => String(p.id) === billingPartnerId) ?? {
                            id: Number(billingPartnerId),
                            label: '',
                          },
                        )
                      : null) ??
                    t('common.dash')}
                </strong>
              </div>

              {requiresUserChoice || partners.length > 1 ? (
                <BillingPartnerSelect
                  partners={partners}
                  loading={partnersState.loading}
                  loadFailed={partnersLoadFailed}
                  hintKey={hintKey}
                  requiresUserChoice={requiresUserChoice}
                  value={billingPartnerId}
                  onChange={setBillingPartnerId}
                  onRetry={() => partnersState.reload?.()}
                />
              ) : null}
            </div>
          </section>

          <section className="collection-form-section">
            <h4 className="collection-form-section__title">{t('admin.finance.collections.paymentSection')}</h4>
            <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment">
              <label className="finance-amount-field finance-amount-field--prominent">
                {flexiblePrepaymentFlow
                  ? t('admin.finance.collectionWorkflow.paidAmountLabel')
                  : t('admin.finance.collectionAmount')}
                <div className="finance-amount-field__input">
                  <FinanceAmountInput
                    value={amount}
                    onChange={handleAmountChange}
                    disabled={flexiblePrepaymentFlow && gateBlock.blocked}
                  />
                  {journalCurrency ? (
                    <span className="finance-amount-field__suffix">{journalCurrency}</span>
                  ) : null}
                </div>
                {flexiblePrepaymentFlow ? (
                  <span className="finance-amount-field__hint tiny muted">
                    {t('admin.finance.collectionWorkflow.paidAmountHint')}
                  </span>
                ) : null}
              </label>

              {flexiblePrepaymentFlow ? (
                <div className="finance-collection-workflow__preview-actions">
                  <label className="collection-skip-allocation">
                    <input
                      type="checkbox"
                      checked={manualAllocation}
                      onChange={(e) => {
                        setManualAllocation(e.target.checked);
                        setAllocationInputs({});
                        setPreview(null);
                        setPreviewError(null);
                      }}
                    />
                    <span>{t('admin.finance.collectionWorkflow.manualAllocationToggle')}</span>
                  </label>
                  <p className="tiny muted">
                    {manualAllocation
                      ? t('admin.finance.collectionWorkflow.manualAllocationHint')
                      : t('admin.finance.collectionWorkflow.autoAllocationHint')}
                  </p>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    disabled={
                      previewLoading ||
                      gateBlock.blocked ||
                      !Number.isFinite(parsedAmount) ||
                      parsedAmount <= 0
                    }
                    onClick={() => void runCollectionPreview()}
                  >
                    {previewLoading
                      ? t('common.loading')
                      : t('admin.finance.collectionWorkflow.previewDistributionAction')}
                  </button>
                </div>
              ) : null}

              <label>
                {t('admin.finance.paymentMethod')}
                <select
                  className="input"
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={!journalId || allowedMethods.length === 0}
                >
                  <option value="">
                    {!journalId
                      ? t('admin.finance.collections.selectJournalFirst')
                      : t('admin.finance.selectPaymentMethod')}
                  </option>
                  {allowedMethods.map((m) => (
                    <option key={m.code} value={m.code}>
                      {paymentMethodLabel(m.code, t)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                {t('admin.finance.collectionDate')}
                <input
                  className="input"
                  required
                  type="date"
                  value={collectionDate}
                  onChange={(e) => setCollectionDate(e.target.value)}
                />
              </label>

              {collectionReferenceLabel(paymentMethod, t) ? (
                <label>
                  {collectionReferenceLabel(paymentMethod, t)}
                  <input
                    className="input"
                    dir="ltr"
                    required={
                      paymentMethod === 'transfer' || paymentMethod === 'bank_transfer'
                    }
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
              ) : null}
            </div>

            {flexiblePrepaymentFlow && manualAllocation && step === 'payment' ? (
              <ReceivableAllocationSection
                installments={openInstallments}
                loading={collectibleState.loading}
                currency={journalCurrency}
                collectionAmount={parsedAmount}
                allocationInputs={allocationInputs}
                onAllocationChange={(values) => {
                  setAllocationInputs(values);
                  setPreview(null);
                }}
                skipAllocation={false}
                onSkipAllocationChange={() => undefined}
              />
            ) : null}

            {flexiblePrepaymentFlow && step === 'payment' ? (
              <CollectionAllocationPreviewPanel
                preview={preview}
                items={collectibleData?.lookup_items ?? collectibleData?.items ?? []}
                currency={journalCurrency}
                loading={previewLoading}
              />
            ) : null}

            {installmentFlow && !manualAllocation && selectedInstallments.length > 0 ? (
              <CollectionAllocationSummary
                installments={selectedInstallments}
                allocationInputs={allocationInputs}
                collectionAmount={parsedAmount}
                currency={journalCurrency}
                manualMode={false}
                onEditManual={() => setManualAllocation(true)}
              />
            ) : null}

            {installmentFlow && (manualAllocation || selectedInstallments.length === 0) ? (
              <ReceivableAllocationSection
                installments={selectedInstallments.length ? selectedInstallments : openInstallments}
                loading={collectibleState.loading}
                currency={journalCurrency}
                collectionAmount={parsedAmount}
                allocationInputs={allocationInputs}
                onAllocationChange={setAllocationInputs}
                skipAllocation={skipAllocation}
                onSkipAllocationChange={setSkipAllocation}
              />
            ) : null}

            <CollectionCashSessionGate
              journal={selectedJournal}
              paymentMethod={paymentMethod}
              collectionPath={collectionPath}
            />

            {isCheque ? (
              <CollectionChequeFields
                collectionDate={collectionDate}
                values={{
                  chequeNumber,
                  chequeBank,
                  chequeHolder,
                  chequeWrittenDate,
                  chequePostdated,
                  chequeDueDate,
                  chequeNotes,
                  chequeBranch,
                }}
                onChange={(patch) => {
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
            ) : null}

            {!isCheque ? (
              <label className="finance-collection-workflow__full-width">
                {t('common.note')}
                <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </label>
            ) : null}
          </section>
        </>
      ) : null}

      {selectedStudent && flexiblePrepaymentFlow && step === 'review' ? (
        <CollectionReviewStep
          studentName={selectedStudent.name ?? selectedStudent.full_name ?? ''}
          registrationNumber={selectedStudent.code}
          academicYearName={academicYears.find((y) => String(y.id) === academicYearId)?.name}
          billing={resolvedBilling}
          journalName={selectedJournal ? formatPaymentJournalLabel(selectedJournal) : undefined}
          paymentMethod={paymentMethod}
          collectionDate={collectionDate}
          reference={isCheque ? resolveChequeCollectionReference(chequeNumber) : reference}
          amount={parsedAmount}
          currency={journalCurrency}
          selectedInstallments={reviewInstallments}
          allocationInputs={reviewAllocationInputs}
          allocatedTotal={preview?.allocated_amount ?? allocatedTotal}
          cheque={
            isCheque
              ? {
                  holderName: chequeHolder,
                  bankName: chequeBank,
                  chequeNumber,
                  writtenDate: chequeWrittenDate,
                  dueDate: chequePostdated ? chequeDueDate : chequeWrittenDate,
                  postdated: chequePostdated,
                }
              : undefined
          }
        />
      ) : null}

      {selectedStudent && installmentFlow && step === 'review' ? (
        <CollectionReviewStep
          studentName={selectedStudent.name ?? selectedStudent.full_name ?? ''}
          registrationNumber={selectedStudent.code}
          academicYearName={academicYears.find((y) => String(y.id) === academicYearId)?.name}
          billing={resolvedBilling}
          journalName={selectedJournal ? formatPaymentJournalLabel(selectedJournal) : undefined}
          paymentMethod={paymentMethod}
          collectionDate={collectionDate}
          reference={isCheque ? resolveChequeCollectionReference(chequeNumber) : reference}
          amount={parsedAmount}
          currency={journalCurrency}
          selectedInstallments={selectedInstallments}
          allocationInputs={allocationInputs}
          allocatedTotal={allocatedTotal}
          cheque={
            isCheque
              ? {
                  holderName: chequeHolder,
                  bankName: chequeBank,
                  chequeNumber,
                  writtenDate: chequeWrittenDate,
                  dueDate: chequePostdated ? chequeDueDate : chequeWrittenDate,
                  postdated: chequePostdated,
                }
              : undefined
          }
        />
      ) : null}

      {selectedStudent && !flexiblePrepaymentFlow && !installmentFlow ? (
        <>
          <section className="collection-form-section">
            <h4 className="collection-form-section__title">{t('admin.finance.collections.contextSection')}</h4>
            <div className="finance-collection-workflow__fields finance-collection-workflow__fields--context">
              <label>
                {t('admin.finance.paymentJournal')}
                <select className="input" required value={journalId} onChange={(e) => setJournalId(e.target.value)} disabled={refLoading}>
                  <option value="">{refLoading ? t('admin.finance.collections.loadingJournals') : t('admin.finance.selectPaymentJournal')}</option>
                  {journals.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                      {j.code ? ` (${j.code})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('admin.finance.academicYear')}
                <select className="input" required value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} disabled={refLoading || !!initialAcademicYearId}>
                  <option value="">{t('admin.finance.selectAcademicYear')}</option>
                  {academicYears.map((y) => (
                    <option key={y.id} value={y.id}>{y.name}</option>
                  ))}
                </select>
              </label>
              <BillingPartnerSelect
                partners={partners}
                loading={partnersState.loading}
                loadFailed={partnersLoadFailed}
                hintKey={hintKey}
                requiresUserChoice={requiresUserChoice}
                value={billingPartnerId}
                onChange={setBillingPartnerId}
                onRetry={() => partnersState.reload?.()}
              />
            </div>
          </section>
          <section className="collection-form-section">
            <h4 className="collection-form-section__title">{t('admin.finance.collections.paymentSection')}</h4>
            <div className="finance-collection-workflow__fields finance-collection-workflow__fields--payment">
              <label className="finance-amount-field">
                {t('admin.finance.collectionAmount')}
                <div className="finance-amount-field__input">
                  <FinanceAmountInput value={amount} onChange={setAmount} />
                  {journalCurrency ? <span className="finance-amount-field__suffix">{journalCurrency}</span> : null}
                </div>
              </label>
              <label>
                {t('admin.finance.paymentMethod')}
                <select className="input" required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={!journalId}>
                  <option value="">{t('admin.finance.selectPaymentMethod')}</option>
                  {allowedMethods.map((m) => (
                    <option key={m.code} value={m.code}>{paymentMethodLabel(m.code, t)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('admin.finance.collectionDate')}
                <input className="input" required type="date" value={collectionDate} onChange={(e) => setCollectionDate(e.target.value)} />
              </label>
              <label>
                {t('admin.finance.externalReference')}
                <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
            </div>
            <label className="finance-collection-workflow__full-width">
              {t('common.note')}
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </section>
          {showAllocationStep ? (
            <ReceivableAllocationSection
              installments={openInstallments}
              loading={collectibleState.loading}
              currency={journalCurrency}
              collectionAmount={parsedAmount}
              allocationInputs={allocationInputs}
              onAllocationChange={setAllocationInputs}
              skipAllocation={skipAllocation}
              onSkipAllocationChange={setSkipAllocation}
            />
          ) : null}
        </>
      ) : null}

      </div>

      {selectedStudent ? (
        <div className="finance-collection-workflow__actions">
          <CollectionFormBlockers blockers={submitBlockers} />
          <div className="form-actions finance-collection-workflow__footer">
            {flexiblePrepaymentFlow && step === 'payment' ? (
              <>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canProceedPayment || !previewValid}
                  onClick={() => setStep('review')}
                >
                  {t('admin.finance.collectionWorkflow.continueToReview')}
                </button>
              </>
            ) : null}
            {flexiblePrepaymentFlow && step === 'review' ? (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setStep('payment')}>
                  {t('common.back')}
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting || !canProceedPayment || !previewValid}>
                  {submitting
                    ? t('admin.finance.collections.submitting')
                    : t('admin.finance.collectionWorkflow.recordCollectionAction')}
                </button>
              </>
            ) : null}
            {installmentFlow && step === 'dues' && !canContinueFromDues ? (
              <p className="collection-dues-selection__hint finance-collection-workflow__footer-hint" role="status">
                {t('admin.finance.collectionWorkflow.enterCollectionAmountHint')}
              </p>
            ) : null}
            {installmentFlow && step === 'dues' ? (
              <button
                type="button"
                className="btn btn--primary"
                disabled={!canContinueFromDues}
                onClick={goToPaymentStep}
              >
                {t('admin.finance.collectionWorkflow.continueToPayment')}
              </button>
            ) : null}
            {installmentFlow && step === 'payment' ? (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setStep('dues')}>
                  {t('common.back')}
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={!canProceedPayment}
                  onClick={() => setStep('review')}
                >
                  {t('admin.finance.collectionWorkflow.continueToReview')}
                </button>
              </>
            ) : null}
            {installmentFlow && step === 'review' ? (
              <>
                <button type="button" className="btn btn--ghost" onClick={() => setStep('payment')}>
                  {t('common.back')}
                </button>
                <button type="submit" className="btn btn--primary" disabled={submitting || !canProceedPayment}>
                  {submitting
                    ? t('admin.finance.collections.submitting')
                    : t('admin.finance.collectionWorkflow.confirmPaymentAndReceipt')}
                </button>
              </>
            ) : null}
            {!flexiblePrepaymentFlow && !installmentFlow ? (
              <button type="submit" className="btn btn--primary" disabled={submitting || !canProceedPayment}>
                {submitting
                  ? t('admin.finance.collections.submitting')
                  : t('admin.finance.collectionWorkflow.recordPayment')}
              </button>
            ) : null}
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
