'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import type { AssignStudentFeePayload, StudentFee } from '@/types/finance';

export function FinanceAssignFeeForm({
  studentId,
  onDone,
  onCancel,
}: {
  studentId: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [feePlanId, setFeePlanId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const planId = Number(feePlanId);
    if (!planId) {
      setError(t('admin.finance.feePlanRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: AssignStudentFeePayload = {
      fee_plan_id: planId,
      academic_year_id: academicYearId.trim() ? Number(academicYearId) : undefined,
    };
    const res = await api.post<StudentFee>(
      endpoints.admin.financeAssignStudentFee(studentId),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      setError(res.error.message);
      return;
    }
    onDone();
  }

  return (
    <form className="card form-stack" onSubmit={onSubmit}>
      <h3>{t('admin.finance.assignFeePlan')}</h3>
      {error && <p className="form-error">{error}</p>}
      <label>
        {t('admin.finance.feePlanId')}
        <input className="input" required type="number" min="1" value={feePlanId} onChange={(e) => setFeePlanId(e.target.value)} />
      </label>
      <label>
        {t('admin.finance.academicYearId')}
        <input className="input" type="number" min="1" value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)} />
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting}>
          {submitting ? t('common.submitting') : t('common.submit')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
