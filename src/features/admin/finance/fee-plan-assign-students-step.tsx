'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/states/states';
import { DataTable, Pagination, type Column } from '@/components/tables/data-table';
import { useDebouncedValue } from '@/features/admin/students/hooks/use-debounced-value';
import {
  enrollmentStatusLabelKey,
  feePlanBillingReadinessLabelKey,
  feePlanEligibilityReasonLabelKey,
  feePlanEligibilityStatusLabelKey,
  feePlanEligibleStudentsErrorMessageKey,
} from '@/features/admin/finance/fee-plan-eligibility-labels';
import {
  buildFeePlanEligibleStudentsQuery,
  useFeePlanEligibleStudents,
} from '@/features/admin/finance/use-fee-plan-eligible-students';
import { planLevelIdsForFilter } from '@/features/admin/finance/fee-plan-assign-validation';
import type { FeePlanScopeCycleGroup } from '@/features/admin/finance/fee-plans/fee-plan-level-scope';
import { useT } from '@/features/i18n/locale-context';
import { endpoints } from '@/lib/api/endpoints';
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import type { SchoolClass } from '@/types/class';
import type { FeePlan } from '@/types/finance';
import {
  buildAssignedStudentsFinancialSummaryQuery,
  useFeePlanAssignedStudentsFinancialSummary,
} from '@/features/admin/finance/use-fee-plan-assigned-students-financial-summary';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import type { AssignedStudentFinancialSummary } from '@/types/student-financial-overview';
import type {
  FeePlanEligibleStudent,
  FeePlanEligibilityTabStatus,
} from '@/types/fee-plan-eligible-students';

const TABS: FeePlanEligibilityTabStatus[] = ['eligible', 'already_assigned', 'ineligible'];

function studentInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function billingBadgeClass(student: FeePlanEligibleStudent): string {
  if (student.billing_ready) return 'fee-plan-assign-flow__badge--billing-ready';
  if (student.billing_will_be_created_automatically) return 'fee-plan-assign-flow__badge--billing-auto';
  return 'fee-plan-assign-flow__badge--billing-review';
}

export interface SelectedAssignStudent {
  studentId: number;
  studentName: string;
}

