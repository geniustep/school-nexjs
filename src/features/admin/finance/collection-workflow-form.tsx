'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { useFormat } from '@/features/i18n/use-format';
import { financeStudentDisplayName, isPositiveAmount, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { getStudentDisplayName } from '@/lib/utils/student';
import { normalizeStudentDetailsResponse } from '@/features/admin/students/utils/normalize-student-details';
import { journalErrorMessageKey, parseFinanceList } from '@/lib/utils/finance-normalize';
import { collectionErrorMessageKey } from '@/lib/utils/collection-errors';
import { isChequePayment } from '@/lib/utils/cheque';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { InstallmentStatusBadges } from '@/features/admin/student-finance/components/installment-status-badges';
import { formatPeriodRange } from '@/features/admin/student-finance/utils/format-period';
import type { StudentInstallment } from '@/features/admin/student-finance/types';
import type {
  CreatePaymentCollectionPayload,
  EligibleBillingPartner,
  FinanceStudentSearchResult,
  PaymentCollection,
  PaymentJournal,
  StudentFee,
} from '@/types/finance';
import {
  autoAllocateOldest,
  buildAllocationPayload,
  canAllocateToInstallment,
  sumAllocationAmounts,
  validateAllocationTotals,
} from './collection-allocation-utils';

type WorkflowStep = 'payment' | 'allocation' | 'success';

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
        <div className="row" style={{ gap: 8 }}>
          <Link href="/admin/finance/collections" className="btn btn--ghost">
            {t('admin.finance.backToCollections')}
          </Link>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('common.cancel')}
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
  const { formatDate } = useFormat();
  const [step, setStep] = useState<WorkflowStep>('payment');
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudentSearchResult | null>(null);
  const [journalId, setJournalId] = useState('');
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ? String(initialAcademicYearId) : '');
  const [billingPartnerId, setBillingPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationFeeId, setAllocationFeeId] = useState('');
  const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({});
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
  const journalCurrency = selectedJournal?.currency ?? selectedJournal?.currency_code;
  const parsedAmount = Number(amount);

  const partnersState = useAdminResource<EligibleBillingPartner[]>(
    selectedStudent ? endpoints.admin.financeEligibleBillingPartners(selectedStudent.id) : null,
  );
  const partners = useMemo(
    () => parseFinanceList<EligibleBillingPartner>(partnersState.data),
    [partnersState.data],
  );

  const feesState = useAdminResource<StudentFee[]>(
    selectedStudent ? endpoints.admin.financeStudentFeesForStudent(selectedStudent.id) : null,
    { page: 1, page_size: 50 },
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

  const allowedMethods = useMemo(() => {
    const raw = selectedJournal?.allowed_payment_methods ?? [];
    return raw.map((m) => (typeof m === 'string' ? m : m));
  }, [selectedJournal]);

  useEffect(() => {
    const current = academicYears.find((y) => y.is_current);
    if (current && !academicYearId) setAcademicYearId(String(current.id));
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (partners.length === 1 && !billingPartnerId) setBillingPartnerId(String(partners[0].id));
  }, [partners, billingPartnerId]);

  useEffect(() => {
    if (!paymentMethod && allowedMethods.length) setPaymentMethod(String(allowedMethods[0]));
    else if (paymentMethod && allowedMethods.length && !allowedMethods.includes(paymentMethod)) {
      setPaymentMethod(String(allowedMethods[0]));
    }
  }, [allowedMethods, paymentMethod]);

  const isCheque = isChequePayment(paymentMethod);
  const allocatedTotal = sumAllocationAmounts(allocationInputs);
  const unallocatedTotal = Math.max(0, (parsedAmount || 0) - allocatedTotal);
  const selectedAllocationCount = Object.values(allocationInputs).filter((v) => Number(v) > 0).length;
  const showAllocationStep = useInstallmentAllocations && openInstallments.length > 0;

  const canProceedPayment = useMemo(() => {
    if (!selectedStudent || !journalId || !academicYearId || !billingPartnerId || !collectionDate.trim()) {
      return false;
    }
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) return false;
    if (!isPositiveAmount(parsedAmount)) return false;
    if (isCheque) {
      if (!chequeNumber.trim() || !chequeBank.trim() || !chequeHolder.trim()) return false;
      if (!chequeReceivedDate.trim() || !chequeMaturityDate.trim()) return false;
      if (chequeMaturityDate < chequeReceivedDate) return false;
    }
    return true;
  }, [
    selectedStudent,
    journalId,
    academicYearId,
    billingPartnerId,
    collectionDate,
    paymentMethod,
    allowedMethods,
    parsedAmount,
    isCheque,
    chequeNumber,
    chequeBank,
    chequeHolder,
    chequeReceivedDate,
    chequeMaturityDate,
  ]);

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

    if (showAllocationStep) {
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
    } else if (allocationFeeId) {
      payload.allocations = [{ student_fee_id: Number(allocationFeeId), amount: parsedAmount }];
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
    onDone(res.data);
  }

  function onPaymentContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!canProceedPayment) return;
    if (showAllocationStep) {
      setAllocationInputs(autoAllocateOldest(openInstallments, parsedAmount));
      setStep('allocation');
      return;
    }
    void submitCollection();
  }

  const wrapperClass = embedded ? 'form-stack finance-collection-workflow' : 'card form-stack finance-collection-workflow';

  if (step === 'success' && createdCollection) {
    return (
      <div className={wrapperClass}>
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
            <dd>{createdCollection.allocations?.length ?? selectedAllocationCount}</dd>
          </div>
        </dl>
        {isChequePayment(createdCollection.payment_method) ? (
          <p className="finance-cheque-pending-note">{t('admin.finance.collectionWorkflow.chequePendingNote')}</p>
        ) : null}
        <div className="row">
          <button type="button" className="btn btn--primary btn--sm" onClick={onCancel}>
            {t('common.close')}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'allocation') {
    return (
      <div className={wrapperClass}>
        <h3>{t('admin.finance.collectionWorkflow.allocationTitle')}</h3>
        <p className="muted">{t('admin.finance.collectionWorkflow.allocationDesc')}</p>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="finance-allocation-summary">
          <div>
            <span className="tiny muted">{t('admin.finance.collectionWorkflow.collectionAmount')}</span>
            <FinanceMoney amount={parsedAmount} currency={journalCurrency} />
          </div>
          <div>
            <span className="tiny muted">{t('admin.finance.collectionWorkflow.allocatedAmount')}</span>
            <FinanceMoney amount={allocatedTotal} currency={journalCurrency} />
          </div>
          <div>
            <span className="tiny muted">{t('admin.finance.collectionWorkflow.unallocatedAmount')}</span>
            <FinanceMoney amount={unallocatedTotal} currency={journalCurrency} />
          </div>
          <div>
            <span className="tiny muted">{t('admin.finance.collectionWorkflow.selectedCount')}</span>
            <strong>{selectedAllocationCount}</strong>
          </div>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setAllocationInputs(autoAllocateOldest(openInstallments, parsedAmount))}
          >
            {t('admin.finance.collectionWorkflow.autoAllocateOldest')}
          </button>
        </div>
        <div className="finance-allocation-list">
          {openInstallments.map((row) => {
            const disabled = !canAllocateToInstallment(row);
            return (
              <div key={row.id} className={`finance-allocation-row${disabled ? ' is-disabled' : ''}`}>
                <div className="finance-allocation-row__main">
                  <strong>{refName(row.service) ?? t('common.dash')}</strong>
                  <span className="tiny muted">
                    {formatPeriodRange(formatDate, row.period_start, row.period_end)} · {formatDate(row.due_date)}
                  </span>
                  <InstallmentStatusBadges
                    paymentStatus={row.payment_status ?? 'unpaid'}
                    timingStatus={row.timing_status ?? 'not_applicable'}
                    isVisible={row.is_visible}
                  />
                </div>
                <div className="finance-allocation-row__amounts">
                  <span>
                    {t('admin.student360.financeOps.columns.remaining')}:{' '}
                    <FinanceMoney amount={row.remaining_amount} currency={journalCurrency} />
                  </span>
                  <label>
                    {t('admin.finance.allocationAmount')}
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={disabled}
                      value={allocationInputs[row.id] ?? ''}
                      onChange={(e) =>
                        setAllocationInputs((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </label>
                </div>
                {disabled && row.allow_early_payment === false ? (
                  <p className="tiny muted">{t('admin.finance.collectionWorkflow.earlyPaymentBlocked')}</p>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="row">
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={submitting}
            onClick={() => void submitCollection()}
          >
            {submitting ? t('common.submitting') : t('admin.finance.recordCollection')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStep('payment')}>
            {t('common.back')}
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className={wrapperClass} onSubmit={onPaymentContinue}>
      <h3>{t('admin.finance.recordCollection')}</h3>
      <p className="muted">{t('admin.finance.collectionWorkflow.paymentStepDesc')}</p>
      {error ? <p className="form-error">{error}</p> : null}

      {!selectedStudent ? (
        <FinanceStudentSearch onSelect={setSelectedStudent} showProfileLink={false} />
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{financeStudentDisplayName(selectedStudent)}</strong>
          {!lockStudent && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedStudent(null)}>
              {t('admin.finance.changeStudent')}
            </button>
          )}
        </div>
      )}

      {selectedStudent ? (
        <>
          <label>
            {t('admin.finance.paymentJournal')}
            <select
              className="input"
              required
              value={journalId}
              onChange={(e) => setJournalId(e.target.value)}
              disabled={refLoading}
            >
              <option value="">{refLoading ? t('common.loading') : t('admin.finance.selectPaymentJournal')}</option>
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
              onChange={(e) => setAcademicYearId(e.target.value)}
              disabled={refLoading || academicYears.length === 0 || !!initialAcademicYearId}
            >
              <option value="">{refLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            {t('admin.finance.payer')}
            <select
              className="input"
              required
              value={billingPartnerId}
              onChange={(e) => setBillingPartnerId(e.target.value)}
              disabled={partnersState.loading}
            >
              <option value="">
                {partnersState.loading ? t('common.loading') : t('admin.finance.selectBillingPartner')}
              </option>
              {partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name ?? p.payer_name}
                </option>
              ))}
            </select>
          </label>

          {journalCurrency ? (
            <p className="muted">
              {t('admin.finance.displayCurrency')}: {journalCurrency}
            </p>
          ) : null}

          <label>
            {t('admin.finance.collectionAmount')}
            <input
              className="input"
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
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
              <option value="">{t('admin.finance.selectPaymentMethod')}</option>
              {allowedMethods.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel(m, t)}
                </option>
              ))}
            </select>
          </label>

          {isCheque ? (
            <fieldset className="finance-cheque-fields">
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
              <label>
                {t('admin.finance.collectionWorkflow.chequePublicNotes')}
                <textarea className="input" rows={2} value={chequePublicNotes} onChange={(e) => setChequePublicNotes(e.target.value)} />
              </label>
            </fieldset>
          ) : null}

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

          {!showAllocationStep && (feesState.data?.length ?? 0) > 0 ? (
            <label>
              {t('admin.finance.allocationReceivable')}
              <select className="input" value={allocationFeeId} onChange={(e) => setAllocationFeeId(e.target.value)}>
                <option value="">{t('admin.finance.noAllocation')}</option>
                {feesState.data?.map((fee) => (
                  <option key={fee.id} value={fee.id}>
                    {refName(fee.fee_plan) ?? refName(fee.fee_type) ?? t('admin.finance.studentFee')}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label>
            {t('common.note')}
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </>
      ) : null}

      {selectedStudent ? (
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary" disabled={submitting || !canProceedPayment}>
            {submitting
              ? t('common.submitting')
              : showAllocationStep
                ? t('admin.finance.collectionWorkflow.continueToAllocation')
                : t('admin.finance.recordCollection')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      ) : null}
    </form>
  );
}
