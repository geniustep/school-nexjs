'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiErrorView } from '@/components/states/states';
import { Student360PaymentEntry } from './student-360-payment-entry';
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
import { useAdminResource } from '@/lib/hooks/use-admin-resource';
import { endpoints } from '@/lib/api/endpoints';
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
import { StudentFinanceSchedulePanel } from './student-finance-schedule-panel';
import { StudentFinanceCollectionsPanel } from './student-finance-collections-panel';
import { StudentFinancialAgreementTab } from './student-financial-agreement-tab';
import { subscribeFinanceRefresh } from '@/lib/finance/finance-refresh-bus';
import { postAgreementAction } from '../api/finance-admin-api';
import { ChangePlanDrawer } from './change-plan-drawer';
import { InactiveAgreementFinanceBanner } from './inactive-agreement-finance-banner';
import { FinanceRepairCenterCard } from './finance-repair-center-card';
import { resolveChangePlanVisibility } from '../utils/resolve-change-plan-visibility';
import { AssignFinancePlanPanel } from './assign-finance-plan-panel';
import { FinanceSetupStatePanel } from './finance-setup-state-panel';
import { StudentFinanceAgreementContextPanel } from './student-finance-agreement-context-panel';
import { StudentFinanceOperationsHistoryPanel } from './student-finance-operations-history-panel';
import { resolveBillingContextPresentation } from '../utils/resolve-billing-context-presentation';
import { resolveBillingResponsibilityPresentation } from '../utils/resolve-billing-responsibility-presentation';
import { canChangeBillingAuthority } from '../utils/resolve-billing-authority-change-visibility';
import { resolveBillingPartyLabel } from '../utils/resolve-student-finance-overview';
import { BillingResponsibilityStatusBanner } from './billing-responsibility-status-banner';
import { BillingAuthorityChangeDialog } from './billing-authority-change-dialog';
import { resolveStudentFinanceActionState } from '../utils/resolve-student-finance-action-state';
import { resolveFinanceSetupState } from '../utils/resolve-finance-setup-state';
import type { FinancialAgreement } from '../types';
import type { ChangePlanMode } from '@/types/student-finance-change-plan';
import { useToast } from '@/components/ui/toast';

const FINANCE_TAB_GROUPS: { tabs: StudentFinanceSubTab[] }[] = [
  { tabs: ['overview'] },
  { tabs: ['agreements', 'schedule'] },
  { tabs: ['collections'] },
  { tabs: ['historical'] },
];

