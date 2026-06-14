'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/states/states';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import {
  useAcademicYearOptions,
  useConfirmedFeePlanOptions,
} from '@/features/admin/finance/use-finance-lookups';
import {
  feePlanAssignErrorMessageKey,
  shouldReloadPlanLinesOnAssignError,
  shouldReloadPlansOnAssignError,
} from '@/features/admin/finance/fee-plan-assign-errors';
import {
  buildAssignFeePlanPayload,
  buildInstallmentPreview,
  canSubmitFeePlanAssignment,
  countInstallments,
  filterFeePlansForAcademicYear,
  isEffectiveDateOutsidePlan,
  partitionFeePlanLines,
  planHasNoAssignableLines,
  planLinesContractInvalid,
  resolveDefaultEffectiveDate,
  sumLineSubtotals,
} from '@/features/admin/finance/fee-plan-assign-utils';
import type { AssignStudentFeePlanResponse, FeePlanLine } from '@/types/finance';

export function FinanceAssignFeeForm({
  studentId,
  classId,
  levelId,
  initialAcademicYearId,
  enrollmentJoinDate,
  enrollmentStartDate,
  copyScope = 'finance',
  onDone,
  onCancel,
}: {
  studentId: number;
  classId?: number | null;
  levelId?: number | null;
  initialAcademicYearId?: string;
  enrollmentJoinDate?: string | null;
  enrollmentStartDate?: string | null;
  copyScope?: 'finance' | 'student360';
  onDone: (result?: AssignStudentFeePlanResponse) => void;
  onCancel: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [feePlanId, setFeePlanId] = useState('');
  const [academicYearId, setAcademicYearId] = useState(initialAcademicYearId ?? '');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { options: yearOptions, loading: yearsLoading } = useAcademicYearOptions(classId);
  const {
    plans,
    loading: plansLoading,
    error: plansError,
    reload: reloadPlans,
  } = useConfirmedFeePlanOptions(academicYearId || null, levelId ?? null);

  const filteredPlans = useMemo(() => {
    if (!academicYearId) return [];
    return filterFeePlansForAcademicYear(plans, Number(academicYearId));
  }, [plans, academicYearId]);

  const selectedPlan = filteredPlans.find((p) => p.id === Number(feePlanId));
  const planLines = selectedPlan?.lines ?? [];
  const { required: requiredLines, optional: optionalLines } = useMemo(
    () => partitionFeePlanLines(planLines),
    [planLines],
  );
  const selectedOptionalLines = useMemo(
    () => optionalLines.filter((line) => selectedOptionalIds.includes(line.id)),
    [optionalLines, selectedOptionalIds],
  );
  const previewLines = useMemo(
    () => [...requiredLines, ...selectedOptionalLines],
    [requiredLines, selectedOptionalLines],
  );
  const installmentPreview = useMemo(() => buildInstallmentPreview(previewLines), [previewLines]);
  const hasInstallmentSchedule = installmentPreview.length > 0;
  const installmentCount = countInstallments(previewLines);
  const requiredSubtotal = sumLineSubtotals(requiredLines);
  const optionalSubtotal = sumLineSubtotals(selectedOptionalLines);
  const expectedTotal = requiredSubtotal + optionalSubtotal;
  const planHasLines = planLines.length > 0;
  const noAssignableLines = selectedPlan ? planHasNoAssignableLines(selectedPlan) : false;
  const linesContractError = selectedPlan ? planLinesContractInvalid(selectedPlan) : false;
  const effectiveDateOutsidePlan = isEffectiveDateOutsidePlan(effectiveDate, selectedPlan);

  useEffect(() => {
    if (initialAcademicYearId) {
      setAcademicYearId(initialAcademicYearId);
    }
  }, [initialAcademicYearId]);

  useEffect(() => {
    setFeePlanId('');
    setSelectedOptionalIds([]);
    setError(null);
  }, [academicYearId]);

  useEffect(() => {
    setSelectedOptionalIds([]);
    setError(null);
    if (selectedPlan) {
      setEffectiveDate(
        resolveDefaultEffectiveDate({
          actualJoinDate: enrollmentJoinDate,
          enrollmentStartDate,
        }),
      );
    } else {
      setEffectiveDate('');
    }
  }, [feePlanId, selectedPlan, enrollmentJoinDate, enrollmentStartDate]);

  const label = (key: string, params?: Record<string, string | number>) =>
    copyScope === 'student360'
      ? t(`admin.student360.finance.assignDrawer.${key}`, params)
      : t(`admin.finance.assignDrawer.${key}`, params);

  const canSubmit = canSubmitFeePlanAssignment({
    academicYearId,
    feePlanId,
    effectiveDate,
    plansLoading,
    plansError: plansError != null,
    submitting,
    planHasAssignableLines: Boolean(selectedPlan && !noAssignableLines && !linesContractError),
    planLinesContractError: linesContractError,
  });

  function toggleOptionalLine(lineId: number, checked: boolean) {
    setSelectedOptionalIds((prev) =>
      checked ? (prev.includes(lineId) ? prev : [...prev, lineId]) : prev.filter((id) => id !== lineId),
    );
  }

  function resolveAssignErrorMessage(code: string | undefined, fallback: string): string {
    const key = feePlanAssignErrorMessageKey(code);
    return key ? t(key) : fallback;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selectedPlan) return;
    const planId = Number(feePlanId);
    if (!planId) {
      setError(t('admin.finance.feePlanRequired'));
      return;
    }
    setSubmitting(true);
    setError(null);
    const payload = buildAssignFeePlanPayload(planId, effectiveDate, selectedOptionalIds);
    const res = await api.post<AssignStudentFeePlanResponse>(
      endpoints.admin.financeAssignStudentFee(studentId),
      payload,
    );
    setSubmitting(false);
    if (!res.success) {
      const code = res.error.code;
      setError(resolveAssignErrorMessage(code, res.error.message));
      if (shouldReloadPlansOnAssignError(code)) reloadPlans();
      if (shouldReloadPlanLinesOnAssignError(code)) reloadPlans();
      return;
    }
    onDone(res.data ?? undefined);
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
          {showPlansLoading ? <LoadingState label={label('loadingPlans')} /> : null}

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
        <>
          {linesContractError ? (
            <p className="form-error" role="alert">
              {label('linesContractError')}
            </p>
          ) : null}

          {noAssignableLines && !linesContractError ? (
            <p className="form-error" role="alert">
              {label('noPlanLines')}
            </p>
          ) : null}

          {!noAssignableLines && !linesContractError ? (
            <>
              <label>
                {label('effectiveDate')}
                <input
                  className="input"
                  type="date"
                  required
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                />
              </label>
              {effectiveDateOutsidePlan ? (
                <p className="student-finance-assign-form__warn tiny" role="status">
                  {label('effectiveDateOutsidePlan')}
                </p>
              ) : null}

              {requiredLines.length > 0 ? (
                <section className="student-finance-assign-form__lines">
                  <h4 className="student-360-section__subtitle">{label('requiredFees')}</h4>
                  <ul className="student-finance-assign-form__line-list">
                    {requiredLines.map((line) => (
                      <FeePlanLineCard
                        key={line.id}
                        line={line}
                        required
                        formatDate={formatDate}
                        t={t}
                      />
                    ))}
                  </ul>
                </section>
              ) : null}

              {optionalLines.length > 0 ? (
                <section className="student-finance-assign-form__lines">
                  <h4 className="student-360-section__subtitle">{label('optionalServices')}</h4>
                  <p className="tiny muted">{label('optionalHint')}</p>
                  <ul className="student-finance-assign-form__line-list">
                    {optionalLines.map((line) => (
                      <li key={line.id} className="student-finance-assign-form__line card">
                        <label className="student-finance-assign-form__optional-row">
                          <input
                            type="checkbox"
                            checked={selectedOptionalIds.includes(line.id)}
                            onChange={(e) => toggleOptionalLine(line.id, e.target.checked)}
                          />
                          <FeePlanLineDetails line={line} formatDate={formatDate} t={t} />
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section className="student-finance-assign-form__installments card">
                <h4 className="student-360-section__subtitle">{label('installmentPreview')}</h4>
                {hasInstallmentSchedule ? (
                  <div className="student-360-table-wrap">
                    <table className="data-table student-finance-assign-form__installment-table">
                      <thead>
                        <tr>
                          <th>{label('installmentNumber')}</th>
                          <th>{label('installmentDueDate')}</th>
                          <th>{label('installmentAmount')}</th>
                          <th>{label('installmentLine')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {installmentPreview.map((row, index) => (
                          <tr key={`${row.lineName}-${row.sequence}-${row.due_date}-${index}`}>
                            <td>{row.sequence}</td>
                            <td>{formatDate(row.due_date) || row.due_date}</td>
                            <td>
                              <FinanceMoney amount={row.amount} currency={selectedPlan.currency} />
                            </td>
                            <td>{row.lineName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="tiny muted">
                    {label('installmentCountOnly', { count: installmentCount })}
                  </p>
                )}
              </section>

              <div className="student-finance-assign-form__summary card">
                <h4 className="student-360-section__subtitle">{label('assignmentSummary')}</h4>
                <dl className="detail-list">
                  <div>
                    <dt>{label('requiredSubtotal')}</dt>
                    <dd>
                      <FinanceMoney amount={requiredSubtotal} currency={selectedPlan.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{label('optionalSubtotal')}</dt>
                    <dd>
                      <FinanceMoney amount={optionalSubtotal} currency={selectedPlan.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{label('expectedTotal')}</dt>
                    <dd>
                      <FinanceMoney amount={expectedTotal} currency={selectedPlan.currency} />
                    </dd>
                  </div>
                  <div>
                    <dt>{label('feeCount')}</dt>
                    <dd>{previewLines.length}</dd>
                  </div>
                  <div>
                    <dt>{label('installmentTotal')}</dt>
                    <dd>{installmentCount}</dd>
                  </div>
                </dl>
                <p className="tiny muted">{label('previewDisclaimer')}</p>
              </div>
            </>
          ) : null}
        </>
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

function FeePlanLineCard({
  line,
  required,
  formatDate,
  t,
}: {
  line: FeePlanLine;
  required?: boolean;
  formatDate: (value?: string | null) => string;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  return (
    <li className="student-finance-assign-form__line card">
      {required ? (
        <span className="student-finance-assign-form__required-badge tiny">
          {t('admin.finance.assignDrawer.requiredBadge')}
        </span>
      ) : null}
      <FeePlanLineDetails line={line} formatDate={formatDate} t={t} />
    </li>
  );
}

function FeePlanLineDetails({
  line,
  formatDate,
  t,
}: {
  line: FeePlanLine;
  formatDate: (value?: string | null) => string;
  t: (key: string, values?: Record<string, string>) => string;
}) {
  const lineName = line.name || line.fee_type?.name || line.fee_type_name || `#${line.id}`;
  const feeTypeName = line.fee_type?.name || line.fee_type_name || t('common.dash');
  const category = line.fee_type?.category;
  const installmentCount = line.installment_count ?? line.installment_schedule?.length ?? 1;

  return (
    <div className="student-finance-assign-form__line-body">
      <div className="student-finance-assign-form__line-head">
        <strong>{lineName}</strong>
        <FinanceMoney amount={line.subtotal ?? line.amount} />
      </div>
      <dl className="detail-list student-finance-assign-form__line-meta">
        <div>
          <dt>{t('admin.finance.planOrFeeType')}</dt>
          <dd>{feeTypeName}</dd>
        </div>
        {category ? (
          <div>
            <dt>{t('admin.finance.assignDrawer.category')}</dt>
            <dd>{category}</dd>
          </div>
        ) : null}
        <div>
          <dt>{t('admin.finance.assignDrawer.installmentCount')}</dt>
          <dd>{installmentCount}</dd>
        </div>
      </dl>
      {line.installment_schedule?.length ? (
        <ul className="student-finance-assign-form__schedule tiny">
          {line.installment_schedule.map((inst) => (
            <li key={`${line.id}-${inst.sequence}-${inst.due_date}`}>
              #{inst.sequence} — {formatDate(inst.due_date) || inst.due_date} —{' '}
              <FinanceMoney amount={inst.amount} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
