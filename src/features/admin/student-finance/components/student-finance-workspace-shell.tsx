'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import {
  canCollectStudentPayments,
  canViewStudentPayments,
} from '@/features/admin/students/utils/resolve-capabilities';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { CollectionUpdatedOverview } from '@/types/student-financial-overview';
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
  LEGACY_FINANCE_AGREEMENT_SECTION,
  parseStudentFinanceSubTab,
  studentFinanceSubTabLabelKey,
  STUDENT_FINANCE_SUB_TABS,
  type StudentFinanceSubTab,
} from '../utils/student-finance-sub-tab';
import {
  resolveFinanceTabLoadPhase,
  shouldShowFinanceEmptyState,
} from '../utils/finance-tab-loading';
import { resolveStudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';
import { StudentFinanceExecutiveSummary } from './student-finance-executive-summary';
import { StudentFinanceOverviewPanel } from './student-finance-overview-panel';
import { StudentFinanceFeesPanel } from './student-finance-fees-panel';
import { StudentFinanceSchedulePanel } from './student-finance-schedule-panel';
import { StudentFinanceCollectionsPanel } from './student-finance-collections-panel';
import { StudentFinanceChequesPanel } from './student-finance-cheques-panel';
import { StudentFinanceAdjustmentsPanel } from './student-finance-adjustments-panel';
import { StudentFinanceLedgerPanel } from './student-finance-ledger-panel';
import { StudentFinancialAgreementTab } from './student-financial-agreement-tab';
import { subscribeFinanceRefresh } from '@/lib/finance/finance-refresh-bus';

function resolveInitialSubTab(searchParams: URLSearchParams): StudentFinanceSubTab {
  const section = searchParams.get('section');
  if (section === LEGACY_FINANCE_AGREEMENT_SECTION) return 'agreements';
  return parseStudentFinanceSubTab(searchParams.get('financeSubTab'));
}

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubTab = resolveInitialSubTab(searchParams);
  const [subTab, setSubTab] = useState<StudentFinanceSubTab>(initialSubTab);
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const [financeRefreshSignal, setFinanceRefreshSignal] = useState(0);

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
    financeRefreshSignal,
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

  const overviewMetrics = useMemo(
    () => resolveStudentFinanceOverviewMetrics(financialOverviewState.data),
    [financialOverviewState.data],
  );

  const syncSubTabToUrl = useCallback(
    (next: StudentFinanceSubTab) => {
      setSubTab(next);
      const base = `/admin/students/${studentId}?tab=finance`;
      const href = next === 'overview' ? base : `${base}&financeSubTab=${next}`;
      router.replace(href, { scroll: false });
    },
    [router, studentId],
  );

  useEffect(() => {
    const fromUrl = resolveInitialSubTab(searchParams);
    setSubTab((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('collect') === '1' && canCollect) {
      setShowCollectionDrawer(true);
    }
  }, [searchParams, canCollect]);

  const refreshFinanceData = useCallback(() => {
    setFinanceRefreshSignal((n) => n + 1);
    workspaceState.reload();
    financialOverviewState.reload();
    onChanged?.();
  }, [workspaceState, financialOverviewState, onChanged]);

  useEffect(() => {
    return subscribeFinanceRefresh((detail) => {
      if (detail?.studentId && detail.studentId !== studentId) return;
      refreshFinanceData();
    });
  }, [studentId, refreshFinanceData]);

  const handleCollectionOverviewPatch = useCallback(
    (overview: CollectionUpdatedOverview) => {
      financialOverviewState.applyPatch(overview);
      setFinanceRefreshSignal((n) => n + 1);
      workspaceState.reload();
    },
    [financialOverviewState, workspaceState],
  );

  const emptyFinance =
    (financialOverviewState.data?.totals?.annual_total ?? 0) === 0 &&
    (financialOverviewState.data?.counts?.fees_count ?? 0) === 0 &&
    (workspace?.recent_collections?.length ?? 0) === 0;

  const showFinanceEmpty = shouldShowFinanceEmptyState({
    phase,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
    emptyFinance,
  });

  const contextActions = useMemo(() => {
    const actions: ReactNode[] = [];

    if (subTab !== 'schedule' && subTab !== 'agreements') {
      actions.push(
        <button
          key="schedule"
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => syncSubTabToUrl('schedule')}
        >
          {t('admin.student360.financeWorkspace.openSchedule')}
        </button>,
      );
    }

    if (subTab !== 'agreements') {
      actions.push(
        <button
          key="agreements"
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={() => syncSubTabToUrl('agreements')}
        >
          {t('admin.student360.financeWorkspace.actions.manageAgreement')}
        </button>,
      );
    }

    if (canCollect && subTab !== 'agreements' && subTab !== 'ledger') {
      actions.push(
        <button
          key="collect"
          type="button"
          className="btn btn--primary btn--sm"
          onClick={() => setShowCollectionDrawer(true)}
        >
          {t('admin.student360.financeWorkspace.actions.recordPayment')}
        </button>,
      );
    }

    return actions;
  }, [subTab, canCollect, syncSubTabToUrl, t]);

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
        {contextActions}
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
      financeRefreshSignal,
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
      refreshFinanceData,
      financeRefreshSignal,
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

  const sectionsWithoutEmptyGate: StudentFinanceSubTab[] = [
    'agreements',
    'cheques',
    'adjustments',
    'ledger',
  ];

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

      <StudentFinanceExecutiveSummary metrics={overviewMetrics} />

      <nav className="student-finance-subtabs" aria-label={t('admin.student360.financeWorkspace.tabsAria')}>
        {STUDENT_FINANCE_SUB_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={subTab === tab}
            className={`student-finance-subtabs__tab${subTab === tab ? ' is-active' : ''}`}
            onClick={() => syncSubTabToUrl(tab)}
          >
            {t(studentFinanceSubTabLabelKey(tab))}
          </button>
        ))}
      </nav>

      {showFinanceEmpty && !sectionsWithoutEmptyGate.includes(subTab) ? (
        <Student360CompactEmpty
          title={t('admin.student360.financeOps.emptyTitle')}
          description={t('admin.student360.financeOps.emptyDescription')}
        />
      ) : (
        <>
          {subTab === 'overview' ? <StudentFinanceOverviewPanel {...sharedPanelProps} /> : null}
          {subTab === 'fees' ? <StudentFinanceFeesPanel {...sharedPanelProps} /> : null}
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
          {subTab === 'schedule' ? <StudentFinanceSchedulePanel {...sharedPanelProps} /> : null}
          {subTab === 'collections' ? <StudentFinanceCollectionsPanel {...sharedPanelProps} /> : null}
          {subTab === 'cheques' ? <StudentFinanceChequesPanel {...sharedPanelProps} /> : null}
          {subTab === 'adjustments' ? <StudentFinanceAdjustmentsPanel {...sharedPanelProps} /> : null}
          {subTab === 'ledger' ? <StudentFinanceLedgerPanel /> : null}
        </>
      )}

      <StudentCollectionDrawer
        open={showCollectionDrawer}
        studentId={studentId}
        studentName={getStudentDisplayName(details.student)}
        studentCode={details.student.code ?? details.student.school_number ?? undefined}
        academicYearId={effectiveYearId ? Number(effectiveYearId) : undefined}
        billingProfileId={financialOverviewState.data?.billing_profile_id ?? undefined}
        billingPartnerId={
          financialOverviewState.data?.billing_profile?.billing_partner_id ?? undefined
        }
        financialOverview={financialOverviewState.data}
        onClose={() => setShowCollectionDrawer(false)}
        onSuccess={refreshFinanceData}
        onOverviewUpdate={handleCollectionOverviewPatch}
      />
    </div>
  );
}
