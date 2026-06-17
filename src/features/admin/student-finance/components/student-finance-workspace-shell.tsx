'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { useT } from '@/features/i18n/locale-context';
import {
  canCollectStudentPayments,
  canViewStudentPayments,
} from '@/features/admin/students/utils/resolve-capabilities';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import {
  StudentFinanceSkeleton,
  StudentInlineLoading,
  StudentYearSelectSkeleton,
} from '@/features/admin/students/components/student-360-loading';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { useStudentFinanceTabState } from '../hooks/use-student-finance-tab-state';
import { useStudentFinancialOverview } from '../hooks/use-student-financial-overview';
import {
  parseStudentFinanceSubTab,
  studentFinanceSubTabLabelKey,
  STUDENT_FINANCE_SUB_TABS,
  type StudentFinanceSubTab,
} from '../utils/student-finance-sub-tab';
import {
  resolveFinanceTabLoadPhase,
  shouldShowFinanceEmptyState,
} from '../utils/finance-tab-loading';
import { StudentFinanceOverviewPanel } from './student-finance-overview-panel';
import { StudentFinanceFeesPanel } from './student-finance-fees-panel';
import { StudentFinanceSchedulePanel } from './student-finance-schedule-panel';
import { StudentFinanceCollectionsPanel } from './student-finance-collections-panel';
import { StudentFinancialAgreementTab } from './student-financial-agreement-tab';