export function FeePlanAssignStudentsStep({
  plan,
  planLevelGroups,
  selectedIds,
  selectedStudents,
  onSelectedIdsChange,
  onNext,
}: {
  plan: FeePlan;
  planLevelGroups: FeePlanScopeCycleGroup[];
  selectedIds: number[];
  selectedStudents: SelectedAssignStudent[];
  onSelectedIdsChange: (ids: number[], students: SelectedAssignStudent[]) => void;
  onNext: () => void;
}) {
  const t = useT();
  const { formatDate } = useFormat();
  const [tab, setTab] = useState<FeePlanEligibilityTabStatus>('eligible');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 400);

  const planLevelIds = useMemo(() => planLevelIdsForFilter(plan), [plan]);
  const planLevels = useMemo(() => {
    const all = planLevelGroups.flatMap((g) => g.levels);
    if (!planLevelIds.length) return all;
    return all.filter((level) => planLevelIds.includes(level.schoolLevelId));
  }, [planLevelGroups, planLevelIds]);

  const classesState = useAdminResource<SchoolClass[]>(endpoints.admin.classes, { page_size: 500 });
  const planClasses = useMemo(() => {
    const rows = Array.isArray(classesState.data) ? classesState.data : [];
    if (!planLevelIds.length) return rows;
    return rows.filter((c) => c.level?.id != null && planLevelIds.includes(Number(c.level.id)));
  }, [classesState.data, planLevelIds]);

  const query = useMemo(
    () =>
      buildFeePlanEligibleStudentsQuery({
        tab,
        search: debouncedSearch,
        levelId: levelFilter,
        classId: classFilter,
        page,
        pageSize: 25,
      }),
    [tab, debouncedSearch, levelFilter, classFilter, page],
  );

  const eligibleState = useFeePlanEligibleStudents(plan.id, query, tab !== 'already_assigned');

  const assignedSummaryQuery = useMemo(
    () =>
      tab === 'already_assigned'
        ? buildAssignedStudentsFinancialSummaryQuery({
            search: debouncedSearch,
            levelId: levelFilter,
            classId: classFilter,
            page,
            pageSize: 25,
            academicYearId: plan.academic_year_id,
          })
        : null,
    [tab, debouncedSearch, levelFilter, classFilter, page, plan.academic_year_id],
  );
  const assignedSummaryState = useFeePlanAssignedStudentsFinancialSummary(
    plan.id,
    assignedSummaryQuery,
    tab === 'already_assigned',
  );

  const switchTab = useCallback((next: FeePlanEligibilityTabStatus) => {
    setTab(next);
    setPage(1);
  }, []);

  const toggleStudent = useCallback(
    (student: FeePlanEligibleStudent, checked: boolean) => {
      if (!student.selectable || tab !== 'eligible') return;
      const nextMap = new Map(selectedStudents.map((s) => [s.studentId, s]));
      if (checked) nextMap.set(student.id, { studentId: student.id, studentName: student.name });
      else nextMap.delete(student.id);
      const nextStudents = [...nextMap.values()];
      onSelectedIdsChange(
        nextStudents.map((s) => s.studentId),
        nextStudents,
      );
    },
    [selectedStudents, onSelectedIdsChange, tab],
  );

  const summary = eligibleState.data?.summary;
  const pagination =
    tab === 'already_assigned'
      ? assignedSummaryState.data?.pagination
      : eligibleState.data?.pagination;
  const rawStudents = eligibleState.data?.students ?? [];
  const assignedStudents = assignedSummaryState.data?.students ?? [];
  const students =
    tab === 'already_assigned'
      ? []
      : tab === 'eligible'
        ? rawStudents.filter((student) => student.selectable)
        : rawStudents;
  const contractErrors =
    tab === 'eligible'
      ? rawStudents.filter((student) => student.selectable && !student.level?.name)
      : [];
  const pageSelectableCount = students.filter((s) => s.selectable).length;
  const selectedOnPage = students.filter((s) => selectedIds.includes(s.id)).length;
  const selectedElsewhere = Math.max(0, selectedIds.length - selectedOnPage);

  const selectAllOnPage = useCallback(() => {
    if (tab !== 'eligible' || pageSelectableCount === 0) return;
    const nextMap = new Map(selectedStudents.map((s) => [s.studentId, s]));
    for (const student of students) {
      if (student.selectable) {
        nextMap.set(student.id, { studentId: student.id, studentName: student.name });
      }
    }
    const nextStudents = [...nextMap.values()];
    onSelectedIdsChange(
      nextStudents.map((s) => s.studentId),
      nextStudents,
    );
  }, [tab, students, pageSelectableCount, selectedStudents, onSelectedIdsChange]);

  const clearPageSelection = useCallback(() => {
    const pageIds = new Set(students.map((s) => s.id));
    const nextStudents = selectedStudents.filter((s) => !pageIds.has(s.studentId));
    onSelectedIdsChange(
      nextStudents.map((s) => s.studentId),
      nextStudents,
    );
  }, [students, selectedStudents, onSelectedIdsChange]);

  const tabCounts = {
    eligible: summary?.eligible_count ?? 0,
    already_assigned: summary?.already_assigned_count ?? 0,
    ineligible: summary?.ineligible_count ?? 0,
  };

  const resultsMeta = useMemo(() => {
    if (!pagination) return null;
    const from = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.page_size + 1;
    const to = Math.min(pagination.page * pagination.page_size, pagination.total);
    return t('admin.finance.assignFlow.resultsRange', { from, to, total: pagination.total });
  }, [pagination, t]);

  const emptyTitle =
    tab === 'eligible'
      ? t('admin.finance.assignFlow.emptyEligibleTitle')
      : tab === 'already_assigned'
        ? t('admin.finance.assignFlow.emptyAlreadyAssignedTitle')
        : t('admin.finance.assignFlow.emptyIneligibleTitle');

  const emptyDescription =
    tab === 'eligible'
      ? t('admin.finance.assignFlow.emptyEligibleDesc')
      : tab === 'already_assigned'
        ? t('admin.finance.assignFlow.emptyAlreadyAssignedDesc')
        : t('admin.finance.assignFlow.emptyIneligibleDesc');


  const listLoading =
    tab === 'already_assigned' ? assignedSummaryState.loading : eligibleState.loading;
  const listError =
    tab === 'already_assigned' ? assignedSummaryState.error : eligibleState.error;
  const reloadList =
    tab === 'already_assigned' ? assignedSummaryState.reload : eligibleState.reload;

  const errorMessage = useMemo(() => {
    const code = listError?.code;
    const key = feePlanEligibleStudentsErrorMessageKey(code);
    return key ? t(key) : listError?.message ?? t('admin.finance.assignFlow.loadStudentsFailed');
  }, [listError, t]);

  const renderEnrollmentStatus = useCallback(
    (status: string | null | undefined) => {
      if (!status) return t('common.dash');
      const key = enrollmentStatusLabelKey(status);
      const translated = t(key);
      if (translated !== key) {
        return <span className="fee-plan-assign-flow__badge fee-plan-assign-flow__badge--enrollment">{translated}</span>;
      }
      return <span className="fee-plan-assign-flow__badge fee-plan-assign-flow__badge--enrollment">{status}</span>;
    },
    [t],
  );

  const renderBillingReadiness = useCallback(
    (student: FeePlanEligibleStudent) => (
      <span className={`fee-plan-assign-flow__badge ${billingBadgeClass(student)}`}>
        {t(feePlanBillingReadinessLabelKey(student))}
      </span>
    ),
    [t],
  );

  const columns: Column<FeePlanEligibleStudent>[] = useMemo(() => {
    const cols: Column<FeePlanEligibleStudent>[] = [];
    if (tab === 'eligible') {
      cols.push({
        key: 'select',
        header: '',
        className: 'fee-plan-assign-flow__select-col',
        render: (row) => (
          <input
            type="checkbox"
            checked={selectedIds.includes(row.id)}
            disabled={!row.selectable}
            onChange={(e) => toggleStudent(row, e.target.checked)}
            aria-label={row.name}
          />
        ),
      });
    }
    cols.push(
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => (
          <div dir="auto" className="fee-plan-assign-flow__student-row">
            <span className="fee-plan-assign-flow__avatar" aria-hidden="true">
              {studentInitial(row.name)}
            </span>
            <span className="fee-plan-assign-flow__student-cell">
              <strong>{row.name}</strong>
              {row.registration_number ? (
                <span className="mono fee-plan-assign-flow__reg" dir="ltr">
                  {row.registration_number}
                </span>
              ) : null}
            </span>
          </div>
        ),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        width: '9rem',
        render: (row) => <span dir="auto">{row.level?.name ?? t('admin.finance.assignFlow.missingLevel')}</span>,
      },
      {
        key: 'class',
        header: t('common.class'),
        width: '6rem',
        render: (row) => (
          <span dir="auto">{row.class?.name ?? t('admin.finance.assignFlow.notAssignedToClass')}</span>
        ),
      },
      {
        key: 'enrollment',
        header: t('admin.finance.assignFlow.enrollmentStatusColumn'),
        render: (row) => renderEnrollmentStatus(row.enrollment_status),
      },
    );

    if (tab !== 'eligible') {
      cols.push({
        key: 'eligibility',
        header: t('admin.finance.assignFlow.eligibilityColumn'),
        render: (row) => {
          const key =
            tab === 'ineligible'
              ? feePlanEligibilityReasonLabelKey(row)
              : feePlanEligibilityStatusLabelKey(row.eligibility_status);
          const badgeClass =
            row.eligibility_status === 'already_assigned'
              ? 'fee-plan-assign-flow__badge--already_assigned'
              : 'fee-plan-assign-flow__badge--ineligible';
          return <span className={`fee-plan-assign-flow__badge ${badgeClass}`}>{t(key)}</span>;
        },
      });
    }

    cols.push({
      key: 'billing',
      header: t('admin.finance.assignFlow.billingReadinessColumn'),
      render: (row) => renderBillingReadiness(row),
    });

    if (tab === 'already_assigned') {
      cols.push({
        key: 'action',
        header: t('admin.actions'),
        render: (row) => (
          <Link href={`/admin/finance/students/${row.id}`} className="btn btn--ghost btn--sm">
            {t('admin.finance.assignFlow.openStudentFinance')}
          </Link>
        ),
      });
    }
    return cols;
  }, [tab, t, selectedIds, toggleStudent, renderEnrollmentStatus, renderBillingReadiness]);

  const assignedColumns: Column<AssignedStudentFinancialSummary>[] = useMemo(
    () => [
      {
        key: 'name',
        header: t('nav.students'),
        render: (row) => (
          <div dir="auto">
            <strong>{row.student_name}</strong>
            {row.registration_number ? (
              <span className="mono muted fee-plan-assign-flow__code" dir="ltr">
                {row.registration_number}
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'assigned_date',
        header: t('admin.finance.assignFlow.assignedDate'),
        render: (row) => (row.assigned_date ? formatDate(row.assigned_date) : t('common.dash')),
      },
      {
        key: 'total_fees',
        header: t('admin.student360.financeWorkspace.metrics.annualTotal'),
        render: (row) => <FinanceMoney amount={row.total_fees} />,
      },
      {
        key: 'due_to_date',
        header: t('admin.student360.financeWorkspace.metrics.dueToDate'),
        render: (row) => <FinanceMoney amount={row.due_to_date} />,
      },
      {
        key: 'paid',
        header: t('admin.student360.financeWorkspace.metrics.paid'),
        render: (row) => <FinanceMoney amount={row.paid} />,
      },
      {
        key: 'remaining',
        header: t('admin.student360.financeWorkspace.metrics.remaining'),
        render: (row) => <FinanceMoney amount={row.remaining} />,
      },
      {
        key: 'overdue',
        header: t('admin.student360.financeWorkspace.metrics.overdue'),
        render: (row) => <FinanceMoney amount={row.overdue} />,
      },
      {
        key: 'next_installment',
        header: t('admin.student360.financeWorkspace.metrics.nextInstallment'),
        render: (row) => (
          <span>
            <FinanceMoney amount={row.next_installment?.remaining_amount} />
            {row.next_installment?.due_date ? (
              <span className="tiny muted"> — {formatDate(row.next_installment.due_date)}</span>
            ) : null}
          </span>
        ),
      },
      {
        key: 'actions',
        header: t('admin.actions'),
        render: (row) => (
          <div className="row">
            <Link
              href={`/admin/students/${row.student_id}?tab=finance&financeSubTab=overview`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.assignFlow.openFinancialOverview')}
            </Link>
            <Link
              href={`/admin/students/${row.student_id}?tab=finance&financeSubTab=schedule`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.assignFlow.openSchedule')}
            </Link>
            <Link
              href={`/admin/students/${row.student_id}?tab=finance&financeSubTab=overview&collect=1`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.finance.collectionWorkflow.recordPayment')}
            </Link>
          </div>
        ),
      },
    ],
    [t, formatDate],
  );

  const filterFields = (
    <>
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
        onChange={(e) => {
          setLevelFilter(e.target.value);
          setPage(1);
        }}
      >
        <option value="">{t('admin.finance.assignFlow.allPlanLevels')}</option>
        {planLevels.map((level) => (
          <option key={level.schoolLevelId} value={level.schoolLevelId}>
            {level.name}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={classFilter}
        onChange={(e) => {
          setClassFilter(e.target.value);
          setPage(1);
        }}
      >
        <option value="">{t('admin.finance.assignFlow.allPlanClasses')}</option>
        {planClasses.map((cls) => (
          <option key={cls.id} value={cls.id}>
            {cls.name}
          </option>
        ))}
      </select>
    </>
  );

  const allPageSelected = pageSelectableCount > 0 && selectedOnPage === pageSelectableCount;

  return (
    <div className="fee-plan-assign-students">
      <div className="fee-plan-assign-students__head">
        <button
          type="button"
          className="btn btn--ghost btn--sm fee-plan-assign-flow__filters-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
        >
          {t('admin.finance.assignFlow.toggleFilters')}
        </button>
      </div>

      <div className="fee-plan-assign-flow__tabs-wrap">
        <div className="fee-plan-assign-flow__tabs" role="tablist">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`fee-plan-assign-flow__tab${tab === value ? ' fee-plan-assign-flow__tab--active' : ''}`}
            onClick={() => switchTab(value)}
          >
            <span>{t(`admin.finance.assignFlow.tabs.${value}`)}</span>
            <span className="fee-plan-assign-flow__tab-count">{tabCounts[value]}</span>
          </button>
        ))}
        </div>
      </div>

      <div
        className={`fee-plan-assign-flow__filters-panel${filtersOpen ? ' fee-plan-assign-flow__filters-panel--open' : ''}`}
      >
        {filterFields}
      </div>

      {tab === 'eligible' ? (
        <div className="fee-plan-assign-flow__toolbar">
          <div className="fee-plan-assign-flow__toolbar-actions">
            <button
              type="button"
              className="btn btn--ghost btn--sm fee-plan-assign-flow__select-page-btn"
              disabled={pageSelectableCount === 0}
              title={pageSelectableCount === 0 ? t('admin.finance.assignFlow.selectPageDisabledHint') : undefined}
              onClick={allPageSelected ? clearPageSelection : selectAllOnPage}
            >
              {allPageSelected
                ? t('admin.finance.assignFlow.clearPageSelection')
                : t('admin.finance.assignFlow.selectPageEligible')}
            </button>
          </div>
          {resultsMeta ? <span className="fee-plan-assign-flow__results-meta">{resultsMeta}</span> : null}
        </div>
      ) : resultsMeta ? (
        <div className="fee-plan-assign-flow__toolbar">
          <span className="fee-plan-assign-flow__results-meta">{resultsMeta}</span>
        </div>
      ) : null}

      {listLoading && (tab === 'already_assigned' ? !assignedSummaryState.data : !eligibleState.data) ? (
        <LoadingState label={t('common.loading')} />
      ) : null}
      {listError ? (
        <div className="form-error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => reloadList()}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      {contractErrors.length > 0 ? (
        <div className="form-error" role="alert">
          {t('admin.finance.assignFlow.missingLevel')}
        </div>
      ) : null}
      {tab === 'already_assigned' && !listLoading && !listError && assignedStudents.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}
      {tab !== 'already_assigned' && !listLoading && !listError && students.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {tab === 'already_assigned' && !listError && assignedStudents.length > 0 ? (
        <>
          <div className="fee-plan-assign-flow__desktop-table">
            <DataTable columns={assignedColumns} rows={assignedStudents} rowKey={(row) => row.student_id} stickyHeader />
          </div>
          <div className="fee-plan-assign-flow__mobile-cards">
            {assignedStudents.map((student) => (
              <article key={student.student_id} className="fee-plan-assign-flow__student-card">
                <div className="fee-plan-assign-flow__student-card-head">
                  <div dir="auto">
                    <strong>{student.student_name}</strong>
                  </div>
                </div>
                <dl className="detail-list compact">
                  <div>
                    <dt>{t('admin.finance.assignFlow.assignedDate')}</dt>
                    <dd>{student.assigned_date ? formatDate(student.assigned_date) : t('common.dash')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.metrics.annualTotal')}</dt>
                    <dd><FinanceMoney amount={student.total_fees} /></dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.metrics.dueToDate')}</dt>
                    <dd><FinanceMoney amount={student.due_to_date} /></dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financeWorkspace.metrics.remaining')}</dt>
                    <dd><FinanceMoney amount={student.remaining} /></dd>
                  </div>
                </dl>
                <div className="row">
                  <Link href={`/admin/students/${student.student_id}?tab=finance`} className="btn btn--ghost btn--sm">
                    {t('admin.finance.assignFlow.openStudentFinance')}
                  </Link>
                </div>
              </article>
            ))}
          </div>
          {pagination ? (
            <Pagination
              page={pagination.page}
              pageSize={pagination.page_size}
              total={pagination.total}
              totalPages={Math.max(1, Math.ceil(pagination.total / pagination.page_size))}
              onPage={setPage}
            />
          ) : null}
        </>
      ) : null}

      {tab !== 'already_assigned' && !listError && students.length > 0 ? (
        <>
          <div className="fee-plan-assign-flow__desktop-table">
            <DataTable columns={columns} rows={students} rowKey={(row) => row.id} stickyHeader />
          </div>
          <div className="fee-plan-assign-flow__mobile-cards">
            {students.map((student) => (
              <article key={student.id} className="fee-plan-assign-flow__student-card">
                <div className="fee-plan-assign-flow__student-card-head">
                  {tab === 'eligible' ? (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(student.id)}
                      disabled={!student.selectable}
                      onChange={(e) => toggleStudent(student, e.target.checked)}
                      aria-label={student.name}
                    />
                  ) : null}
                  <div dir="auto">
                    <strong>{student.name}</strong>
                    {student.registration_number ? (
                      <span className="mono muted fee-plan-assign-flow__code" dir="ltr">
                        {student.registration_number}
                      </span>
                    ) : null}
                  </div>
                </div>
                <dl className="detail-list compact">
                  <div>
                    <dt>{t('nav.levels')}</dt>
                    <dd dir="auto">{student.level?.name ?? t('admin.finance.assignFlow.missingLevel')}</dd>
                  </div>
                  <div>
                    <dt>{t('common.class')}</dt>
                    <dd dir="auto">{student.class?.name ?? t('admin.finance.assignFlow.notAssignedToClass')}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.finance.assignFlow.enrollmentStatusColumn')}</dt>
                    <dd>{renderEnrollmentStatus(student.enrollment_status)}</dd>
                  </div>
                  {tab !== 'eligible' ? (
                    <div>
                      <dt>{t('admin.finance.assignFlow.eligibilityColumn')}</dt>
                      <dd>
                        <span
                          className={`fee-plan-assign-flow__badge ${
                            student.eligibility_status === 'already_assigned'
                              ? 'fee-plan-assign-flow__badge--already_assigned'
                              : 'fee-plan-assign-flow__badge--ineligible'
                          }`}
                        >
                          {t(
                            tab === 'ineligible'
                              ? feePlanEligibilityReasonLabelKey(student)
                              : feePlanEligibilityStatusLabelKey(student.eligibility_status),
                          )}
                        </span>
                      </dd>
                    </div>
                  ) : null}
                  <div>
                    <dt>{t('admin.finance.assignFlow.billingReadinessColumn')}</dt>
                    <dd>{renderBillingReadiness(student)}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {pagination ? (
            <div className="fee-plan-assign-flow__pagination">
              <Pagination
                page={pagination.page}
                totalPages={Math.max(1, Math.ceil(pagination.total / pagination.page_size))}
                total={pagination.total}
                pageSize={pagination.page_size}
                onPage={setPage}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <footer className="fee-plan-assign-flow__footer fee-plan-assign-flow__footer--sticky">
        <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost fee-plan-assign-flow__footer-back">
          {t('common.back')}
        </Link>
        <div className="fee-plan-assign-flow__footer-center">
          <span
            className={`fee-plan-assign-flow__selection-pill${
              selectedIds.length > 0 ? ' fee-plan-assign-flow__selection-pill--active' : ''
            }`}
          >
            {t('admin.finance.assignFlow.selectedCount', { count: selectedIds.length })}
          </span>
          {selectedElsewhere > 0 ? (
            <span className="muted tiny">
              {t('admin.finance.assignFlow.selectedElsewhere', { count: selectedElsewhere })}
            </span>
          ) : null}
          {selectedIds.length === 0 ? (
            <span className="muted tiny">{t('admin.finance.assignFlow.nextDisabledHint')}</span>
          ) : null}
        </div>
        <div className="fee-plan-assign-flow__footer-end">
          <button
            type="button"
            className="btn btn--primary"
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? t('admin.finance.assignFlow.nextDisabledHint') : undefined}
            onClick={onNext}
          >
            {t('common.next')}
          </button>
        </div>
      </footer>
    </div>
  );
}
