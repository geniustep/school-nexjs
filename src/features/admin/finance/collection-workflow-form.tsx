'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { currencyCode, paymentMethodLabel } from '@/lib/utils/finance';
import { getStudentDisplayName } from '@/lib/utils/student';
import { normalizeStudentDetailsResponse } from '@/features/admin/students/utils/normalize-student-details';
import { journalErrorMessageKey, normalizePaymentMethodOptions, parseFinanceList } from '@/lib/utils/finance-normalize';
import { collectionErrorMessageKey } from '@/lib/utils/collection-errors';
import { isChequePayment } from '@/lib/utils/cheque';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { BillingPartnerSelect } from '@/features/admin/finance/billing-partner-select';
import { CollectionFormBlockers } from '@/features/admin/finance/collection-form-blockers';
import { getCollectionSubmitBlockers } from '@/features/admin/finance/collection-form-validation';
import { ReceivableAllocationSection } from '@/features/admin/finance/receivable-allocation-section';
import { SelectedStudentFinanceBar } from '@/features/admin/finance/selected-student-finance-bar';
import '@/features/admin/finance/finance-ui.css';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import type {
  CreatePaymentCollectionPayload,
  EligibleBillingPartner,
  FinanceStudentSearchResult,
  PaymentCollection,
  PaymentJournal,
} from '@/types/finance';
import {
  buildAllocationPayload,
  sumAllocationAmounts,
  validateAllocationTotals,
} from './collection-allocation-utils';

type WorkflowStep = 'payment' | 'allocation' | 'success';

function CollectionWorkflowSteps({
  step,
  showAllocation,
}: {
  step: WorkflowStep;
  showAllocation: boolean;
}) {
  const t = useT();
  if (!showAllocation) return null;
  const steps: { id: WorkflowStep; label: string }[] = [
    { id: 'payment', label: t('admin.finance.collectionWorkflow.stepPayment') },
    { id: 'allocation', label: t('admin.finance.collectionWorkflow.stepAllocation') },
  ];
  return (
    <nav className="finance-collection-workflow__steps" aria-label={t('admin.finance.recordCollection')}>
      {steps.map((item, index) => (
        <span
          key={item.id}
          className={`finance-collection-workflow__step${step === item.id ? ' is-active' : ''}${step === 'success' || (step === 'allocation' && item.id === 'payment') ? ' is-done' : ''}`}
        >
          {index + 1}. {item.label}
        </span>
      ))}
    </nav>
  );
}