const FINANCE_TAB_ICONS: Record<StudentFinanceSubTab, string> = {
  overview: '◉',
  agreements: '✎',
  schedule: '▦',
  collections: '↗',
  historical: '◷',
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
  const [paymentEntryOpen, setPaymentEntryOpen] = useState(false);
  const [financeRefreshSignal, setFinanceRefreshSignal] = useState(0);
  const [draftSubmitLoading, setDraftSubmitLoading] = useState(false);
  const [changePlanMode, setChangePlanMode] = useState<ChangePlanMode | null>(null);
  const [billingAuthorityDialogOpen, setBillingAuthorityDialogOpen] = useState(false);

  const financeTabState = useStudentFinanceTabState(studentId, details);
  const {
    refState,
    academicYears,
    effectiveYearId,
    setSelectedYearId,
    workspaceState,
    workspace,
    isRefreshing,
  } = financeTabState;

  const financialOverviewState = useStudentFinancialOverview(
    studentId,
    effectiveYearId,
    !!effectiveYearId,
    financeRefreshSignal,
  );

  const agreementsListState = useAdminResource<FinancialAgreement[]>(
    effectiveYearId ? endpoints.admin.studentFinancialAgreements(studentId) : null,
    effectiveYearId ? { academic_year_id: Number(effectiveYearId) } : undefined,
  );
  const agreementsList = agreementsListState.data ?? null;

  const phase = resolveFinanceTabLoadPhase({
    yearsLoading: refState.loading,
    effectiveYearId,
    workspaceInitialLoading: workspaceState.initialLoading,
    agreementId: null,
    agreementDetailInitialLoading: false,
  });

  const financeCaps = (financialOverviewState.data?.capabilities ??
    workspace?.capabilities) as StudentFinanceCapabilities | undefined;
  const canViewPayments = canViewStudentPayments(capabilities, financeCaps);
  const canCollectCapability = canCollectStudentPayments(capabilities, financeCaps);
  const canAssignFeesCapability = canAssignStudentFees(capabilities, financeCaps);
  const canChangeBillingAuthorityAction = canChangeBillingAuthority(capabilities, financeCaps);

  const billingResponsibilityPresentation = useMemo(
    () =>
      resolveBillingResponsibilityPresentation({
        workspace,
        canSelectBillingResponsible: canChangeBillingAuthorityAction,
      }),
    [workspace, canChangeBillingAuthorityAction],
  );

  const billingContext = useMemo(
    () =>
      resolveBillingContextPresentation({
        workspace,
        canCollectCapability,
        canSelectBillingResponsible: canChangeBillingAuthorityAction,
      }),
    [workspace, canCollectCapability, canChangeBillingAuthorityAction],
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
        inactiveAgreement: workspace?.inactive_agreement ?? null,
        agreementsList,
        academicYearId: effectiveYearId ? Number(effectiveYearId) : null,
      }),
    [
      financialOverviewState.data,
      workspace?.current_agreement,
      workspace?.inactive_agreement,
      agreementsList,
      effectiveYearId,
    ],
  );

  const financeSetupState = useMemo(
    () =>
      resolveFinanceSetupState({
        workspace: workspace ?? null,
        financialOverview: financialOverviewState.data,
        agreementsList,
        inactiveAgreement: workspace?.inactive_agreement ?? null,
        academicYearId: effectiveYearId ? Number(effectiveYearId) : null,
        financialOverviewLoaded: !financialOverviewState.loading,
        agreementsListLoaded: !agreementsListState.loading,
        workspaceLoaded: !workspaceState.initialLoading,
      }),
    [
      workspace,
      financialOverviewState.data,
      financialOverviewState.loading,
      agreementsList,
      agreementsListState.loading,
      workspaceState.initialLoading,
      effectiveYearId,
    ],
  );

  const syncSubTabToUrl = useCallback(
    (next: StudentFinanceSubTab, extraQuery?: string) => {
      setSubTab(next);
      const base = `/admin/students/${studentId}?tab=finance`;
      let href = next === 'overview' ? base : `${base}&financeSubTab=${next}`;
      if (extraQuery) href += `&${extraQuery}`;
      router.replace(href, { scroll: false });
    },
    [router, studentId],
  );

  // Case B regularization: route into the agreements tab with an explicit query
  // so the tab surfaces the "create agreement from current installments" callout
  // instead of silently re-rendering the same agreements view.
  const goToAgreementsRegularize = useCallback(
    () => syncSubTabToUrl('agreements', 'agreementAction=regularize'),
    [syncSubTabToUrl],
  );

  useEffect(() => {
    const rawSubTab = searchParams.get('financeSubTab');
    const fromUrl = resolveInitialSubTab(searchParams);
    setSubTab((current) => (current === fromUrl ? current : fromUrl));
    // Rewrite removed sub-tab URLs (adjustments → agreements, ledger → historical).
    if (
      rawSubTab === 'fees' ||
      rawSubTab === 'adjustments' ||
      rawSubTab === 'ledger' ||
      rawSubTab === 'cheques'
    ) {
      const base = `/admin/students/${studentId}?tab=finance`;
      const href = fromUrl === 'overview' ? base : `${base}&financeSubTab=${fromUrl}`;
      router.replace(href, { scroll: false });
    }
  }, [searchParams, router, studentId]);

  useEffect(() => {
    if (searchParams.get('collect') !== '1') return;
    if (billingContext.collectPaymentAllowed) {
      setPaymentEntryOpen(true);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('collect');
    const query = params.toString();
    router.replace(query ? `/admin/students/${studentId}?${query}` : `/admin/students/${studentId}?tab=finance`, {
      scroll: false,
    });
  }, [searchParams, billingContext.collectPaymentAllowed, router, studentId]);

  const refreshFinanceData = useCallback(() => {
    setFinanceRefreshSignal((n) => n + 1);
    workspaceState.reload();
    financialOverviewState.reload();
    agreementsListState.reload();
    onChanged?.();
  }, [workspaceState, financialOverviewState, agreementsListState, onChanged]);

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

  const showFinanceEmpty = shouldShowFinanceEmptyState({
    phase,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
    emptyFinance:
      financeSetupState.kind !== 'active_agreement' &&
      (financeSetupState.kind === 'clean_no_finance' ||
        financeSetupState.kind === 'pre_active_agreement' ||
        financeSetupState.kind === 'assigned_fees_without_active_agreement' ||
        financeSetupState.kind === 'cancelled_or_inactive_agreement_with_fees' ||
        financeSetupState.kind === 'unknown_or_api_gap'),
  });

  const billingPartnerId = workspace?.finance_profile?.billing_partner?.id ?? null;
  const billingAuthorityLabel = resolveBillingPartyLabel({
    billingProfile: financialOverviewState.data?.billing_profile,
    billingPartyType: financialOverviewState.data?.billing_profile?.billing_party_type,
    t,
  });

  const changePlanVisibility = useMemo(
    () =>
      resolveChangePlanVisibility({
        workspace: workspace ?? null,
        financialOverview: financialOverviewState.data,
        studentCapabilities: capabilities,
        showManageAgreementBar: true,
        canCollect: canCollectCapability,
      }),
    [workspace, financialOverviewState.data, capabilities, canCollectCapability],
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

  const sectionsWithoutEmptyGate: StudentFinanceSubTab[] = useMemo(() => {
    const base: StudentFinanceSubTab[] = ['agreements', 'collections', 'historical'];
    if (financeSetupState.kind !== 'clean_no_finance' && financeSetupState.kind !== 'active_agreement') {
      return [...base, 'schedule', 'overview', 'collections'];
    }
    return base;
  }, [financeSetupState.kind]);

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
      shouldHideCollectButton={billingContext.shouldHideCollectButton}
      onOpenSchedule={() => syncSubTabToUrl('schedule')}
      onOpenAgreements={() => syncSubTabToUrl('agreements')}
      onRecordPayment={() => setPaymentEntryOpen(true)}
      showChangePlan={changePlanVisibility.showChangePlan && subTab !== 'agreements'}
      showReviewAgreement={changePlanVisibility.showReviewAgreement && subTab !== 'agreements'}
      reviewAgreementKind={changePlanVisibility.reviewAgreementKind}
      onReviewAgreement={() => syncSubTabToUrl('agreements')}
      onOpenChangePlan={() => setChangePlanMode('replace_if_unpaid')}
      changePlanHint={
        changePlanVisibility.paymentsExistHint
          ? t('admin.student360.financeWorkspace.changePlan.replace.paymentsExistHint')
          : t('admin.student360.financeWorkspace.changePlan.replace.actionHint')
      }
    />
  );

  const changePlanHint = changePlanVisibility.paymentsExistHint
    ? t('admin.student360.financeWorkspace.changePlan.replace.paymentsExistHint')
    : t('admin.student360.financeWorkspace.changePlan.replace.actionHint');

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
      onOpenCollection: () => setPaymentEntryOpen(true),
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
      <div className="student-finance-tab student-finance-workspace student-360-tab-panel">
        <div className="student-finance-workspace__shell">
          {workspaceHeader}
          <StudentFinanceSkeleton />
        </div>
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
      className={`student-finance-tab student-finance-workspace student-360-tab-panel${isRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}
    >
      <div className="student-finance-workspace__shell">
        {workspaceHeader}
        {isRefreshing ? <StudentInlineLoading /> : null}

        <BillingResponsibilityStatusBanner
          presentation={billingResponsibilityPresentation}
          onSelectResponsible={
            canChangeBillingAuthorityAction
              ? () => setBillingAuthorityDialogOpen(true)
              : undefined
          }
        />

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
        onRegularizeAgreement={goToAgreementsRegularize}
        onOpenSchedule={() => syncSubTabToUrl('schedule')}
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
          <div className="student-finance-subtabs__rail">
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
              </div>
            ))}
          </div>
          <p className="student-finance-subtabs__scroll-hint">
            {t('admin.student360.financeWorkspace.subtabsScrollHint')}
          </p>
        </nav>
      </div>

      <div className="student-finance-workspace__panel">
      {showFinanceEmpty && !sectionsWithoutEmptyGate.includes(subTab) ? (
        financeSetupState.kind === 'clean_no_finance' && canAssignFeesCapability ? (
          <AssignFinancePlanPanel
            studentId={studentId}
            academicYearId={effectiveYearId}
            studentLabel={getStudentDisplayName(details.student)}
            setupState={financeSetupState}
            enrollmentEditHref={`/admin/students/${studentId}?tab=enrollment`}
            onAssigned={refreshFinanceData}
            onOpenSchedule={() => syncSubTabToUrl('schedule')}
            onOpenAgreements={() => syncSubTabToUrl('agreements')}
            onOpenOverview={() => syncSubTabToUrl('overview')}
          />
        ) : financeSetupState.kind !== 'active_agreement' ? (
          <FinanceSetupStatePanel
            studentId={studentId}
            setupState={financeSetupState}
            onReviewDraft={() => syncSubTabToUrl('agreements')}
            onOpenAgreements={() => syncSubTabToUrl('agreements')}
            onOpenSchedule={() => syncSubTabToUrl('schedule')}
            onOpenOverview={() => syncSubTabToUrl('overview')}
          />
        ) : canAssignFeesCapability ? (
          <AssignFinancePlanPanel
            studentId={studentId}
            academicYearId={effectiveYearId}
            studentLabel={getStudentDisplayName(details.student)}
            setupState={financeSetupState}
            enrollmentEditHref={`/admin/students/${studentId}?tab=enrollment`}
            onAssigned={refreshFinanceData}
            onOpenSchedule={() => syncSubTabToUrl('schedule')}
            onOpenAgreements={() => syncSubTabToUrl('agreements')}
            onOpenOverview={() => syncSubTabToUrl('overview')}
          />
        ) : (
          <Student360CompactEmpty
            className="student-360-compact-empty--finance"
            title={t('admin.student360.financeOps.emptyTitle')}
            description={t('admin.student360.financeOps.emptyDescription')}
          />
        )
      ) : (
        <>
          {subTab === 'overview' ? (
            <>
              <FinanceRepairCenterCard
                studentId={studentId}
                currencyName={workspace?.summary?.currency?.name ?? null}
                refreshSignal={financeRefreshSignal}
                onRepaired={refreshFinanceData}
              />
              <StudentFinanceAgreementContextPanel
                studentId={studentId}
                details={details}
                workspace={workspace}
                financialOverview={financialOverviewState.data}
                agreement={workspace?.current_agreement ?? null}
                collectBlockReason={billingContext.collectBlockReason}
                onOpenAgreements={() => syncSubTabToUrl('agreements')}
                onCreateAgreement={() => syncSubTabToUrl('agreements')}
                onRefresh={refreshFinanceData}
              />
              <StudentFinanceOverviewPanel {...sharedPanelProps} />
            </>
          ) : null}
          {subTab === 'agreements' ? (
            <StudentFinancialAgreementTab
              studentId={studentId}
              details={details}
              capabilities={capabilities}
              financialOverview={financialOverviewState.data}
              onChanged={() => refreshFinanceData()}
              embedded
              embeddedTabState={financeTabState}
              showChangePlan={changePlanVisibility.showChangePlan}
              onOpenChangePlan={() => setChangePlanMode('replace_if_unpaid')}
              changePlanHint={changePlanHint}
            />
          ) : null}
          {subTab === 'schedule' ? <StudentFinanceSchedulePanel {...sharedPanelProps} /> : null}
          {subTab === 'collections' ? <StudentFinanceCollectionsPanel {...sharedPanelProps} /> : null}
          {subTab === 'historical' ? (
            <StudentFinanceOperationsHistoryPanel workspace={workspace} />
          ) : null}
        </>
      )}
      </div>

      <Student360PaymentEntry
        open={paymentEntryOpen}
        studentId={studentId}
        details={details}
        academicYearId={effectiveYearId ? Number(effectiveYearId) : undefined}
        billingProfileId={financialOverviewState.data?.billing_profile_id ?? undefined}
        billingPartnerId={
          financialOverviewState.data?.billing_profile?.billing_partner_id ?? billingPartnerId
        }
        financialOverview={financialOverviewState.data}
        onOpenChange={setPaymentEntryOpen}
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
          paymentsExistHint={changePlanVisibility.paymentsExistHint}
          onClose={() => setChangePlanMode(null)}
          onNavigateToAgreements={() => {
            setChangePlanMode(null);
            syncSubTabToUrl('agreements');
          }}
          onSuccess={refreshFinanceData}
        />
      ) : null}

      <BillingAuthorityChangeDialog
        open={billingAuthorityDialogOpen}
        studentId={studentId}
        details={details}
        currentAuthorityName={billingAuthorityLabel}
        onClose={() => setBillingAuthorityDialogOpen(false)}
        onSuccess={() => {
          setBillingAuthorityDialogOpen(false);
          refreshFinanceData();
        }}
      />
    </div>
  );
}
