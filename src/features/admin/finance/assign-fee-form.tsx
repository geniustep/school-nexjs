'use client';

import { useState } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import {
  useAcademicYearOptions,
  useConfirmedFeePlanOptions,
} from '@/features/admin/finance/use-finance-lookups';
import { academicYearFromSource } from '@/lib/utils/academic-years';
import type { AssignStudentFeePayload, StudentFee } from '@/types/finance';

export function FinanceAssignFeeForm({
  studentId,
  classId,
  onDone,
  onCancel,
}: {
  studentId: number;
  classId?: number | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [feePlanId, setFeePlanId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { plans, loading: plansLoading } = useConfirmedFeePlanOptions();
  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(classId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const planId = Number(feePlanId);
    if (!planId) {
      setError(t('admin.finance.feePlanRequired'));
      return;
    }
    const selectedPlan = plans.find((p) => p.id === planId);
    const yearId = academicYearId
      ? Number(academicYearId)
      : academicYearFromSource(selectedPlan)?.id;
    if (!yearId) {
      setError(t('admin.finance.academicYearRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload: AssignStudentFeePayload = {
      fee_plan_id: planId,
      academic_year_id: yearId,
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
        {t('admin.finance.feePlansTitle')}
        <select
          className="input"
          required
          value={feePlanId}
          onChange={(e) => {
            setFeePlanId(e.target.value);
            const plan = plans.find((p) => p.id === Number(e.target.value));
            const year = academicYearFromSource(plan);
            if (year) setAcademicYearId(String(year.id));
          }}
          disabled={plansLoading}
        >
          <option value="">{plansLoading ? t('common.loading') : t('admin.finance.selectFeePlan')}</option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </label>
      {plans.length === 0 && !plansLoading && (
        <p className="muted">{t('admin.finance.noConfirmedPlans')}</p>
      )}
      <label>
        {t('admin.finance.academicYear')}
        <select
          className="input"
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          disabled={yearsLoading || yearOptions.length === 0}
        >
          <option value="">{t('admin.finance.selectAcademicYear')}</option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </label>
      <div className="row" style={{ gap: 8 }}>
        <button type="submit" className="btn btn--primary" disabled={submitting || !feePlanId}>
          {submitting ? t('common.submitting') : t('common.submit')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