export function CollectionWorkflowForm({
  onDone,
  onCancel,
  initialStudentId,
  lockStudent = false,
  initialAcademicYearId,
  useInstallmentAllocations = false,
  embedded = false,
}: {
  onDone: (collection: PaymentCollection) => void;
  onCancel: () => void;
  initialStudentId?: number | string;
  lockStudent?: boolean;
  initialAcademicYearId?: number | string;
  useInstallmentAllocations?: boolean;
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
      useInstallmentAllocations={useInstallmentAllocations}
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
  useInstallmentAllocations = false,
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
  useInstallmentAllocations?: boolean;
  embedded?: boolean;
  onDone: (collection: PaymentCollection) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [step, setStep] = useState<WorkflowStep>('payment');
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
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeBranch, setChequeBranch] = useState('');
  const [chequeDrawer, setChequeDrawer] = useState('');
  const [chequeHolder, setChequeHolder] = useState('');
  const [chequeReceivedDate, setChequeReceivedDate] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeMaturityDate, setChequeMaturityDate] = useState('');
  const [chequePublicNotes, setChequePublicNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdCollection, setCreatedCollection] = useState<PaymentCollection | null>(null);

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

  const partnersState = useAdminResource<EligibleBillingPartner[]>(
    selectedStudent ? endpoints.admin.financeEligibleBillingPartners(selectedStudent.id) : null,
  );
  const partners = useMemo(
    () => parseFinanceList<EligibleBillingPartner>(partnersState.data),
    [partnersState.data],
  );

  const installmentParams = useMemo(
    () =>
      selectedStudent && academicYearId
        ? {
            page: 1,
            page_size: 100,
            academic_year_id: Number(academicYearId),
            exclude_paid: 1,
          }
        : null,
    [selectedStudent, academicYearId],
  );

  const installmentsState = useAdminResource<StudentInstallment[]>(
    selectedStudent && useInstallmentAllocations && installmentParams
      ? endpoints.admin.studentInstallments(selectedStudent.id)
      : null,
    installmentParams ?? undefined,
  );
  const openInstallments = useMemo(
    () => (installmentsState.data ?? []).filter((row) => (row.remaining_amount ?? 0) > 0),
    [installmentsState.data],
  );

  const allowedMethods = useMemo(
    () => normalizePaymentMethodOptions(selectedJournal?.allowed_payment_methods),
    [selectedJournal],
  );

  useEffect(() => {
    const current = academicYears.find((y) => y.is_current);
    if (current && !academicYearId) setAcademicYearId(String(current.id));
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (partners.length === 1 && !billingPartnerId) setBillingPartnerId(String(partners[0].id));
  }, [partners, billingPartnerId]);

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
  const allocatedTotal = sumAllocationAmounts(allocationInputs);
  const showAllocationStep =
    useInstallmentAllocations && !!academicYearId && (installmentsState.loading || openInstallments.length > 0);

  const submitBlockers = useMemo(
    () =>
      getCollectionSubmitBlockers({
        hasStudent: !!selectedStudent,
        journalId,
        academicYearId,
        billingPartnerId,
        partnersLoading: partnersState.loading,
        partnersCount: partners.length,
        amount: parsedAmount,
        paymentMethod,
        allowedMethodCodes: allowedMethods.map((m) => m.code),
        collectionDate,
        isCheque,
        chequeNumber,
        chequeBank,
        chequeHolder,
        chequeReceivedDate,
        chequeMaturityDate,
        showAllocationStep: showAllocationStep && openInstallments.length > 0,
        skipAllocation,
        allocatedTotal,
        collectionAmount: parsedAmount,
      }),
    [
      selectedStudent,
      journalId,
      academicYearId,
      billingPartnerId,
      partnersState.loading,
      partners.length,
      parsedAmount,
      paymentMethod,
      allowedMethods,
      collectionDate,
      isCheque,
      chequeNumber,
      chequeBank,
      chequeHolder,
      chequeReceivedDate,
      chequeMaturityDate,
      showAllocationStep,
      openInstallments.length,
      skipAllocation,
      allocatedTotal,
    ],
  );

  const canProceedPayment = submitBlockers.length === 0;

  function resolveErrorMessage(code: string | undefined, fallback: string): string {
    const key = collectionErrorMessageKey(code) ?? journalErrorMessageKey(code);
    return key ? t(key) : fallback;
  }

  function buildPayload(): CreatePaymentCollectionPayload | null {
    if (!selectedStudent || !canProceedPayment) return null;
    const payload: CreatePaymentCollectionPayload = {
      student_id: selectedStudent.id,
      academic_year_id: Number(academicYearId),
      journal_id: Number(journalId),
      billing_partner_id: Number(billingPartnerId),
      amount: parsedAmount,
      payment_method: paymentMethod,
      collection_date: collectionDate,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (showAllocationStep && !skipAllocation && openInstallments.length > 0) {
      const lines = buildAllocationPayload(allocationInputs, openInstallments);
      const validation = validateAllocationTotals({
        collectionAmount: parsedAmount,
        allocatedAmount: allocatedTotal,
        lines,
        installments: openInstallments,
      });
      if (validation) {
        setError(t(`admin.finance.collectionWorkflow.errors.${validation}`));
        return null;
      }
      if (lines.length) payload.allocations = lines;
    }

    if (isCheque) {
      payload.payment_method = 'cheque';
      payload.cheque = {
        cheque_number: chequeNumber.trim(),
        bank_name: chequeBank.trim(),
        holder_name: chequeHolder.trim() || chequeDrawer.trim(),
        received_date: chequeReceivedDate,
        due_date: chequeMaturityDate,
      };
    }
    return payload;
  }

  async function submitCollection() {
    const payload = buildPayload();
    if (!payload) return;
    setSubmitting(true);
    setError(null);
    const res = await api.post<PaymentCollection>(endpoints.admin.financePaymentCollections, payload);
    setSubmitting(false);
    if (!res.success) {
      setError(resolveErrorMessage(res.error.code, res.error.message));
      return;
    }
    setCreatedCollection(res.data);
    setStep('success');
    if (embedded) {
      onDone(res.data);
    }
  }

  function onFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceedPayment || submitting) return;
    void submitCollection();
  }

  const wrapperClass = embedded ? 'form-stack finance-collection-workflow' : 'card form-stack finance-collection-workflow finance-collection-workflow--page';
  const pageMode = !embedded;

  if (step === 'success' && createdCollection) {
    return (
      <div className={`${wrapperClass} finance-collection-workflow__success-panel`}>
        {pageMode ? <CollectionWorkflowSteps step={step} showAllocation={showAllocationStep} /> : null}
        <h3>{t('admin.finance.collectionWorkflow.successTitle')}</h3>
        <p>{t('admin.finance.collectionWorkflow.successBody')}</p>
        <dl className="detail-list">
          <div>
            <dt>{t('admin.finance.reference')}</dt>
            <dd>{createdCollection.reference ?? createdCollection.name ?? `#${createdCollection.id}`}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.paymentMethod')}</dt>
            <dd>{paymentMethodLabel(createdCollection.payment_method, t)}</dd>
          </div>
          <div>
            <dt>{t('admin.finance.collectionAmount')}</dt>
            <dd>
              <FinanceMoney amount={createdCollection.amount ?? createdCollection.total_amount} />
            </dd>
          </div>
          <div>
            <dt>{t('admin.finance.collectionWorkflow.allocationsCount')}</dt>
            <dd>{createdCollection.allocations?.length ?? 0}</dd>
          </div>
        </dl>
        {isChequePayment(createdCollection.payment_method) ? (
          <p className="finance-cheque-pending-note">{t('admin.finance.collectionWorkflow.chequePendingNote')}</p>
        ) : null}
        <div className="row form-actions">
          {pageMode ? (
            <>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onDone(createdCollection)}
              >
                {t('admin.finance.collectionWorkflow.viewCollection')}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
                {t('admin.finance.backToCollections')}
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onDone(createdCollection)}>
              {t('common.close')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className={wrapperClass} onSubmit={onFormSubmit}>
      {!pageMode ? (
        <>
          <h3 className="finance-collection-workflow__section-title">{t('admin.finance.recordCollection')}</h3>
          <p className="muted finance-collection-workflow__intro">
            {t('admin.finance.collectionWorkflow.paymentStepDesc')}
          </p>
        </>
      ) : (
        <p className="muted finance-collection-workflow__intro">
          {t('admin.finance.collectionWorkflow.paymentStepDesc')}
        </p>
      )}
      {error ? <p className="form-error">{error}</p> : null}

      {!selectedStudent ? (
        <FinanceStudentSearch compact onSelect={setSelectedStudent} showProfileLink={false} />
      ) : (
        <SelectedStudentFinanceBar
          student={selectedStudent}
          allowChange={!lockStudent}
          onChangeStudent={() => {
            setSelectedStudent(null);
            setBillingPartnerId('');
            setAllocationInputs({});
            setSkipAllocation(false);
          }}
        />
      )}

      {selectedStudent ? (
        <>
          <section className="collection-form-section">
            <h4 className="collection-form-section__title">{t('admin.finance.collections.contextSection')}</h4>
            <div className="finance-collection-workflow__fields finance-collection-workflow__fields--context">
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

              <BillingPartnerSelect
                partners={partners}
                loading={partnersState.loading}
                error={partnersState.error?.message ?? null}
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
                  <input
                    className="input"
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {journalCurrency ? (
                    <span className="finance-amount-field__suffix">{journalCurrency}</span>
                  ) : null}
                </div>
              </label>

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

              <label>
                {t('admin.finance.externalReference')}
                <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
              </label>
            </div>

            {isCheque ? (
              <fieldset className="finance-cheque-fields finance-collection-workflow__fields finance-collection-workflow__fields--cheque">
                <legend>{t('admin.finance.cheques.registrationTitle')}</legend>
                <p className="tiny muted">{t('admin.finance.collectionWorkflow.chequeDatesHelp')}</p>
                <label>
                  {t('admin.finance.cheques.chequeNumber')}
                  <input className="input" required value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.cheques.bankName')}
                  <input className="input" required value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.collectionWorkflow.chequeBranch')}
                  <input className="input" value={chequeBranch} onChange={(e) => setChequeBranch(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.collectionWorkflow.chequeDrawer')}
                  <input className="input" value={chequeDrawer} onChange={(e) => setChequeDrawer(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.cheques.holderName')}
                  <input className="input" required value={chequeHolder} onChange={(e) => setChequeHolder(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.cheques.receivedDate')}
                  <input
                    className="input"
                    type="date"
                    required
                    value={chequeReceivedDate}
                    onChange={(e) => setChequeReceivedDate(e.target.value)}
                  />
                </label>
                <label>
                  {t('admin.finance.collectionWorkflow.chequeWrittenDate')}
                  <input className="input" type="date" value={chequeDate} onChange={(e) => setChequeDate(e.target.value)} />
                </label>
                <label>
                  {t('admin.finance.cheques.dueDate')}
                  <input
                    className="input"
                    type="date"
                    required
                    min={chequeReceivedDate || undefined}
                    value={chequeMaturityDate}
                    onChange={(e) => setChequeMaturityDate(e.target.value)}
                  />
                </label>
                <label className="finance-collection-workflow__full-width">
                  {t('admin.finance.collectionWorkflow.chequePublicNotes')}
                  <textarea className="input" rows={2} value={chequePublicNotes} onChange={(e) => setChequePublicNotes(e.target.value)} />
                </label>
              </fieldset>
            ) : null}
          </section>

          {showAllocationStep ? (
            <ReceivableAllocationSection
              installments={openInstallments}
              loading={installmentsState.loading}
              currency={journalCurrency}
              collectionAmount={parsedAmount}
              allocationInputs={allocationInputs}
              onAllocationChange={setAllocationInputs}
              skipAllocation={skipAllocation}
              onSkipAllocationChange={setSkipAllocation}
            />
          ) : null}

          <section className="collection-form-section">
            <label>
              {t('common.note')}
              <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
          </section>
        </>
      ) : null}

      {selectedStudent ? (
        <div className="finance-collection-workflow__actions">
          <CollectionFormBlockers blockers={submitBlockers} />
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={submitting || !canProceedPayment}>
              {submitting ? t('admin.finance.collections.submitting') : t('admin.finance.recordCollection')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
