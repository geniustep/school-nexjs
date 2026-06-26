'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { StudentCollectionDrawer } from '@/features/admin/finance/student-collection-drawer';
import { useT } from '@/features/i18n/locale-context';
import { getStudentDisplayName } from '@/lib/utils/student';
import {
  canAssignStudentFees,
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
} from '@/features/admin/students/components/student-360-loading';
import { StudentFinanceWorkspaceHeader } from './student-finance-workspace-header';
import { useStudentFinanceTabState } from '../hooks/use-student-finance-tab-state';
import { useStudentFinancialOverview } from '../hooks/use-student-financial-overview';
import {
  LEGACY_FINANCE_AGREEMENT_SECTION,
  parseStudentFinanceSubTab,
  studentFinanceSubTabLabelKey,
  type StudentFinanceSubTab,
} from '../utils/student-finance-sub-tab';
import {
  resolveFinanceTabLoadPhase,
  shouldShowFinanceEmptyState,
} from '../utils/finance-tab-loading';
import { resolveStudentFinanceOverviewMetrics } from '../utils/resolve-student-finance-overview';
import { resolveDraftAgreementPresentation } from '../utils/resolve-draft-agreement-presentation';
import { StudentFinanceExecutiveSummary } from './student-finance-executive-summary';
import { DraftAgreementFinanceBanner } from './draft-agreement-finance-banner';
import { StudentFinanceOverviewPanel } from './student-finance-overview-panel';
import { StudentFinanceFeesPanel } from './student-finance-fees-panel';
import { StudentFinanceSchedulePanel } from './student-finance-schedule-panel';
import { StudentFinanceCollectionsPanel } from './student-finance-collections-panel';
import { StudentFinanceChequesPanel } from './student-finance-cheques-panel';
import { StudentFinanceAdjustmentsPanel } from './student-finance-adjustments-panel';
import { StudentFinanceLedgerPanel } from './student-finance-ledger-panel';
import { StudentFinancialAgreementTab } from './student-financial-agreement-tab';
import { subscribeFinanceRefresh } from '@/lib/finance/finance-refresh-bus';
import { postAgreementAction } from '../api/finance-admin-api';
import { ChangePlanDrawer } from './change-plan-drawer';
import { InactiveAgreementFinanceBanner } from './inactive-agreement-finance-banner';
import { resolveChangePlanVisibility } from '../utils/resolve-change-plan-visibility';
import { AssignFinancePlanPanel } from './assign-finance-plan-panel';
import { resolveBillingContextPresentation } from '../utils/resolve-billing-context-presentation';
import { resolveStudentFinanceActionState } from '../utils/resolve-student-finance-action-state';
import type { ChangePlanMode } from '@/types/student-finance-change-plan';
import { useToast } from '@/components/ui/toast';

const FINANCE_TAB_GROUPS: { tabs: StudentFinanceSubTab[]; dividerAfter?: boolean }[] = [
  { tabs: ['overview'], dividerAfter: true },
  { tabs: ['fees', 'agreements', 'schedule'], dividerAfter: true },
  { tabs: ['collections', 'cheques'], dividerAfter: true },
  { tabs: ['adjustments', 'ledger'] },
];

