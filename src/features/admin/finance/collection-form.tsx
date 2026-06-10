'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { financeStudentDisplayName, isPositiveAmount, paymentMethodLabel, refName } from '@/lib/utils/finance';
import { journalErrorMessageKey, parseFinanceList } from '@/lib/utils/finance-normalize';
import { isChequePayment } from '@/lib/utils/cheque';
import { FinanceStudentSearch } from '@/features/admin/finance/finance-student-search';
import { useFinanceReferenceData } from '@/features/admin/finance/use-finance-lookups';
import type {
  CreatePaymentCollectionPayload,
  EligibleBillingPartner,
  FinanceStudentSearchResult,
  PaymentCollection,
  PaymentJournal,
  StudentFee,
} from '@/types/finance';

export function FinanceCollectionForm({
  onDone,
  onCancel,
}: {
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { journals, academicYears, loading: refLoading } = useFinanceReferenceData();

  if (!refLoading && journals.length === 0) {
    return (
      <div className="card form-stack">
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
    <FinanceCollectionFormReady
      journals={journals}
      academicYears={academicYears}
      refLoading={refLoading}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

function FinanceCollectionFormReady({
  journals,
  academicYears,
  refLoading,
  onDone,
  onCancel,
}: {
  journals: PaymentJournal[];
  academicYears: { id: number; name: string; is_current?: boolean }[];
  refLoading: boolean;
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [selectedStudent, setSelectedStudent] = useState<FinanceStudentSearchResult | null>(null);
  const [journalId, setJournalId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [billingPartnerId, setBillingPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [collectionDate, setCollectionDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationFeeId, setAllocationFeeId] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeBank, setChequeBank] = useState('');
  const [chequeHolder, setChequeHolder] = useState('');
  const [chequeReceivedDate, setChequeReceivedDate] = useState('');
  const [chequeDueDate, setChequeDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedJournal = journals.find((j) => String(j.id) === journalId) ?? null;
  const journalCurrency = selectedJournal?.currency ?? selectedJournal?.currency_code;

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

  const canSubmit = useMemo(() => {
    if (!selectedStudent || !journalId || !academicYearId || !billingPartnerId || !collectionDate.trim()) {
      return false;
    }
    if (!paymentMethod || !allowedMethods.includes(paymentMethod)) return false;
    if (!isPositiveAmount(Number(amount))) return false;
    if (isCheque) {
      if (!chequeNumber.trim() || !chequeBank.trim() || !chequeHolder.trim()) return false;
      if (!chequeReceivedDate.trim() || !chequeDueDate.trim()) return false;
      if (chequeDueDate < chequeReceivedDate) return false;
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
    amount,
    isCheque,
    chequeNumber,
    chequeBank,
    chequeHolder,
    chequeReceivedDate,
    chequeDueDate,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !canSubmit || !selectedStudent) return;
    const parsedAmount = Number(amount);
    if (!isPositiveAmount(parsedAmount)) {
      setError(t('admin.finance.invalidAmount'));
      return;
    }
    setSubmitting(true);
    setError(null);
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
    if (allocationFeeId) {
      payload.allocations = [{ student_fee_id: Number(allocationFeeId), amount: parsedAmount }];
    }
    if (isCheque) {
      payload.payment_method = 'cheque';
      payload.cheque = {
        cheque_number: chequeNumber.trim(),
        bank_name: chequeBank.trim(),
        holder_name: chequeHolder.trim(),
        received_date: chequeReceivedDate,
        due_date: chequeDueDate,
      };
    }
    const res = await api.post<PaymentCollection>(endpoints.admin.financePaymentCollections, payload);
    setSubmitting(false);
    if (!res.success) {
      const key = journalErrorMessageKey(res.error.code);
      setError(key ? t(key) : res.error.message);
      return;
    }
    onDone(res.data.id);
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.recordCollection')}</h3>
      {error && <p className="form-error">{error}</p>}

      {!selectedStudent ? (
        <FinanceStudentSearch onSelect={setSelectedStudent} showProfileLink={false} />
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{financeStudentDisplayName(selectedStudent)}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedStudent(null)}>
            {t('admin.finance.changeStudent')}
          </button>
        </div>
      )}

      {selectedStudent && (
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
                  {j.type || j.journal_type ? ` · ${j.type ?? j.journal_type}` : ''}
                  {j.currency ?? j.currency_code ? ` · ${j.currency ?? j.currency_code}` : ''}
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
              disabled={refLoading || academicYears.length === 0}
            >
              <option value="">{refLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                  {y.is_current ? ` (${t('admin.finance.currentYear')})` : ''}
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
                  {p.type || p.billing_partner_type ? ` · ${p.type ?? p.billing_partner_type}` : ''}
                </option>
              ))}
            </select>
          </label>

          {journalCurrency && (
            <p className="muted">
              {t('admin.finance.displayCurrency')}: {journalCurrency}
            </p>
          )}

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

          {isCheque && (
            <fieldset className="finance-cheque-fields">
              <legend>{t('admin.finance.cheques.registrationTitle')}</legend>
              <label>
                {t('admin.finance.cheques.chequeNumber')}
                <input className="input" required value={chequeNumber} onChange={(e) => setChequeNumber(e.target.value)} />
              </label>
              <label>
                {t('admin.finance.cheques.bankName')}
                <input className="input" required value={chequeBank} onChange={(e) => setChequeBank(e.target.value)} />
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
                {t('admin.finance.cheques.dueDate')}
                <input
                  className="input"
                  type="date"
                  required
                  min={chequeReceivedDate || undefined}
                  value={chequeDueDate}
                  onChange={(e) => setChequeDueDate(e.target.value)}
                />
              </label>
            </fieldset>
          )}

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

          {(feesState.data?.length ?? 0) > 0 && (
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
          )}

          <label>
            {t('common.note')}
            <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </>
      )}

      {selectedStudent && (
        <div className="row" style={{ gap: 8 }}>
          <button type="submit" className="btn btn--primary" disabled={submitting || !canSubmit}>
            {submitting ? t('common.submitting') : t('admin.finance.recordCollection')}
          </button>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>
            {t('common.cancel')}
          </button>
        </div>
      )}
    </form>
  );
}