export function StudentFinanceWorkspaceShell({
  studentId,
  details,
  capabilities,
  onChanged,
}: {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  onChanged?: () => void;
}) {
  const t = useT();
  const searchParams = useSearchParams();
  const initialSubTab = parseStudentFinanceSubTab(searchParams.get('financeSubTab'));
  const [subTab, setSubTab] = useState<StudentFinanceSubTab>(initialSubTab);
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);

  const {
    refState,
    academicYears,
    effectiveYearId,
    setSelectedYearId,
    workspaceState,
    workspace,
    isRefreshing,
  } = useStudentFinanceTabState(studentId, details);

  const financialOverviewState = useStudentFinancialOverview(
    studentId,
    effectiveYearId,
    !!effectiveYearId,
  );

  const phase = resolveFinanceTabLoadPhase({
    yearsLoading: refState.loading,
    effectiveYearId,
    workspaceInitialLoading: workspaceState.initialLoading,
    agreementId: null,
    agreementDetailInitialLoading: false,
  });

  const financeCaps = workspace?.capabilities as StudentFinanceCapabilities | undefined;
  const canViewPayments = canViewStudentPayments(capabilities, financeCaps);
  const canCollect = canCollectStudentPayments(capabilities, financeCaps);

  const refreshFinanceData = () => {
    workspaceState.reload();
    financialOverviewState.reload();
    onChanged?.();
  };

  const emptyFinance =
    (financialOverviewState.data?.totals.annual_total ?? 0) === 0 &&
    (financialOverviewState.data?.counts.fees_count ?? 0) === 0 &&
    (workspace?.recent_collections?.length ?? 0) === 0;

  const showFinanceEmpty = shouldShowFinanceEmptyState({
    phase,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
    emptyFinance,
  });

  const headerActions = (
    <div className="student-finance-header-actions">
      {refState.loading && !academicYears.length ? (
        <StudentYearSelectSkeleton />
      ) : (
        <label className="student-finance-year-select">
          <span className="tiny muted">{t('admin.student360.finance.academicYear')}</span>
          <select
            className="input"
            value={effectiveYearId}
            onChange={(e) => setSelectedYearId(e.target.value)}
            disabled={refState.loading || !academicYears.length}
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="student-finance-header-buttons">
        {workspace?.finance_profile?.billing_partner?.id ? (
          <Link
            href={`/admin/finance/billing-accounts/${workspace.finance_profile.billing_partner.id}?returnTo=${encodeURIComponent(`/admin/students/${studentId}?tab=finance`)}`}
            className="btn btn--ghost btn--sm"
          >
            {t('admin.finance.billingAccounts.openPayerAccount')}
          </Link>
        ) : null}
        {canCollect ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            onClick={() => setShowCollectionDrawer(true)}
          >
            {t('admin.finance.collectionWorkflow.recordPayment')}
          </button>
        ) : null}
      </div>
    </div>
  );

  const sharedPanelProps = useMemo(
    () => ({
      studentId,
      details,
      capabilities,
      effectiveYearId,
      workspace,
      financialOverview: financialOverviewState.data,
      financialOverviewLoading: financialOverviewState.loading,
      financialOverviewError: financialOverviewState.error,
      onReloadFinancialOverview: financialOverviewState.reload,
      canViewPayments,
      canCollect,
      onRefresh: refreshFinanceData,
      onOpenCollection: () => setShowCollectionDrawer(true),
    }),
    [
      studentId,
      details,
      capabilities,
      effectiveYearId,
      workspace,
      financialOverviewState.data,
      financialOverviewState.loading,
      financialOverviewState.error,
      canViewPayments,
      canCollect,
    ],
  );

  if (phase !== 'ready') {
    return (
      <div className="student-finance-tab student-360-tab-panel">
        <Student360SectionHeader
          title={t('admin.student360.financeWorkspace.pageTitle')}
          description={t('admin.student360.financeWorkspace.pageDescription')}
          action={headerActions}
        />
        <StudentFinanceSkeleton />
      </div>
    );
  }

  if (workspaceState.error?.code === 'forbidden') {
    return (
      <Student360CompactEmpty
        title={t('admin.student360.finance.forbidden')}
        description={t('admin.student360.finance.forbiddenDesc')}
      />
    );
  }

  if (workspaceState.error && workspaceState.error.code !== 'forbidden') {
    return <ApiErrorView error={workspaceState.error} onRetry={workspaceState.reload} />;
  }

  return (
    <div
      className={`student-finance-tab student-360-tab-panel${isRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}
    >
      <Student360SectionHeader
        title={t('admin.student360.financeWorkspace.pageTitle')}
        description={t('admin.student360.financeWorkspace.pageDescription')}
        action={headerActions}
      />
      {isRefreshing ? <StudentInlineLoading /> : null}

      <nav className="student-finance-subtabs" aria-label={t('admin.student360.financeWorkspace.tabsAria')}>
        {STUDENT_FINANCE_SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={subTab === tab}
            className={`student-finance-subtabs__tab${subTab === tab ? ' is-active' : ''}`}
            onClick={() => setSubTab(tab)}
          >
            {t(studentFinanceSubTabLabelKey(tab))}
          </button>
        ))}
      </nav>

      {showFinanceEmpty && subTab !== 'agreements' ? (
        <Student360CompactEmpty
          title={t('admin.student360.financeOps.emptyTitle')}
          description={t('admin.student360.financeOps.emptyDescription')}
        />
      ) : (
        <>
          {subTab === 'overview' ? <StudentFinanceOverviewPanel {...sharedPanelProps} /> : null}
          {subTab === 'fees' ? <StudentFinanceFeesPanel {...sharedPanelProps} /> : null}
          {subTab === 'schedule' ? <StudentFinanceSchedulePanel {...sharedPanelProps} /> : null}
          {subTab === 'collections' ? <StudentFinanceCollectionsPanel {...sharedPanelProps} /> : null}
          {subTab === 'agreements' ? (
            <StudentFinancialAgreementTab
              studentId={studentId}
              details={details}
              capabilities={capabilities}
              financialOverview={financialOverviewState.data}
              onChanged={() => refreshFinanceData()}
              embedded
            />
          ) : null}
        </>
      )}

      <StudentCollectionDrawer
        open={showCollectionDrawer}
        studentId={studentId}
        academicYearId={effectiveYearId ? Number(effectiveYearId) : undefined}
        billingProfileId={financialOverviewState.data?.billing_profile_id ?? undefined}
        billingPartnerId={
          financialOverviewState.data?.billing_profile?.billing_partner_id ?? undefined
        }
        financialOverview={financialOverviewState.data}
        onClose={() => setShowCollectionDrawer(false)}
        onSuccess={refreshFinanceData}
        onOverviewUpdate={financialOverviewState.reload}
      />
    </div>
  );
}