const FINANCE_TAB_ICONS: Record<StudentFinanceSubTab, string> = {
  overview: '◉',
  fees: '▤',
  agreements: '✎',
  schedule: '▦',
  collections: '↗',
  cheques: '☰',
  adjustments: '±',
  ledger: '≡',
};

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
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialSubTab = resolveInitialSubTab(searchParams);
  const [subTab, setSubTab] = useState<StudentFinanceSubTab>(initialSubTab);
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const [financeRefreshSignal, setFinanceRefreshSignal] = useState(0);
  const [draftSubmitLoading, setDraftSubmitLoading] = useState(false);
  const [changePlanMode, setChangePlanMode] = useState<ChangePlanMode | null>(null);

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
  const canCollectCapability = canCollectStudentPayments(capabilities, financeCaps);
  const canAssignFeesCapability = canAssignStudentFees(capabilities, financeCaps);

  const billingContext = useMemo(
    () =>
      resolveBillingContextPresentation({
        workspace,
        canCollectCapability,
      }),
    [workspace, canCollectCapability],
  );

  const overviewMetrics = useMemo(
    () => resolveStudentFinanceOverviewMetrics(financialOverviewState.data),
    [financialOverviewState.data],
  );

  const draftPresentation = useMemo(
    () =>
      resolveDraftAgreementPresentation({
        financialOverview: financialOverviewState.data,
        workspaceAgreement: workspace?.current_agreement ?? null,
      }),
    [financialOverviewState.data, workspace?.current_agreement],
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
    if (searchParams.get('collect') === '1' && billingContext.collectPaymentAllowed) {
      setShowCollectionDrawer(true);
    }
  }, [searchParams, billingContext.collectPaymentAllowed]);

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
    (workspace?.recent_collections?.length ?? 0) === 0 &&
    !draftPresentation.hasDraftAgreement;

  const showFinanceEmpty = shouldShowFinanceEmptyState({
    phase,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
    emptyFinance,
  });

  const billingPartnerId = workspace?.finance_profile?.billing_partner?.id ?? null;

  const changePlanVisibility = useMemo(
    () =>
      resolveChangePlanVisibility({
        workspace: workspace ?? null,
        financialOverview: financialOverviewState.data,
        studentCapabilities: capabilities,
        showManageAgreementBar: subTab !== 'agreements',
        canCollect: canCollectCapability,
      }),
    [workspace, financialOverviewState.data, capabilities, subTab, canCollectCapability],
  );

  const financeActionState = useMemo(
    () =>
      resolveStudentFinanceActionState({
        workspace: workspace ?? null,
        financialOverview: financialOverviewState.data,
        draftPresentation,
        billingContext,
        eligibility: changePlanVisibility.eligibility,
        inactiveAgreement: changePlanVisibility.inactiveAgreement,
      }),
    [workspace, financialOverviewState.data, draftPresentation, billingContext, changePlanVisibility],
  );

  const workspaceHeader = (
    <StudentFinanceWorkspaceHeader
      studentId={studentId}
      academicYears={academicYears}
      effectiveYearId={effectiveYearId}
      yearsLoading={refState.loading}
      onYearChange={setSelectedYearId}
      billingPartnerId={billingPartnerId}
      subTab={subTab}
      canCollect={canCollectCapability}
      allowInstallmentCollection={financeActionState.shouldAllowInstallmentCollection}
      collectPaymentAllowed={
        billingContext.collectPaymentAllowed && financeActionState.shouldAllowInstallmentCollection
      }
      collectBlockMessage={
        draftPresentation.hasDraftAgreement && !billingContext.collectPaymentAllowed
          ? t('admin.student360.financeWorkspace.collectPayment.blockedDraftMessage')
          : billingContext.collectBlockMessage ??
            (billingContext.collectBlockMessageKey ? t(billingContext.collectBlockMessageKey) : null)
      }
      onOpenSchedule={() => syncSubTabToUrl('schedule')}
      onOpenAgreements={() => syncSubTabToUrl('agreements')}
      onRecordPayment={() => setShowCollectionDrawer(true)}
      showChangePlan={changePlanVisibility.showChangePlan}
      showSpecialAdjustment={changePlanVisibility.showSpecialAdjustment}
      showReviewAgreement={changePlanVisibility.showReviewAgreement && subTab !== 'agreements'}
      reviewAgreementKind={changePlanVisibility.reviewAgreementKind}
      onReviewAgreement={() => syncSubTabToUrl('agreements')}
      onOpenChangePlan={() => setChangePlanMode('replace_if_unpaid')}
      onOpenSpecialAdjustment={() => setChangePlanMode('social_discount_on_future_installments')}
    />
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
      canCollect: canCollectCapability,
      onRefresh: refreshFinanceData,
      onOpenCollection: () => setShowCollectionDrawer(true),
      financeRefreshSignal,
      scheduleMode: financeActionState.scheduleMode,
      allowInstallmentCollection: financeActionState.shouldAllowInstallmentCollection,
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
      canCollectCapability,
      refreshFinanceData,
      financeRefreshSignal,
      financeActionState.scheduleMode,
      financeActionState.shouldAllowInstallmentCollection,
    ],
  );

  if (phase !== 'ready') {
    return (
      <div className="student-finance-tab student-360-tab-panel">
        {workspaceHeader}
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
      className={`student-finance-tab student-finance-workspace student-360-tab-panel${isRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}
    >
      {workspaceHeader}
      {isRefreshing ? <StudentInlineLoading /> : null}

      <DraftAgreementFinanceBanner
        studentId={studentId}
        presentation={draftPresentation}
        actionState={financeActionState}
        financialOverview={financialOverviewState.data}
        onOpenAgreement={() => syncSubTabToUrl('agreements')}
        submitLoading={draftSubmitLoading}
        onSubmitAgreement={
          financeActionState.canActivateAgreement && draftPresentation.agreementId
            ? async () => {
                setDraftSubmitLoading(true);
                const res = await postAgreementAction(draftPresentation.agreementId as number, 'submit');
                setDraftSubmitLoading(false);
                if (!res.success) {
                  toast.error(res.error.message);
                  return;
                }
                toast.success(t('admin.student360.financialAgreement.actions.submitSuccess'));
                refreshFinanceData();
              }
            : undefined
        }
      />

      <InactiveAgreementFinanceBanner
        presentation={
          subTab === 'agreements'
            ? { ...changePlanVisibility.inactiveAgreement, showWorkspaceBanner: false }
            : changePlanVisibility.inactiveAgreement
        }
        actionState={financeActionState}
        billingContext={billingContext}
        inactiveAgreementState={workspace?.inactive_agreement?.state ?? null}
        onReviewAgreement={() => syncSubTabToUrl('agreements')}
        onCreateAgreement={() => syncSubTabToUrl('agreements')}
      />

      {financeActionState.shouldSuppressExecutiveAmounts ? null : (
        <StudentFinanceExecutiveSummary
          metrics={overviewMetrics}
          chequeSummary={financialOverviewState.data?.cheque_summary ?? null}
          billingContextHeadlineKey={
            financeActionState.showExecutiveContextHeadline
              ? billingContext.billingContextHeadlineKey
              : null
          }
          billingContextMessage={billingContext.billingContextMessage}
        />
      )}

      <nav className="student-finance-subtabs" aria-label={t('admin.student360.financeWorkspace.tabsAria')}>
        {FINANCE_TAB_GROUPS.map((group, groupIndex) => (
          <div key={`group-${groupIndex}`} className="student-finance-subtabs__group">
            {group.tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={subTab === tab}
                data-tab={tab}
                className={`student-finance-subtabs__tab${subTab === tab ? ' is-active' : ''}`}
                onClick={() => syncSubTabToUrl(tab)}
              >
                <span className="student-finance-subtabs__icon" aria-hidden="true">
                  {FINANCE_TAB_ICONS[tab]}
                </span>
                <span className="student-finance-subtabs__label">{t(studentFinanceSubTabLabelKey(tab))}</span>
              </button>
            ))}
            {group.dividerAfter ? (
              <span className="student-finance-subtabs__divider" aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </nav>

      <div className="student-finance-workspace__panel">
      {showFinanceEmpty && !sectionsWithoutEmptyGate.includes(subTab) ? (
        canAssignFeesCapability ? (
          <AssignFinancePlanPanel
            studentId={studentId}
            academicYearId={effectiveYearId}
            enrollmentEditHref={`/admin/students/${studentId}?tab=enrollment`}
            onAssigned={refreshFinanceData}
          />
        ) : (
          <Student360CompactEmpty
            title={t('admin.student360.financeOps.emptyTitle')}
            description={t('admin.student360.financeOps.emptyDescription')}
          />
        )
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
      </div>

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

      {changePlanMode ? (
        <ChangePlanDrawer
          open
          mode={changePlanMode}
          studentId={studentId}
          academicYearId={effectiveYearId}
          levelId={details.student.level?.id ?? null}
          eligibility={changePlanVisibility.eligibility}
          onClose={() => setChangePlanMode(null)}
          onSuccess={refreshFinanceData}
        />
      ) : null}
    </div>
  );
}
