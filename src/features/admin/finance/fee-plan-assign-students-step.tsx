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
import type {
  FeePlanEligibleStudent,
  FeePlanEligibilityTabStatus,
} from '@/types/fee-plan-eligible-students';

const TABS: FeePlanEligibilityTabStatus[] = ['eligible', 'already_assigned', 'ineligible'];

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

  const eligibleState = useFeePlanEligibleStudents(plan.id, query);

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

  const selectAllOnPage = useCallback(() => {
    if (tab !== 'eligible' || !eligibleState.data) return;
    const nextMap = new Map(selectedStudents.map((s) => [s.studentId, s]));
    for (const student of eligibleState.data.students) {
      if (student.selectable) {
        nextMap.set(student.id, { studentId: student.id, studentName: student.name });
      }
    }
    const nextStudents = [...nextMap.values()];
    onSelectedIdsChange(
      nextStudents.map((s) => s.studentId),
      nextStudents,
    );
  }, [tab, eligibleState.data, selectedStudents, onSelectedIdsChange]);

  const summary = eligibleState.data?.summary;
  const pagination = eligibleState.data?.pagination;
  const rawStudents = eligibleState.data?.students ?? [];
  const students =
    tab === 'eligible' ? rawStudents.filter((student) => student.selectable) : rawStudents;
  const contractErrors =
    tab === 'eligible'
      ? rawStudents.filter((student) => student.selectable && !student.level?.name)
      : [];
  const pageSelectableCount = students.filter((s) => s.selectable).length;

  const tabCounts = {
    eligible: summary?.eligible_count ?? 0,
    already_assigned: summary?.already_assigned_count ?? 0,
    ineligible: summary?.ineligible_count ?? 0,
  };

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

  const errorMessage = useMemo(() => {
    const code = eligibleState.error?.code;
    const key = feePlanEligibleStudentsErrorMessageKey(code);
    return key ? t(key) : eligibleState.error?.message ?? t('admin.finance.assignFlow.loadStudentsFailed');
  }, [eligibleState.error, t]);

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
          <span dir="auto" className="fee-plan-assign-flow__student-cell">
            <strong>{row.name}</strong>
          </span>
        ),
      },
      {
        key: 'registration',
        header: t('admin.finance.assignFlow.registrationNumber'),
        render: (row) => (
          <span className="mono" dir="auto">
            {row.registration_number ?? t('admin.finance.unavailable')}
          </span>
        ),
      },
      {
        key: 'level',
        header: t('nav.levels'),
        render: (row) => <span dir="auto">{row.level?.name ?? t('admin.finance.assignFlow.missingLevel')}</span>,
      },
      {
        key: 'class',
        header: t('common.class'),
        render: (row) => (
          <span dir="auto">{row.class?.name ?? t('admin.finance.assignFlow.notAssignedToClass')}</span>
        ),
      },
      {
        key: 'enrollment',
        header: t('admin.finance.assignFlow.enrollmentStatusColumn'),
        render: (row) => {
          const key = enrollmentStatusLabelKey(row.enrollment_status);
          const translated = t(key);
          return translated === key ? (row.enrollment_status ?? t('common.dash')) : translated;
        },
      },
      {
        key: 'eligibility',
        header: t('admin.finance.assignFlow.eligibilityColumn'),
        render: (row) => {
          const key =
            tab === 'ineligible'
              ? feePlanEligibilityReasonLabelKey(row)
              : feePlanEligibilityStatusLabelKey(row.eligibility_status);
          return <span className="badge badge--slate">{t(key)}</span>;
        },
      },
      {
        key: 'billing',
        header: t('admin.finance.assignFlow.billingReadinessColumn'),
        render: (row) => t(feePlanBillingReadinessLabelKey(row)),
      },
    );
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
  }, [tab, t, selectedIds, toggleStudent]);

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

  return (
    <section className="card fee-plan-assign-flow__section fee-plan-assign-flow__students-step">
      <div className="fee-plan-assign-flow__students-head">
        <h2>{t('admin.finance.assignFlow.selectStudents')}</h2>
        <button
          type="button"
          className="btn btn--ghost btn--sm fee-plan-assign-flow__filters-toggle"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          {t('admin.finance.assignFlow.toggleFilters')}
        </button>
      </div>

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

      <div className="fee-plan-assign-flow__filters-desktop toolbar fee-plan-assign-flow__filters">{filterFields}</div>
      {filtersOpen ? (
        <div className="fee-plan-assign-flow__filters-mobile toolbar fee-plan-assign-flow__filters">{filterFields}</div>
      ) : null}

      {tab === 'eligible' ? (
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          disabled={pageSelectableCount === 0}
          title={pageSelectableCount === 0 ? t('admin.finance.assignFlow.selectPageDisabledHint') : undefined}
          onClick={selectAllOnPage}
        >
          {t('admin.finance.assignFlow.selectPageEligible')}
        </button>
      ) : null}

      {eligibleState.loading && !eligibleState.data ? <LoadingState label={t('common.loading')} /> : null}
      {eligibleState.error ? (
        <div className="form-error" role="alert">
          <p>{errorMessage}</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => eligibleState.reload()}>
            {t('common.retry')}
          </button>
        </div>
      ) : null}
      {contractErrors.length > 0 ? (
        <div className="form-error" role="alert">
          {t('admin.finance.assignFlow.missingLevel')}
        </div>
      ) : null}
      {!eligibleState.loading && !eligibleState.error && students.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {!eligibleState.error && students.length > 0 ? (
        <>
          <div className="fee-plan-assign-flow__desktop-table student-360-table-wrap fee-plan-assign-flow__table">
            <DataTable columns={columns} rows={students} rowKey={(row) => row.id} />
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
                      <span className="mono muted fee-plan-assign-flow__code">{student.registration_number}</span>
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
                    <dt>{t('admin.finance.assignFlow.billingReadinessColumn')}</dt>
                    <dd>{t(feePlanBillingReadinessLabelKey(student))}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
          {pagination ? (
            <Pagination
              page={pagination.page}
              totalPages={pagination.total_pages}
              total={pagination.total}
              pageSize={pagination.page_size}
              onPage={setPage}
            />
          ) : null}
        </>
      ) : null}

      <footer className="fee-plan-assign-flow__footer fee-plan-assign-flow__footer--sticky">
        <div className="fee-plan-assign-flow__footer-actions">
          <Link href={`/admin/finance/fee-plans/${plan.id}`} className="btn btn--ghost">
            {t('common.back')}
          </Link>
          <span className="muted">{t('admin.finance.assignFlow.selectedCount', { count: selectedIds.length })}</span>
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
    </section>
  );
}
