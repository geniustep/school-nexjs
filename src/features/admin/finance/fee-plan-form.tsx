'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminSession } from '@/features/auth/admin-session-context';
import { useT } from '@/features/i18n/locale-context';
import type { CreateFeePlanPayload, FeePlan } from '@/types/finance';

export function FinanceFeePlanForm({
  onDone,
  onCancel,
}: {
  onDone: (planId: number) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { activeSchoolId } = useAdminSession();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [feeTypeId, setFeeTypeId] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || activeSchoolId == null) return;
    const year = Number(academicYearId);
    const lineAmount = Number(amount);
    const typeId = Number(feeTypeId);
    if (!year || !typeId || !lineAmount || lineAmount <= 0) {
      setError(t('admin.finance.feePlanFormIncomplete'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: CreateFeePlanPayload = {
      school_id: activeSchoolId,
      name: name.trim(),
      code: code.trim(),
      academic_year_id: year,
      lines: [{ fee_type_id: typeId, amount: lineAmount, installment_count: 1 }],
    };
    const res = await api.post<FeePlan>(endpoints.admin.financeFeePlans, payload);
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone(res.data.id);
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.addFeePlan')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.planName')}
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.feeTypeCode')}
        <input className="input" required value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.academicYearId')}
        <input className="input" required type="number" min="1" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.lineFeeTypeId')}
        <input className="input" required type="number" min="1" value={feeTypeId} onChange={(e) => setFeeTypeId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.lineAmount')}
        <input className="input" required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.saving') : t('common.save')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
