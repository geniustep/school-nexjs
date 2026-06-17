'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { assignFeePlanToStudents, type FeePlanAssignStudentResult } from '@/features/admin/finance/fee-plan-assign-executor';
import { resolveAssignErrorMessage } from '@/features/admin/finance/fee-plan-assign-errors';
import {
  FeePlanAssignStudentsStep,
  type SelectedAssignStudent,
} from '@/features/admin/finance/fee-plan-assign-students-step';
import {
  FeePlanAssignSourceCard,
  FeePlanAssignStepper,
  feePlanLevelLabel,
  useFeePlanScopeLabels,
} from '@/features/admin/finance/fee-plan-assign-ui';
import {
  validateFeePlanForAssignment,
  type FeePlanAssignBlockReason,
} from '@/features/admin/finance/fee-plan-assign-validation';
import {
  buildInstallmentPreview,
  computeLineExpectedTotal,
  countInstallments,
  partitionFeePlanLines,
  resolveDefaultEffectiveDate,
  sumLineSubtotals,
} from '@/features/admin/finance/fee-plan-assign-utils';
import { buildFeePlanScopeGroups } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import {
  billingPartyTypeLabelKey,
  countAssignedInstallments,
  pricingModeLabelKey,
  resolveLinePricing,
  sumAssignedFeeTotals,
} from '@/features/admin/finance/fee-plans/fee-plan-pricing';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan } from '@/types/finance';
import './fee-plan-assign-flow.css';

type AssignStep = 'students' | 'preview' | 'result';

const BLOCK_MESSAGE_KEYS: Record<FeePlanAssignBlockReason, string> = {
  not_confirmed: 'admin.finance.assignFlow.blockNotConfirmed',
  archived: 'admin.finance.assignFlow.blockArchived',
  no_lines: 'admin.finance.assignFlow.blockNoLines',
  frequency_installment_conflict: 'admin.finance.assignFlow.blockFrequencyConflict',
};

