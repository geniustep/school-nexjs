'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { feeTypeFrequencyLabel } from '@/features/admin/finance/fee-types/fee-type-labels';
import {
  assessStudentEligibility,
  filterEligibilityRows,
  type StudentEligibilityRow,
  type StudentPlanEligibility,
} from '@/features/admin/finance/fee-plan-assign-eligibility';
import { assignFeePlanToStudents, type FeePlanAssignStudentResult } from '@/features/admin/finance/fee-plan-assign-executor';
import { feePlanAssignErrorMessageKey } from '@/features/admin/finance/fee-plan-assign-errors';
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
import { buildFeePlanScopeGroups, buildEnabledFeePlanScopeLevels } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { useAcademicYearOptions } from '@/features/admin/finance/use-finance-lookups';
import { useLevelOptions } from '@/features/admin/academic-setup/hooks/use-level-options';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { financeStudentDisplayName } from '@/lib/utils/finance';
import { parseFinanceList, normalizePagination } from '@/lib/utils/finance-normalize';
import { resolveAcademicYearName } from '@/lib/utils/academic-years';
import type { FeePlan, FinanceStudentSearchResult } from '@/types/finance';
import type { ListParams } from '@/types/api';
import './fee-plan-assign-flow.css';

type AssignStep = 'students' | 'optional' | 'preview' | 'result';

const BLOCK_MESSAGE_KEYS: Record<FeePlanAssignBlockReason, string> = {
  not_confirmed: 'admin.finance.assignFlow.blockNotConfirmed',
  archived: 'admin.finance.assignFlow.blockArchived',
  no_lines: 'admin.finance.assignFlow.blockNoLines',
  frequency_installment_conflict: 'admin.finance.assignFlow.blockFrequencyConflict',
};

const ELIGIBILITY_LABEL_KEYS: Record<StudentPlanEligibility, string> = {
  eligible: 'admin.finance.assignFlow.eligible',
  already_assigned: 'admin.finance.assignFlow.alreadyAssigned',
  level_out_of_scope: 'admin.finance.assignFlow.levelOutOfScope',
  no_active_year: 'admin.finance.assignFlow.noActiveYear',
};

