'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/states/states';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useT } from '@/features/i18n/locale-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  useAcademicYearOptions,
  useConfirmedFeePlanOptions,
} from '@/features/admin/finance/use-finance-lookups';
import {
  canSubmitFeePlanAssignment,
  filterFeePlansForAcademicYear,
} from '@/features/admin/finance/fee-plan-assign-utils';
import type { AssignStudentFeePayload, StudentFee } from '@/types/finance';

export function FinanceAssignFeeForm({
  studentId,
  classId,
  initialAcademicYearId,
  copyScope = 'finance',
  onDone,
  onCancel,
}: {
  studentId: number;
  classId?: number | null;
  initialAcademicYearId?: string;
  copyScope?: 'finance' | 'student360';
  onDone: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const [feePlanId, setFeePlanId] = useState('');
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(classId);
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    reload: reloadPlans,
  } = useConfirmedFeePlanOptions(academicYearId || null);

  const filteredPlans = useMemo(() => {
    if (!academicYearId) return [];
    return filterFeePlansForAcademicYear(plans, Number(academicYearId));
  }, [plans, academicYearId]);

  const selectedPlan = filteredPlans.find((p) => p.id === Number(feePlanId));

  useEffect(() => {
    if (initialAcademicYearId) {
      setAcademicYearId(initialAcademicYearId);
    }
  }, [initialAcademicYearId]);

  useEffect(() => {
    setFeePlanId('');
    setError(null);
  }, [academicYearId]);

  const label = (key: string) =>
    copyScope === 'student360'
      ? t(`admin.student360.finance.assignDrawer.${key}`)
      : t(`admin.finance.assignDrawer.${key}`);

  const canSubmit = canSubmitFeePlanAssignment({
    academicYearId,
    feePlanId,
    plansLoading,
    plansError: plansError != null,
    submitting,
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const planId = Number(feePlanId);
    const yearId = Number(academicYearId);
    if (!planId || !yearId) {
      setError(t('admin.finance.feePlanRequired'));
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

  const showPlanField = Boolean(academicYearId);
  const showPlansLoading = showPlanField && plansLoading;
  const showPlansError = showPlanField && plansError && !plansLoading;
  const showPlansEmpty =
    showPlanField && !plansLoading && !plansError && filteredPlans.length === 0;

  return (
    <form className="form-stack student-finance-assign-form" onSubmit={onSubmit}>
      {error ? <p className="form-error">{error}</p> : null}

      <label>
        {t('admin.finance.academicYear')}
        <select
          className="input"
          required
          value={academicYearId}
          onChange={(e) => setAcademicYearId(e.target.value)}
          disabled={yearsLoading || yearOptions.length === 0}
        >
          <option value="">
            {yearsLoading ? t('common.loading') : t('admin.finance.selectAcademicYear')}
          </option>
          {yearOptions.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </select>
      </label>

      {showPlanField ? (
        <div className="student-finance-assign-form__plans">
          {showPlansLoading ? (
            <LoadingState label={label('loadingPlans')} />
          ) : null}

          {showPlansError ? (
            <div className="student-finance-assign-form__state" role="alert">
              <p>{label('loadError')}</p>
              <button type="button" className="btn btn--ghost btn--sm" onClick={reloadPlans}>
                {label('retry')}
              </button>
            </div>
          ) : null}

          {showPlansEmpty ? (
            <div className="student-finance-assign-form__state">
              <p className="muted">{label('emptyPlans')}</p>
              <Link href="/admin/finance/fee-plans" className="btn btn--ghost btn--sm">
                {label('managePlans')}
              </Link>
            </div>
          ) : null}

          {!showPlansLoading && !showPlansError && filteredPlans.length > 0 ? (
            <label>
              {t('admin.finance.feePlansTitle')}
              <select
                className="input"
                required
                value={feePlanId}
                onChange={(e) => setFeePlanId(e.target.value)}
              >
                <option value="">{t('admin.finance.selectFeePlan')}</option>
                {filteredPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      ) : (
        <p className="tiny muted">{label('selectYearFirst')}</p>
      )}

      {selectedPlan ? (
        <div className="student-finance-assign-form__summary card">
          <h4 className="student-360-section__subtitle">{label('planSummary')}</h4>
          <dl className="detail-list">
            <div>
              <dt>{t('admin.finance.planOrFeeType')}</dt>
              <dd>
                {selectedPlan.name} ({selectedPlan.code})
              </dd>
            </div>
            {selectedPlan.total_amount != null ? (
              <div>
                <dt>{t('admin.finance.summary')}</dt>
                <dd>
                  <FinanceMoney amount={selectedPlan.total_amount} currency={selectedPlan.currency} />
                </dd>
              </div>
            ) : null}
            {selectedPlan.lines?.length ? (
              <div>
                <dt>{t('admin.finance.planLines')}</dt>
                <dd>{selectedPlan.lines.length}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}

      <div className="student-finance-assign-form__actions row">
        <button type="submit" className="btn btn--primary" disabled={!canSubmit}>
          {submitting ? t('common.submitting') : label('submit')}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel} disabled={submitting}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