export function FeePlanAssignFlow({ plan }: { plan: FeePlan }) {
  const t = useT();
  const { formatDate } = useFormat();
  const [step, setStep] = useState<AssignStep>('students');
  const [selectedStudents, setSelectedStudents] = useState<SelectedAssignStudent[]>([]);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<number[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(() => resolveDefaultEffectiveDate({}));
  const [submitting, setSubmitting] = useState(false);
  const [assignResults, setAssignResults] = useState<FeePlanAssignStudentResult[] | null>(null);

  const { options: yearOptions } = useAcademicYearOptions(null);
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );
  const scopeLabels = useFeePlanScopeLabels(scopeGroups);

  const yearLabel =
    resolveAcademicYearName(plan, yearOptions) ??
    (typeof plan.academic_year === 'object' ? plan.academic_year?.name : null) ??
    t('common.dash');
  const levelLabel = feePlanLevelLabel(plan, scopeGroups, scopeLabels);
  const validation = useMemo(() => validateFeePlanForAssignment(plan), [plan]);

  const planLines = plan.lines ?? [];
  const { required: requiredLines, optional: optionalLines } = useMemo(
    () => partitionFeePlanLines(planLines),
    [planLines],
  );
  const selectedOptionalLines = useMemo(
    () => optionalLines.filter((l) => selectedOptionalIds.includes(l.id)),
    [optionalLines, selectedOptionalIds],
  );
  const previewLines = useMemo(
    () => [...requiredLines, ...selectedOptionalLines],
    [requiredLines, selectedOptionalLines],
  );
  const installmentPreview = useMemo(() => buildInstallmentPreview(previewLines), [previewLines]);
  const expectedTotal = sumLineSubtotals(previewLines);
  const installmentCount = countInstallments(previewLines);
  const selectedIds = useMemo(() => selectedStudents.map((s) => s.studentId), [selectedStudents]);

  const stepperSteps = [
    { id: 'students', label: t('admin.finance.assignFlow.stepStudents'), done: step !== 'students' },
    { id: 'preview', label: t('admin.finance.assignFlow.stepPreview'), done: step === 'result' },
  ];

  async function handleConfirmAssign() {
    if (!selectedStudents.length || submitting) return;
    setSubmitting(true);
    const results = await assignFeePlanToStudents(
      selectedStudents,
      plan.id,
      effectiveDate,
      selectedOptionalIds,
    );
    setSubmitting(false);
    setAssignResults(results);
    setStep('result');
  }

  function resolveResultError(result: FeePlanAssignStudentResult): string {
    return resolveAssignErrorMessage(result.errorCode, result.errorMessage, t);
  }

  if (!validation.canAssign) {
    return (
      <div className="fee-plan-assign-flow">
        <header className="fee-plan-assign-flow__header">
          <h1>{t('admin.finance.assignFlow.pageTitle')}</h1>
          <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
            {t('common.back')}
          </Link>
        </header>
        <FeePlanAssignSourceCard
          plan={plan}
          yearLabel={yearLabel}
          levelLabel={levelLabel}
          expectedTotal={expectedTotal}
        />
        <div className="card fee-plan-assign-flow__block" role="alert">
          <h2>{t('admin.finance.assignFlow.cannotAssignTitle')}</h2>
          <ul>
            {validation.blockReasons.map((reason) => (
              <li key={reason}>{t(BLOCK_MESSAGE_KEYS[reason])}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="fee-plan-assign-flow">
      <header className="fee-plan-assign-flow__header">
        <div>
          <h1>{t('admin.finance.assignFlow.pageTitle')}</h1>
          <p className="muted">{t('admin.finance.assignFlow.pageDescEligible')}</p>
        </div>
        {step === 'students' ? null : (
          <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
            {t('common.back')}
          </Link>
        )}
      </header>

      <FeePlanAssignSourceCard
        plan={plan}
        yearLabel={yearLabel}
        levelLabel={levelLabel}
        expectedTotal={expectedTotal}
      />

      {step !== 'result' ? <FeePlanAssignStepper steps={stepperSteps} current={step} /> : null}

      {step === 'students' ? (
        <FeePlanAssignStudentsStep
          plan={plan}
          planLevelGroups={scopeGroups}
          selectedIds={selectedIds}
          selectedStudents={selectedStudents}
          onSelectedIdsChange={(ids, students) => setSelectedStudents(students)}
          onNext={() => setStep('preview')}
        />
      ) : null}

      {step === 'preview' ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.previewTitle')}</h2>

          {optionalLines.length > 0 ? (
            <section className="fee-plan-assign-flow__optional-block">
              <h3>{t('admin.finance.assignFlow.optionalFees')}</h3>
              <ul className="fee-plan-assign-flow__fee-list">
                {optionalLines.map((line) => (
                  <li key={line.id} className="fee-plan-assign-flow__fee-item">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedOptionalIds.includes(line.id)}
                        onChange={(e) =>
                          setSelectedOptionalIds((prev) =>
                            e.target.checked
                              ? [...prev, line.id]
                              : prev.filter((id) => id !== line.id),
                          )
                        }
                      />
                      <span>{line.name || line.fee_type?.name}</span>
                      <FinanceMoney amount={computeLineExpectedTotal(line)} currency={plan.currency} />
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <label>
            {t('admin.finance.assignDrawer.effectiveDate')}
            <input
              className="input"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </label>

          <div className="student-360-table-wrap">
            <table className="data-table fee-plan-assign-flow__preview-table">
              <thead>
                <tr>
                  <th>{t('admin.finance.feeTypeName')}</th>
                  <th>{t('admin.finance.feePlansWorkspace.pricing.modeLabel')}</th>
                  <th>{t('admin.finance.feePlansWorkspace.pricing.installmentAmount')}</th>
                  <th>{t('admin.finance.feePlansWorkspace.detailInstallmentsColumn')}</th>
                  <th>{t('admin.finance.assignFlow.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {previewLines.map((line) => {
                  const pricing = resolveLinePricing(line);
                  return (
                    <tr key={line.id}>
                      <td>{line.name || line.fee_type?.name}</td>
                      <td>{t(pricingModeLabelKey(line.pricing_mode ?? pricing.pricingMode))}</td>
                      <td>
                        <FinanceMoney
                          amount={pricing.installmentAmount ?? pricing.unitAmount}
                          currency={plan.currency}
                        />
                      </td>
                      <td>{pricing.installmentCount}</td>
                      <td>
                        <FinanceMoney amount={computeLineExpectedTotal(line)} currency={plan.currency} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    <strong>{t('admin.finance.assignFlow.expectedTotal')}</strong>
                  </td>
                  <td>
                    <strong>
                      <FinanceMoney amount={expectedTotal} currency={plan.currency} />
                    </strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {installmentPreview.length > 0 ? (
            <section className="fee-plan-assign-flow__installments">
              <h3>{t('admin.finance.assignFlow.installmentPreview')}</h3>
              <div className="student-360-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('admin.finance.assignDrawer.installmentDueDate')}</th>
                      <th>{t('admin.finance.assignDrawer.installmentAmount')}</th>
                      <th>{t('admin.finance.assignDrawer.installmentLine')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentPreview.map((row, i) => (
                      <tr key={`${row.lineName}-${row.sequence}-${i}`}>
                        <td>{row.sequence}</td>
                        <td>{formatDate(row.due_date) || row.due_date}</td>
                        <td>
                          <FinanceMoney amount={row.amount} currency={plan.currency} />
                        </td>
                        <td>{row.lineName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <p className="muted tiny">
              {t('admin.finance.assignDrawer.installmentCountOnly', { count: installmentCount })}
            </p>
          )}

          <footer className="fee-plan-assign-flow__footer fee-plan-assign-flow__footer--sticky">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('students')}>
              {t('common.previous')}
            </button>
            <div className="fee-plan-assign-flow__footer-center">
              <span className="fee-plan-assign-flow__selection-pill fee-plan-assign-flow__selection-pill--active">
                {t('admin.finance.assignFlow.selectedCount', { count: selectedStudents.length })}
              </span>
            </div>
            <div className="fee-plan-assign-flow__footer-end">
              <button
                type="button"
                className="btn btn--primary"
                disabled={submitting || !selectedStudents.length}
                onClick={handleConfirmAssign}
              >
                {submitting ? t('common.submitting') : t('admin.finance.assignFlow.confirmAssign')}
              </button>
            </div>
          </footer>
        </section>
      ) : null}

      {step === 'result' && assignResults ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.resultTitle')}</h2>
          <p className="fee-plan-assign-flow__result-summary">
            {t('admin.finance.assignFlow.resultSummary', {
              total: assignResults.length,
              success: assignResults.filter((r) => r.success).length,
              failed: assignResults.filter((r) => !r.success).length,
            })}
          </p>
          <ul className="fee-plan-assign-flow__result-list">
            {assignResults.map((result) => {
              const fees = result.response?.fees ?? [];
              const billingProfile = result.response?.billing_profile;
              return (
                <li
                  key={result.studentId}
                  className={
                    result.success
                      ? 'fee-plan-assign-flow__result-item fee-plan-assign-flow__result-item--ok'
                      : 'fee-plan-assign-flow__result-item fee-plan-assign-flow__result-item--fail'
                  }
                >
                  <div className="fee-plan-assign-flow__result-body">
                    <strong>{result.studentName}</strong>
                    {result.success ? (
                      <>
                        <p>{t('admin.finance.assignFlow.assignSuccessDetail')}</p>
                        <dl className="detail-list compact fee-plan-assign-flow__result-metrics">
                          <div>
                            <dt>{t('admin.finance.assignFlow.feesCreatedLabel')}</dt>
                            <dd>{fees.length}</dd>
                          </div>
                          <div>
                            <dt>{t('admin.finance.assignFlow.installmentsCreatedLabel')}</dt>
                            <dd>{countAssignedInstallments(fees)}</dd>
                          </div>
                          <div>
                            <dt>{t('admin.finance.assignFlow.appliedTotalLabel')}</dt>
                            <dd>
                              <FinanceMoney amount={sumAssignedFeeTotals(fees)} currency={plan.currency} />
                            </dd>
                          </div>
                        </dl>
                        {billingProfile ? (
                          <div className="fee-plan-assign-flow__billing card card--nested">
                            <p>
                              <strong>{t('admin.finance.billingPartyTitle')}:</strong>{' '}
                              {t(billingPartyTypeLabelKey(billingProfile.billing_party_type))}
                            </p>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="muted">{resolveResultError(result)}</span>
                    )}
                  </div>
                  {result.success ? (
                    <Link
                      href={`/admin/finance/students/${result.studentId}`}
                      className="btn btn--ghost btn--sm"
                    >
                      {t('admin.finance.assignFlow.openStudentFinance')}
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <footer className="fee-plan-assign-flow__footer fee-plan-assign-flow__footer--sticky">
            <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost">
              {t('admin.finance.assignFlow.backToPlan')}
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setStep('students');
                setSelectedStudents([]);
                setAssignResults(null);
              }}
            >
              {t('admin.finance.assignFlow.assignMore')}
            </button>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