export function FeePlanAssignFlow({ plan }: { plan: FeePlan }) {
  const t = useT();
  const { formatDate } = useFormat();
  const [step, setStep] = useState<AssignStep>('students');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedOptionalIds, setSelectedOptionalIds] = useState<number[]>([]);
  const [effectiveDate, setEffectiveDate] = useState(() => resolveDefaultEffectiveDate({}));
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    '' | StudentPlanEligibility | 'not_eligible'
  >('');
  const [page, setPage] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [assignResults, setAssignResults] = useState<FeePlanAssignStudentResult[] | null>(null);

  const { options: yearOptions } = useAcademicYearOptions(null);
  const levelOptionsState = useLevelOptions(true, { include_enabled: 'true' });
  const scopeGroups = useMemo(
    () => buildFeePlanScopeGroups(levelOptionsState.options),
    [levelOptionsState.options],
  );
  const enabledLevels = useMemo(
    () => buildEnabledFeePlanScopeLevels(levelOptionsState.options),
    [levelOptionsState.options],
  );
  const scopeLabels = useFeePlanScopeLabels(scopeGroups);

  const yearLabel =
    resolveAcademicYearName(plan, yearOptions) ??
    (typeof plan.academic_year === 'object' ? plan.academic_year?.name : null) ??
    t('common.dash');
  const levelLabel = feePlanLevelLabel(plan, scopeGroups, scopeLabels);
  const validation = useMemo(
    () => validateFeePlanForAssignment(plan, yearLabel),
    [plan, yearLabel],
  );

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

  const studentParams: ListParams = useMemo(
    () => ({ page, page_size: 20, search: search.trim() || undefined }),
    [page, search],
  );
  const studentsState = useAdminResource<unknown>(
    validation.canAssign ? endpoints.admin.financeStudentsSearch : null,
    studentParams,
  );
  const studentRows = useMemo(
    () => parseFinanceList<FinanceStudentSearchResult>(studentsState.data),
    [studentsState.data],
  );
  const pagination = normalizePagination(studentsState.meta) ?? studentsState.meta?.pagination ?? null;

  const eligibilityRows: StudentEligibilityRow[] = useMemo(
    () => studentRows.map((student) => assessStudentEligibility(student, plan)),
    [studentRows, plan],
  );
  const filteredRows = useMemo(
    () =>
      filterEligibilityRows(eligibilityRows, {
        search,
        levelId: levelFilter,
        classId: classFilter,
        statusFilter,
      }),
    [eligibilityRows, search, levelFilter, classFilter, statusFilter],
  );

  const selectedStudents = useMemo(
    () =>
      filteredRows
        .filter((r) => selectedIds.includes(r.student.id) && r.selectable)
        .map((r) => ({
          studentId: r.student.id,
          studentName: financeStudentDisplayName(r.student),
        })),
    [filteredRows, selectedIds],
  );

  const hasOptionalStep = optionalLines.length > 0;
  const stepOrder: AssignStep[] = hasOptionalStep
    ? ['students', 'optional', 'preview', 'result']
    : ['students', 'preview', 'result'];

  const stepLabels = useMemo(
    () => ({
      students: t('admin.finance.assignFlow.stepStudents'),
      optional: t('admin.finance.assignFlow.stepOptional'),
      preview: t('admin.finance.assignFlow.stepPreview'),
      result: t('admin.finance.assignFlow.stepResult'),
    }),
    [t],
  );

  const stepperSteps = stepOrder
    .filter((s) => s !== 'result')
    .map((id) => ({
      id,
      label: stepLabels[id],
      done: stepOrder.indexOf(id) < stepOrder.indexOf(step),
    }));

  const toggleStudent = useCallback((row: StudentEligibilityRow, checked: boolean) => {
    if (!row.selectable) return;
    setSelectedIds((prev) =>
      checked
        ? prev.includes(row.student.id)
          ? prev
          : [...prev, row.student.id]
        : prev.filter((id) => id !== row.student.id),
    );
  }, []);

  const selectAllEligible = useCallback(() => {
    const eligibleIds = filteredRows.filter((r) => r.selectable).map((r) => r.student.id);
    setSelectedIds(eligibleIds);
  }, [filteredRows]);

  const columns: Column<StudentEligibilityRow>[] = useMemo(
    () => [
      {
        key: 'select',
        header: '',
        render: (row) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.student.id)}
            disabled={!row.selectable}
            onChange={(e) => toggleStudent(row, e.target.checked)}
            aria-label={financeStudentDisplayName(row.student)}
          />
        ),
      },
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => (
          <span dir="auto">
            <strong>{financeStudentDisplayName(row.student)}</strong>
            {row.student.code ? (
              <span className="mono muted fee-plan-assign-flow__code">{row.student.code}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        render: (row) => row.student.level?.name ?? t('common.dash'),
      },
      {
        key: 'class',
        header: t('common.class'),
        render: (row) => row.student.class?.name ?? t('common.dash'),
      },
      {
        key: 'status',
        header: t('common.status'),
        render: (row) => (
          <span className={`badge fee-plan-assign-flow__badge fee-plan-assign-flow__badge--${row.status}`}>
            {t(ELIGIBILITY_LABEL_KEYS[row.status])}
          </span>
        ),
      },
    ],
    [t, selectedIds, toggleStudent],
  );

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

  function goNextFromStudents() {
    if (!selectedStudents.length) return;
    setStep(hasOptionalStep ? 'optional' : 'preview');
  }

  function resolveResultError(result: FeePlanAssignStudentResult): string {
    const key = feePlanAssignErrorMessageKey(result.errorCode);
    return key ? t(key) : result.errorMessage ?? t('admin.finance.assignFlow.assignFailed');
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
        <FeePlanAssignSourceCard plan={plan} yearLabel={yearLabel} levelLabel={levelLabel} />
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
          <p className="muted">{t('admin.finance.assignFlow.pageDesc')}</p>
        </div>
        <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost btn--sm">
          {t('common.back')}
        </Link>
      </header>

      <FeePlanAssignSourceCard plan={plan} yearLabel={yearLabel} levelLabel={levelLabel} />

      {validation.warnings.includes('name_year_mismatch') ? (
        <p className="fee-plan-assign-flow__warn card" role="status">
          {t('admin.finance.assignFlow.nameYearMismatch')}
        </p>
      ) : null}

      {step !== 'result' ? (
        <FeePlanAssignStepper steps={stepperSteps} current={step} />
      ) : null}

      {step === 'students' ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.selectStudents')}</h2>
          <div className="toolbar fee-plan-assign-flow__filters">
            <input
              className="input"
              placeholder={t('admin.finance.assignFlow.searchPlaceholder')}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="input"
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
            >
              <option value="">{t('admin.finance.feePlansWorkspace.allLevels')}</option>
              {enabledLevels.map((level) => (
                <option key={level.schoolLevelId} value={level.schoolLevelId}>
                  {level.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as '' | StudentPlanEligibility | 'not_eligible')
              }
            >
              <option value="">{t('admin.finance.assignFlow.allEligibility')}</option>
              <option value="eligible">{t('admin.finance.assignFlow.eligible')}</option>
              <option value="already_assigned">{t('admin.finance.assignFlow.alreadyAssigned')}</option>
              <option value="level_out_of_scope">{t('admin.finance.assignFlow.levelOutOfScope')}</option>
              <option value="not_eligible">{t('admin.finance.assignFlow.notEligible')}</option>
            </select>
            <button type="button" className="btn btn--ghost btn--sm" onClick={selectAllEligible}>
              {t('admin.finance.assignFlow.selectAllEligible')}
            </button>
          </div>

          {studentsState.loading ? <LoadingState label={t('common.loading')} /> : null}

          {!studentsState.loading && filteredRows.length === 0 ? (
            <EmptyState title={t('admin.finance.assignFlow.noStudents')} />
          ) : null}

          {filteredRows.length > 0 ? (
            <>
              <div className="student-360-table-wrap fee-plan-assign-flow__table">
                <DataTable columns={columns} rows={filteredRows} rowKey={(r) => r.student.id} />
              </div>
              {pagination ? (
                <Pagination
                  page={pagination.page}
                  totalPages={pagination.total_pages}
                  total={pagination.total}
                  onPage={setPage}
                />
              ) : null}
            </>
          ) : null}

          <p className="tiny muted">{t('admin.finance.assignFlow.eligibilityNote')}</p>

          <footer className="fee-plan-assign-flow__footer">
            <span className="muted">
              {t('admin.finance.assignFlow.selectedCount', { count: selectedStudents.length })}
            </span>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!selectedStudents.length}
              onClick={goNextFromStudents}
            >
              {t('common.next')}
            </button>
          </footer>
        </section>
      ) : null}

      {step === 'optional' ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.optionalFees')}</h2>
          <ul className="fee-plan-assign-flow__fee-list">
            {requiredLines.map((line) => (
              <li key={line.id} className="fee-plan-assign-flow__fee-item fee-plan-assign-flow__fee-item--locked">
                <span>{line.name || line.fee_type?.name}</span>
                <FinanceMoney amount={line.amount} currency={plan.currency} />
                <span className="badge badge--blue">{t('admin.finance.assignFlow.required')}</span>
              </li>
            ))}
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
                  <FinanceMoney amount={line.amount} currency={plan.currency} />
                </label>
              </li>
            ))}
          </ul>
          <footer className="fee-plan-assign-flow__footer">
            <button type="button" className="btn btn--ghost" onClick={() => setStep('students')}>
              {t('common.previous')}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setStep('preview')}>
              {t('common.next')}
            </button>
          </footer>
        </section>
      ) : null}

      {step === 'preview' ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.previewTitle')}</h2>

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
                  <th>{t('admin.finance.lineAmount')}</th>
                  <th>{t('admin.finance.feeTypesWorkspace.frequency')}</th>
                  <th>{t('admin.finance.feePlansWorkspace.installmentCount')}</th>
                  <th>{t('admin.finance.assignFlow.lineTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {previewLines.map((line) => {
                  const installments = line.installment_count ?? 1;
                  return (
                    <tr key={line.id}>
                      <td>{line.name || line.fee_type?.name}</td>
                      <td>
                        <FinanceMoney amount={line.amount} currency={plan.currency} />
                      </td>
                      <td>{feeTypeFrequencyLabel(line.frequency ?? 'once', t)}</td>
                      <td>{installments}</td>
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

          <section className="fee-plan-assign-flow__installments">
            <h3>{t('admin.finance.assignFlow.installmentPreview')}</h3>
            {installmentPreview.length > 0 ? (
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
            ) : (
              <p className="muted tiny">
                {t('admin.finance.assignDrawer.installmentCountOnly', { count: installmentCount })}
              </p>
            )}
          </section>

          <p className="muted tiny">{t('admin.finance.assignDrawer.previewDisclaimer')}</p>

          <footer className="fee-plan-assign-flow__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setStep(hasOptionalStep ? 'optional' : 'students')}
            >
              {t('common.previous')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={submitting || !selectedStudents.length}
              onClick={handleConfirmAssign}
            >
              {submitting ? t('common.submitting') : t('admin.finance.assignFlow.confirmAssign')}
            </button>
          </footer>
        </section>
      ) : null}

      {step === 'result' && assignResults ? (
        <section className="card fee-plan-assign-flow__section">
          <h2>{t('admin.finance.assignFlow.resultTitle')}</h2>
          {(() => {
            const successCount = assignResults.filter((r) => r.success).length;
            const failCount = assignResults.length - successCount;
            return (
              <p className="fee-plan-assign-flow__result-summary">
                {t('admin.finance.assignFlow.resultSummary', {
                  total: assignResults.length,
                  success: successCount,
                  failed: failCount,
                })}
              </p>
            );
          })()}

          <ul className="fee-plan-assign-flow__result-list">
            {assignResults.map((result) => (
              <li
                key={result.studentId}
                className={
                  result.success
                    ? 'fee-plan-assign-flow__result-item fee-plan-assign-flow__result-item--ok'
                    : 'fee-plan-assign-flow__result-item fee-plan-assign-flow__result-item--fail'
                }
              >
                <div>
                  <strong>{result.studentName}</strong>
                  <span className="muted">
                    {result.success
                      ? t('admin.finance.assignFlow.assignSuccess')
                      : resolveResultError(result)}
                  </span>
                  {result.success && result.response?.fees?.length ? (
                    <span className="tiny muted">
                      {t('admin.finance.assignFlow.feesCreated', {
                        count: result.response.fees.length,
                      })}
                    </span>
                  ) : null}
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
            ))}
          </ul>

          <footer className="fee-plan-assign-flow__footer">
            <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost">
              {t('admin.finance.assignFlow.backToPlan')}
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setStep('students');
                setSelectedIds([]);
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
