'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { CreatePaymentCollectionPayload, PaymentCollection } from '@/types/finance';

export function FinanceCollectionForm({
  onDone,
  onCancel,
}: {
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [studentId, setStudentId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [journalId, setJournalId] = useState('');
  const [billingPartnerId, setBillingPartnerId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [collectionDate, setCollectionDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [studentFeeId, setStudentFeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError(t('admin.finance.invalidAmount'));
      return;
    }
    const sid = Number(studentId);
    const year = Number(academicYearId);
    const journal = Number(journalId);
    const partner = Number(billingPartnerId);
    if (!sid || !year || !journal || !partner || !collectionDate.trim()) {
      setError(t('admin.finance.collectionFormIncomplete'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreatePaymentCollectionPayload = {
      student_id: sid,
      academic_year_id: year,
      journal_id: journal,
      billing_partner_id: partner,
      amount: parsedAmount,
      payment_method: paymentMethod,
      collection_date: collectionDate,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (studentFeeId.trim()) {
      payload.allocations = [{ student_fee_id: Number(studentFeeId), amount: parsedAmount }];
    }
    const res = await api.post<PaymentCollection>(endpoints.admin.financePaymentCollections, payload);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone(res.data.id);
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.recordCollection')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.studentId')}
        <input className="input" required type="number" min="1" value={studentId} onChange={(e) => setStudentId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.academicYearId')}
        <input className="input" required type="number" min="1" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.journalId')}
        <input className="input" required type="number" min="1" value={journalId} onChange={(e) => setJournalId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.billingPartnerId')}
        <input className="input" required type="number" min="1" value={billingPartnerId} onChange={(e) => setBillingPartnerId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.collectionAmount')}
        <input className="input" required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.paymentMethod')}
        <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
          <option value="cash">{t('admin.finance.methodCash')}</option>
          <option value="check">{t('admin.finance.methodCheck')}</option>
          <option value="transfer">{t('admin.finance.methodTransfer')}</option>
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
      <label>
        {t('admin.finance.allocationFeeId')}
        <input className="input" type="number" min="1" value={studentFeeId} onChange={(e) => setStudentFeeId(e.target.value)} />
      </label>
      <label>
        {t('common.note')}
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.submitting') : t('admin.finance.recordCollection')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
