'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import { isPositiveAmount } from '@/lib/utils/finance';
import {
  FINANCE_JOURNAL_LOOKUP_AVAILABLE,
  useAcademicYearOptions,
} from '@/features/admin/finance/use-finance-lookups';
import type { CreatePaymentCollectionPayload, PaymentCollection, StudentFee, StudentFinanceProfile } from '@/types/finance';
import type { Student } from '@/types/student';
import type { ListParams } from '@/types/api';
import { refName } from '@/lib/utils/finance';

export function FinanceCollectionForm({
  onDone,
  onCancel,
}: {
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();

  if (!FINANCE_JOURNAL_LOOKUP_AVAILABLE) {
    return (
      <div className="card form-stack">
        <h3>{t('admin.finance.recordCollection')}</h3>
        <p>{t('admin.finance.collectionNotReadyDesc')}</p>
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

  return <FinanceCollectionFormReady onDone={onDone} onCancel={onCancel} />;
}

function FinanceCollectionFormReady({
  onDone,
  onCancel,
}: {
  onDone: (collectionId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [studentSearch, setStudentSearch] = useState('');
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [academicYearId, setAcademicYearId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [collectionDate, setCollectionDate] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [allocationFeeId, setAllocationFeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const studentParams: ListParams = { page: 1, page_size: 10, search: studentQuery || undefined };
  const studentsState = useAdminResource<Student[]>(
    selectedStudent ? null : endpoints.admin.students,
    studentParams,
  );
  const classId = selectedStudent?.class?.id ?? null;
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(classId);
  const billingState = useAdminResource<StudentFinanceProfile>(
    selectedStudent ? endpoints.admin.financeBillingProfile(selectedStudent.id) : null,
  );
  const feesState = useAdminResource<StudentFee[]>(
    selectedStudent ? endpoints.admin.financeStudentFeesForStudent(selectedStudent.id) : null,
    { page: 1, page_size: 50 },
  );

  const billingPartnerId = billingState.data?.billing_partner_id;
  const billingMissing = billingState.error?.code === 'not_found';
  const canSubmit = useMemo(() => {
    if (!selectedStudent || !billingPartnerId || !academicYearId || !collectionDate.trim()) return false;
    return isPositiveAmount(Number(amount));
  }, [selectedStudent, billingPartnerId, academicYearId, collectionDate, amount]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !canSubmit || !selectedStudent || !billingPartnerId) return;
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
      journal_id: 0,
      billing_partner_id: billingPartnerId,
      amount: parsedAmount,
      payment_method: paymentMethod,
      collection_date: collectionDate,
      reference: reference.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (allocationFeeId) {
      payload.allocations = [{ student_fee_id: Number(allocationFeeId), amount: parsedAmount }];
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

      {!selectedStudent ? (
        <>
          <div
            className="toolbar"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                setStudentQuery(studentSearch.trim());
              }
            }}
          >
            <input
              className="input"
              placeholder={t('admin.finance.searchStudent')}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setStudentQuery(studentSearch.trim())}>
              {t('admin.search')}
            </button>
          </div>
          {(studentsState.data ?? []).map((s) => (
            <button key={s.id} type="button" className="btn btn--ghost" onClick={() => setSelectedStudent(s)}>
              {getStudentDisplayName(s)}
              {s.class?.name ? ` · ${s.class.name}` : ''}
            </button>
          ))}
        </>
      ) : (
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <strong>{getStudentDisplayName(selectedStudent)}</strong>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelectedStudent(null)}>
            {t('admin.finance.changeStudent')}
          </button>
        </div>
      )}

      {selectedStudent && (
        <>
          {billingMissing && (
            <p className="form-error">{t('admin.finance.noBillingProfileDesc')}</p>
          )}
          {!billingMissing && billingState.data?.payer_name && (
            <p className="muted">
              {t('admin.finance.payer')}: {billingState.data.payer_name}
            </p>
          )}

          <label>
            {t('admin.finance.academicYear')}
            <select
              className="input"
              required
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              disabled={yearsLoading || yearOptions.length === 0}
            >
              <option value="">{yearsLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}</option>
              {yearOptions.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </label>

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
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="cash">{t('admin.finance.methodCash')}</option>
              <option value="check">{t('admin.finance.methodCheck')}</option>
              <option value="transfer">{t('admin.finance.methodTransfer')}</option>
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

      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting || !canSubmit}>
          {submitting ? t('common.submitting') : t('admin.finance.recordCollection')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
