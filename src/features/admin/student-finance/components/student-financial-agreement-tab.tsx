'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ApiErrorView } from '@/components/states/states';
import { DataTable, type Column } from '@/components/tables/data-table';
import { Card } from '@/components/ui/primitives';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import { FinanceMoney } from '@/features/admin/finance/finance-money';
import { useFormat } from '@/features/i18n/use-format';
import { useT } from '@/features/i18n/locale-context';
import { refName } from '@/lib/utils/finance';
import type { StudentCapabilities, StudentDetailsData } from '@/types/student-360';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement } from '../types';
import { Student360CompactEmpty } from '@/features/admin/students/components/student-360-compact-empty';
import {
  StudentAgreementSkeleton,
  StudentInlineLoading,
  StudentYearSelectSkeleton,
} from '@/features/admin/students/components/student-360-loading';
import { Student360MetricGrid } from '@/features/admin/students/components/student-360-metric-grid';
import { Student360SectionHeader } from '@/features/admin/students/components/student-360-section-header';
import { relationshipTypeLabel } from '@/features/admin/students/utils/relationship-types';
import { canAssignStudentFees } from '@/features/admin/students/utils/resolve-capabilities';
import type { StudentFinanceCapabilities } from '@/types/student-finance';
import {
  postAgreementAction,
  createAgreementFromCurrentFees,
  deleteAgreementAdjustment,
} from '../api/finance-admin-api';
import { AssignFinancePlanPanel } from './assign-finance-plan-panel';
import { FinanceSetupStatePanel } from './finance-setup-state-panel';
import { resolveFinanceSetupState } from '../utils/resolve-finance-setup-state';
import { isCreateFromCurrentFeesActionAllowed } from '../utils/resolve-create-from-current-fees-action';
import { AgreementCreateDrawer } from './agreement-create-drawer';
import { AgreementFromFeesDrawer } from './agreement-from-fees-drawer';
import { AgreementAdjustmentDrawer } from './agreement-adjustment-drawer';
import { StudentFinanceAssignFeeDrawer } from '@/features/admin/students/components/student-finance-assign-fee-drawer';
import { CancelFutureInstallmentsDrawer } from './cancel-future-installments-drawer';
import { ServiceCategoryDetailsList } from './service-category-details-list';
import { AgreementStateBadge } from './agreement-state-badge';
import { ScheduleItemStateBadge } from './cheque-dual-badges';
import { useFinancialAgreement } from '../hooks/use-financial-agreement';
import { useStudentFinanceTabState } from '../hooks/use-student-finance-tab-state';
import type { AgreementScheduleItem, FinancialAgreementLine } from '../types';
import { formatPeriodRange } from '../utils/format-period';
import { agreementLineCategoryDetails } from '../utils/service-category-details';
import {
  hasAgreementData,
  isInactiveAgreementState,
  resolveAdjustmentPolicyLabel,
  resolveAdjustmentTypeLabel,
  resolveFinanceAgreementStateLabel,
  resolveReferenceLabel,
  resolveServiceDisplayName,
} from '../utils/reference-labels';
import {
  resolveAgreementFinanceSummary,
  resolveDraftAgreementPresentation,
} from '../utils/resolve-draft-agreement-presentation';
import { buildAgreementSummaryCards } from '../utils/build-agreement-summary-cards';
import { AgreementEnrollmentCustomizationsSection } from './agreement-enrollment-customizations-section';
import { hasFinanceSummaryMetrics } from '../utils/normalize-student-finance-workspace';
import {
  resolveFinanceTabLoadPhase,
  shouldShowAgreementEmptyState,
} from '../utils/finance-tab-loading';
import { resolveStudentBillingSourcePresentation } from '../utils/resolve-student-billing-source-presentation';
import { resolveChangePlanEligibility } from '../utils/resolve-change-plan-eligibility';
import { resolveBillingContextPresentation } from '../utils/resolve-billing-context-presentation';
import {
  createAgreementFromCurrentFeesErrorMessageKey,
  isCreateAgreementFromCurrentFeesDuplicateError,
  readCreateAgreementFromCurrentFeesAgreementId,
} from '../utils/create-agreement-from-current-fees-errors';
import {
  canCompleteDraftAgreement,
  isEmptyManualDraftAgreement,
} from '../utils/resolve-empty-manual-draft-action';
import {
  isOrphanCurrentFeesDraft,
  resolveExistingCurrentFeesDraft,
} from '../utils/resolve-existing-current-fees-draft';
import { FamilyPlanContextCard } from './family-plan-context-card';
import { AgreementDraftCustomizationSection } from './agreement-draft-customization-section';
import { ParallelDraftAgreementsBanner } from './parallel-draft-agreements-banner';
import { resolveParallelDraftAgreementsPresentation } from '../utils/resolve-parallel-draft-agreements';
import { isAgreementEditableBeforeActivation } from '../utils/resolve-agreement-draft-customization';
import {
  buildAgreementActionExecutionPlan,
  logAgreementActionBlocked,
  resolveAgreementActionErrorMessage,
} from '../utils/agreement-workflow-action';

export function StudentFinancialAgreementTab({
  studentId,
  details,
  capabilities,
  onChanged,
  onOpenGuardians,
  financialOverview,
  embedded = false,
}: {
  studentId: number;
  details: StudentDetailsData;
  capabilities: StudentCapabilities;
  onChanged: () => void;
  onOpenGuardians?: () => void;
  financialOverview?: StudentFinancialOverview | null;
  embedded?: boolean;
}) {
  const t = useT();
  const toast = useToast();
  const { formatDate } = useFormat();
  const {
    refState,
    academicYears,
    effectiveYearId,
    setSelectedYearId,
    workspaceState,
    workspace,
    isRefreshing,
  } = useStudentFinanceTabState(studentId, details);
  const [showCreate, setShowCreate] = useState(false);
  const [showFromFees, setShowFromFees] = useState(false);
  const [showAssignFeePlan, setShowAssignFeePlan] = useState(false);
  const [showCancelFuture, setShowCancelFuture] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [createFromFeesNotice, setCreateFromFeesNotice] = useState<string | null>(null);
  const [focusCurrentFeesDraft, setFocusCurrentFeesDraft] = useState(false);
  const currentFeesDraftReviewRef = useRef<HTMLElement | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<{
    action: 'submit' | 'approve' | 'activate' | 'cancel';
    title: string;
    body: string;
    agreementId?: number;
  } | null>(null);

  const agreementId = workspace?.current_agreement?.id ?? null;
  const agreementState = useFinancialAgreement(agreementId, !!agreementId);
  const agreement = agreementState.data ?? workspace?.current_agreement ?? null;

  const existingCurrentFeesDraft = useMemo(
    () =>
      resolveExistingCurrentFeesDraft({
        workspace,
        financialOverview,
        workspaceAgreement: agreement,
        academicYearId: effectiveYearId ? Number(effectiveYearId) : null,
      }),
    [workspace, financialOverview, agreement, effectiveYearId],
  );

  const orphanCurrentFeesDraftId =
    existingCurrentFeesDraft &&
    isOrphanCurrentFeesDraft({
      draft: existingCurrentFeesDraft,
      displayedAgreement: agreement,
    })
      ? existingCurrentFeesDraft.id
      : null;

  const reviewDraftState = useFinancialAgreement(orphanCurrentFeesDraftId, !!orphanCurrentFeesDraftId);

  // Load full detail when the workspace exposes an actionable inactive agreement
  // (draft / pending_approval / approved) so the UI can surface action buttons.
  const inactiveDraftId =
    workspace?.inactive_agreement != null &&
    typeof workspace.inactive_agreement.id === 'number' &&
    (workspace.inactive_agreement.state === 'draft' ||
      workspace.inactive_agreement.state === 'pending_approval' ||
      workspace.inactive_agreement.state === 'approved')
      ? workspace.inactive_agreement.id
      : null;
  const inactiveDraftDetailState = useFinancialAgreement(inactiveDraftId, !!inactiveDraftId);

  const allowed = agreement?.allowed_actions ?? workspace?.allowed_actions ?? {};
  const displayAgreement =
    hasAgreementData(agreement) ? agreement : inactiveDraftDetailState.data ?? null;
  const displayAllowed = displayAgreement?.allowed_actions ?? allowed;
  const currency = displayAgreement?.currency ?? agreement?.currency ?? workspace?.summary?.currency;

  const phase = resolveFinanceTabLoadPhase({
    yearsLoading: refState.loading,
    effectiveYearId,
    workspaceInitialLoading: workspaceState.initialLoading,
    agreementId: agreementId ?? inactiveDraftId,
    agreementDetailInitialLoading:
      (agreementId ? agreementState.initialLoading : false) ||
      (inactiveDraftId ? inactiveDraftDetailState.initialLoading : false),
  });

  const showAgreementEmpty = shouldShowAgreementEmptyState({
    phase,
    agreement: displayAgreement,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
  });

  const isBackgroundRefreshing = isRefreshing || agreementState.fetching;

  const canCreate = allowed.create_agreement === true;
  const canCustomizeAgreement = isAgreementEditableBeforeActivation(
    displayAgreement?.state,
    displayAllowed,
  );

  const refreshAll = useCallback(() => {
    workspaceState.reload();
    agreementState.reload();
    if (orphanCurrentFeesDraftId) reviewDraftState.reload();
    if (inactiveDraftId) inactiveDraftDetailState.reload();
    onChanged();
  }, [workspaceState, agreementState, orphanCurrentFeesDraftId, reviewDraftState, inactiveDraftId, inactiveDraftDetailState, onChanged]);

  const billingContext = useMemo(
    () => resolveBillingContextPresentation({ workspace }),
    [workspace],
  );

  const financeSetupState = useMemo(
    () =>
      resolveFinanceSetupState({
        workspace: workspace ?? null,
        financialOverview: financialOverview ?? null,
        inactiveAgreement: workspace?.inactive_agreement ?? null,
        academicYearId: effectiveYearId ? Number(effectiveYearId) : null,
        financialOverviewLoaded: true,
        agreementsListLoaded: true,
        workspaceLoaded: !workspaceState.initialLoading,
      }),
    [workspace, financialOverview, effectiveYearId, workspaceState.initialLoading],
  );

  // The legacy "create agreement from current fees" flow is only surfaced when
  // the backend explicitly allows it. For students without an agreement the
  // primary path is "إعداد الخطة المالية" (assign finance plan), so the legacy
  // creation button stays hidden to avoid an unnecessary 422.
  const createFromFeesAllowed = isCreateFromCurrentFeesActionAllowed({ workspace });
  const showCreateFromFeesAction = !billingContext.hasActiveAgreement && canCreate;
  const canAssignFees = canAssignStudentFees(
    capabilities,
    (workspace?.capabilities as StudentFinanceCapabilities | undefined) ?? null,
  );

  const scrollToCurrentFeesDraftReview = useCallback(() => {
    setFocusCurrentFeesDraft(true);
    currentFeesDraftReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => setFocusCurrentFeesDraft(false), 2400);
  }, []);

  const handleCreateAgreementFromCurrentFees = useCallback(async () => {
    if (existingCurrentFeesDraft) {
      scrollToCurrentFeesDraftReview();
      return;
    }
    const yearId = effectiveYearId ? Number(effectiveYearId) : undefined;
    setActionLoading('create-from-fees');
    setCreateFromFeesNotice(null);
    const res = await createAgreementFromCurrentFees(studentId, yearId);
    setActionLoading(null);
    if (!res.success) {
      const message = t(createAgreementFromCurrentFeesErrorMessageKey(res.error.code));
      if (isCreateAgreementFromCurrentFeesDuplicateError(res.error.code)) {
        const duplicateId = readCreateAgreementFromCurrentFeesAgreementId(res.error);
        setCreateFromFeesNotice(
          duplicateId != null
            ? `${message} (#${duplicateId})`
            : message,
        );
        toast.show(message, 'info');
        refreshAll();
        return;
      }
      toast.error(message);
      return;
    }
    toast.success(t('admin.student360.financialAgreement.fromFees.success'));
    refreshAll();
  }, [effectiveYearId, existingCurrentFeesDraft, scrollToCurrentFeesDraftReview, studentId, t, toast, refreshAll]);

  const handleDuplicateDraftFromFees = useCallback(
    (agreementId: number | null, message: string) => {
      setCreateFromFeesNotice(agreementId != null ? `${message} (#${agreementId})` : message);
      refreshAll();
    },
    [refreshAll],
  );

  const renderCurrentFeesDraftCta = (className = 'btn btn--primary btn--sm') => {
    // Reviewing an existing draft created from current fees is always safe to
    // surface — it never calls the legacy creation endpoint.
    if (existingCurrentFeesDraft) {
      if (
        !isOrphanCurrentFeesDraft({
          draft: existingCurrentFeesDraft,
          displayedAgreement: agreement,
        })
      ) {
        return null;
      }

      return (
        <button type="button" className={className} onClick={scrollToCurrentFeesDraftReview}>
          {t('admin.student360.financialAgreement.fromFees.reviewDraftButton', {
            id: String(existingCurrentFeesDraft.id),
          })}
        </button>
      );
    }

    // Legacy creation: only when there is no active agreement AND the backend
    // explicitly allows creating an agreement from current fees.
    if (!showCreateFromFeesAction || !createFromFeesAllowed) return null;

    return (
      <button
        type="button"
        className={className}
        disabled={actionLoading === 'create-from-fees'}
        onClick={() => void handleCreateAgreementFromCurrentFees()}
      >
        {actionLoading === 'create-from-fees'
          ? t('common.saving')
          : t('admin.student360.financialAgreement.fromFees.createButton')}
      </button>
    );
  };

  const renderCurrentFeesDraftReviewPanel = () => {
    if (!orphanCurrentFeesDraftId || !existingCurrentFeesDraft) return null;

    const reviewDraft = reviewDraftState.data;
    const reviewAllowed = reviewDraft?.allowed_actions ?? {};
    const reviewBillingPartner = reviewDraft?.billing_partner ?? workspace?.billing_partner;
    const agreementReturnTo = `/admin/students/${studentId}?tab=finance&financeSubTab=agreements`;

    return (
      <section
        ref={currentFeesDraftReviewRef}
        id="current-fees-draft-review"
        className={`student-finance-section student-finance-current-fees-draft-review${focusCurrentFeesDraft ? ' is-focused' : ''}`}
      >
        <Card className="student-finance-current-fees-draft-review__card">
          <Student360SectionHeader
            title={t('admin.student360.financialAgreement.fromFees.currentFeesDraftPanelTitle')}
          />
          <p className="muted">{t('admin.student360.financialAgreement.fromFees.currentFeesDraftPanelDesc')}</p>
          <p className="student-finance-current-fees-draft-review__notice">
            {t('admin.student360.financialAgreement.fromFees.errors.draftAlreadyExists')}{' '}
            {t('admin.student360.financialAgreement.fromFees.errors.draftAlreadyExistsHint')}
          </p>
          <dl className="detail-list student-finance-agreement-meta">
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.number')}</dt>
              <dd className="mono">
                #{existingCurrentFeesDraft.id}
                {reviewDraft?.number || reviewDraft?.name
                  ? ` · ${reviewDraft.number ?? reviewDraft.name}`
                  : existingCurrentFeesDraft.number || existingCurrentFeesDraft.name
                    ? ` · ${existingCurrentFeesDraft.number ?? existingCurrentFeesDraft.name}`
                    : ''}
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.state')}</dt>
              <dd>
                <AgreementStateBadge state="draft" />
              </dd>
            </div>
            {reviewDraft?.net_amount != null ? (
              <div>
                <dt>{t('admin.student360.financialAgreement.summary.netTotal')}</dt>
                <dd>
                  <FinanceMoney amount={reviewDraft.net_amount} currency={reviewDraft.currency?.name ?? currency?.name} />
                </dd>
              </div>
            ) : null}
          </dl>
          {reviewDraftState.loading ? <StudentInlineLoading /> : null}
          {reviewDraftState.error ? (
            <ApiErrorView error={reviewDraftState.error} onRetry={reviewDraftState.reload} />
          ) : null}
          <div className="row student-finance-current-fees-draft-review__actions">
            <Link
              href={`/admin/finance/agreements/${orphanCurrentFeesDraftId}?returnTo=${encodeURIComponent(agreementReturnTo)}`}
              className="btn btn--primary btn--sm"
            >
              {t('admin.student360.financialAgreement.fromFees.completeApprovalWorkflow')}
            </Link>
            {reviewAllowed.submit ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={actionLoading === 'submit'}
                onClick={() =>
                  requestReviewDraftAction('submit', 'admin.student360.financialAgreement.confirmSubmit')
                }
              >
                {t('admin.student360.financialAgreement.actions.submit')}
              </button>
            ) : null}
            {reviewAllowed.approve ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={actionLoading === 'approve'}
                onClick={() =>
                  requestReviewDraftAction('approve', 'admin.student360.financialAgreement.confirmApprove')
                }
              >
                {t('admin.student360.financialAgreement.actions.approve')}
              </button>
            ) : null}
            {reviewAllowed.activate && reviewDraft ? (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                disabled={actionLoading === 'activate'}
                onClick={() =>
                  requestReviewDraftActivate(reviewDraft, refName(reviewBillingPartner) ?? '—')
                }
              >
                {t('admin.student360.financialAgreement.actions.activate')}
              </button>
            ) : null}
          </div>
        </Card>
      </section>
    );
  };

  const renderCreateFromFeesNotice = () =>
    createFromFeesNotice ? (
      <div className="student-finance-card-alert student-finance-create-from-fees-notice" role="status">
        <p>{createFromFeesNotice}</p>
      </div>
    ) : null;

  const renderCompleteDraftAction = (
    draftTarget: Parameters<typeof canCompleteDraftAgreement>[0],
  ) => {
    if (!canCompleteDraftAgreement(draftTarget)) {
      if (!isEmptyManualDraftAgreement(draftTarget)) return null;
      return (
        <span
          className="student-finance-complete-draft-blocked"
          title={t('admin.student360.financialAgreement.emptyManualDraftBlockedHint')}
        >
          <button type="button" className="btn btn--ghost btn--sm" disabled>
            {t('admin.student360.financialAgreement.completeDraft')}
          </button>
          <span className="student-finance-complete-draft-blocked__hint tiny muted">
            {t('admin.student360.financialAgreement.emptyManualDraftBlockedHint')}
          </span>
        </span>
      );
    }
    return (
      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCreate(true)}>
        {t('admin.student360.financialAgreement.completeDraft')}
      </button>
    );
  };

  const runAction = useCallback(
    async (action: 'submit' | 'approve' | 'activate' | 'cancel', targetAgreementId?: number) => {
      const plan = buildAgreementActionExecutionPlan({
        pending: { action, agreementId: targetAgreementId },
        targetAgreementId,
        displayedAgreementId: displayAgreement?.id,
        currentAgreementId: agreement?.id,
        inactiveDraftId,
        orphanDraftId: orphanCurrentFeesDraftId,
        actionLoading,
      });

      if (plan.kind === 'blocked') return;
      if (plan.kind === 'missing_target') {
        logAgreementActionBlocked('missing_target', action);
        toast.error(t('admin.student360.financialAgreement.errors.actionTargetMissing'));
        setPendingConfirm(null);
        return;
      }

      setActionLoading(action);
      try {
        const res = await postAgreementAction(plan.agreementId, action);
        if (!res.success) {
          toast.error(
            resolveAgreementActionErrorMessage(t, action, res.error.code) || res.error.message,
          );
          return;
        }
        toast.success(t(`admin.student360.financialAgreement.actions.${action}Success`));
        refreshAll();
      } finally {
        setActionLoading(null);
        setPendingConfirm(null);
      }
    },
    [
      actionLoading,
      agreement?.id,
      displayAgreement?.id,
      inactiveDraftId,
      orphanCurrentFeesDraftId,
      t,
      toast,
      refreshAll,
    ],
  );

  const confirmPendingAction = useCallback(async () => {
    if (!pendingConfirm) return;
    await runAction(pendingConfirm.action, pendingConfirm.agreementId);
  }, [pendingConfirm, runAction]);

  function requestAction(
    action: 'submit' | 'approve' | 'activate' | 'cancel',
    confirmKey: string,
    targetAgreementId?: number,
  ) {
    setPendingConfirm({
      action,
      title: t('common.confirm'),
      body: t(confirmKey),
      agreementId: targetAgreementId,
    });
  }

  function requestReviewDraftAction(action: 'submit' | 'approve' | 'activate' | 'cancel', confirmKey: string) {
    if (!orphanCurrentFeesDraftId) return;
    setPendingConfirm({
      action,
      title: t('common.confirm'),
      body: t(confirmKey),
      agreementId: orphanCurrentFeesDraftId,
    });
  }

  function requestReviewDraftActivate(reviewDraft: FinancialAgreement, partyLabel: string) {
    if (!orphanCurrentFeesDraftId) return;
    const msg = t('admin.student360.financialAgreement.confirmActivate', {
      net: String(reviewDraft.net_amount ?? '—'),
      count: String(reviewDraft.schedule_summary?.installment_count ?? '—'),
      party: partyLabel,
      year: refName(reviewDraft.academic_year) ?? '—',
    });
    setPendingConfirm({
      action: 'activate',
      title: t('admin.student360.financialAgreement.actions.activate'),
      body: msg,
      agreementId: orphanCurrentFeesDraftId,
    });
  }

  function requestActivate(activeAgreement: FinancialAgreement, partyLabel: string) {
    const msg = t('admin.student360.financialAgreement.confirmActivate', {
      net: String(activeAgreement.net_amount ?? '—'),
      count: String(activeAgreement.schedule_summary?.installment_count ?? '—'),
      party: partyLabel,
      year: refName(activeAgreement.academic_year) ?? '—',
    });
    setPendingConfirm({
      action: 'activate',
      title: t('admin.student360.financialAgreement.actions.activate'),
      body: msg,
    });
  }

  function requestInactiveDraftAction(action: 'submit' | 'approve' | 'activate' | 'cancel', confirmKey: string) {
    if (!inactiveDraftId) return;
    setPendingConfirm({
      action,
      title: t('common.confirm'),
      body: t(confirmKey),
      agreementId: inactiveDraftId,
    });
  }

  function requestInactiveDraftActivate(draftDetail: FinancialAgreement, partyLabel: string) {
    if (!inactiveDraftId) return;
    const msg = t('admin.student360.financialAgreement.confirmActivate', {
      net: String(draftDetail.net_amount ?? '—'),
      count: String(draftDetail.schedule_summary?.installment_count ?? '—'),
      party: partyLabel,
      year: refName(draftDetail.academic_year) ?? '—',
    });
    setPendingConfirm({
      action: 'activate',
      title: t('admin.student360.financialAgreement.actions.activate'),
      body: msg,
      agreementId: inactiveDraftId,
    });
  }

  const lineColumns: Column<FinancialAgreementLine>[] = useMemo(
    () => [
      {
        key: 'service',
        header: t('admin.student360.financialAgreement.columns.service'),
        render: (row) => (
          <div className="student-finance-service-cell">
            <span dir="auto">{resolveServiceDisplayName(t, row.service) ?? t('common.dash')}</span>
            <ServiceCategoryDetailsList items={agreementLineCategoryDetails(row)} />
          </div>
        ),
      },
      {
        key: 'category',
        header: t('admin.student360.financialAgreement.columns.category'),
        render: (row) =>
          resolveReferenceLabel(
            t,
            'service_category',
            row.service?.category ?? '',
            refState.data?.service_categories,
          ),
      },
      {
        key: 'commitment',
        header: t('admin.student360.financialAgreement.columns.commitment'),
        render: (row) =>
          resolveReferenceLabel(t, 'commitment_type', row.commitment_type ?? '', refState.data?.commitment_types),
      },
      {
        key: 'pricing_unit',
        header: t('admin.student360.financialAgreement.columns.pricingUnit'),
        render: (row) =>
          resolveReferenceLabel(t, 'pricing_unit', row.pricing_unit ?? '', refState.data?.pricing_units),
      },
      {
        key: 'period',
        header: t('admin.student360.financialAgreement.columns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'quantity',
        header: t('admin.student360.financialAgreement.columns.quantity'),
        render: (row) => row.quantity ?? t('common.dash'),
      },
      {
        key: 'unit_price',
        header: t('admin.student360.financialAgreement.columns.unitPrice'),
        render: (row) => <FinanceMoney amount={row.unit_price} currency={currency?.name} />,
      },
      {
        key: 'gross',
        header: t('admin.student360.financialAgreement.columns.gross'),
        render: (row) => <FinanceMoney amount={row.gross_amount} currency={currency?.name} />,
      },
      {
        key: 'discount',
        header: t('admin.student360.financialAgreement.columns.discount'),
        render: (row) => <FinanceMoney amount={row.discount_amount} currency={currency?.name} />,
      },
      {
        key: 'net',
        header: t('admin.student360.financialAgreement.columns.net'),
        render: (row) => <FinanceMoney amount={row.net_amount} currency={currency?.name} />,
      },
    ],
    [t, formatDate, currency?.name, refState.data],
  );

  const scheduleColumns: Column<AgreementScheduleItem>[] = useMemo(
    () => [
      {
        key: 'period',
        header: t('admin.student360.financialAgreement.scheduleColumns.period'),
        render: (row) => formatPeriodRange(formatDate, row.period_start, row.period_end),
      },
      {
        key: 'display_from',
        header: t('admin.student360.financialAgreement.scheduleColumns.displayFrom'),
        render: (row) => formatDate(row.display_from),
      },
      {
        key: 'due_date',
        header: t('admin.student360.financialAgreement.scheduleColumns.dueDate'),
        render: (row) => formatDate(row.due_date),
      },
      {
        key: 'amount',
        header: t('admin.student360.financialAgreement.scheduleColumns.amount'),
        render: (row) => <FinanceMoney amount={row.amount} currency={currency?.name} />,
      },
      {
        key: 'state',
        header: t('admin.student360.financialAgreement.scheduleColumns.state'),
        render: (row) => <ScheduleItemStateBadge state={row.state ?? 'planned'} />,
      },
    ],
    [t, formatDate, currency?.name],
  );

  const billingSource = useMemo(
    () =>
      resolveStudentBillingSourcePresentation({
        financialOverview,
        workspaceAgreement: agreement,
        workspace,
      }),
    [financialOverview, agreement, workspace],
  );

  const financeEligibility = useMemo(
    () =>
      resolveChangePlanEligibility({
        workspace,
        financialOverview,
        studentCapabilities: capabilities,
      }),
    [workspace, financialOverview, capabilities],
  );

  const parallelDraftAgreements = useMemo(
    () => resolveParallelDraftAgreementsPresentation({ workspace, studentId }),
    [workspace, studentId],
  );

  if (workspaceState.error?.code === 'forbidden') {
    return (
      <Student360CompactEmpty
        title={t('admin.student360.finance.forbidden')}
        description={t('admin.student360.finance.forbiddenDesc')}
      />
    );
  }

  if (workspaceState.error) {
    return <ApiErrorView error={workspaceState.error} onRetry={workspaceState.reload} />;
  }

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
        {canCreate && !hasAgreementData(agreement) ? (
          <>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => setShowAssignFeePlan(true)}
            >
              {t('admin.student360.financialAgreement.applyFeePlan')}
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowCreate(true)}>
              {t('admin.student360.financialAgreement.createManualAgreement')}
            </button>
          </>
        ) : null}
        {agreement && allowed.edit && !canCustomizeAgreement ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowCreate(true)}
            disabled={!!actionLoading}
          >
            {t('admin.student360.financialAgreement.edit')}
          </button>
        ) : null}
      </div>
    </div>
  );

  if (phase !== 'ready') {
    return (
      <div className="student-finance-tab student-360-tab-panel">
        <Student360SectionHeader
          title={t('admin.student360.financialAgreement.pageTitle')}
          description={t('admin.student360.financialAgreement.pageDescription')}
          action={headerActions}
        />
        <StudentAgreementSkeleton />
      </div>
    );
  }

  if (showAgreementEmpty) {
    const hasFeePlanFinance =
      hasFinanceSummaryMetrics(workspace?.summary) ||
      (workspace?.installments_summary?.upcoming_count ?? 0) > 0 ||
      (workspace?.installments_summary?.overdue_count ?? 0) > 0 ||
      (workspace?.summary?.total_due ?? 0) > 0;

    const specialAgreement = financialOverview?.special_agreement;
    const draftAgreement =
      specialAgreement?.empty_draft === true ||
      (agreement?.state === 'draft' &&
        (agreement.empty_draft === true ||
          ((agreement.net_amount ?? 0) === 0 && (agreement.lines?.length ?? 0) === 0)));

    const shellClass = embedded ? 'student-finance-agreement-embedded' : 'student-finance-tab student-360-tab-panel';

    return (
      <div className={shellClass}>
        {!embedded ? (
          <Student360SectionHeader
            title={t('admin.student360.financialAgreement.pageTitle')}
            description={t('admin.student360.financialAgreement.pageDescription')}
            action={headerActions}
          />
        ) : null}
        {isBackgroundRefreshing ? <StudentInlineLoading /> : null}
        {renderCreateFromFeesNotice()}
        <FamilyPlanContextCard studentId={studentId} />

        {draftAgreement ? (
          <Card className="student-finance-section student-finance-draft-agreement">
            <Student360SectionHeader title={t('admin.student360.financialAgreement.incompleteDraftTitle')} />
            <p>{t('admin.student360.financialAgreement.incompleteDraftDesc')}</p>
            <div className="row">
              {renderCurrentFeesDraftCta()}
              {renderCompleteDraftAction(agreement ?? specialAgreement ?? null)}
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() =>
                  requestAction(
                    'cancel',
                    'admin.student360.financialAgreement.confirmCancelDraft',
                    agreement?.id ?? inactiveDraftId ?? undefined,
                  )
                }
              >
                {t('admin.student360.financialAgreement.cancelDraft')}
              </button>
            </div>
          </Card>
        ) : null}

        {billingContext.inactiveAgreement ? (
          <Card className="student-finance-section student-finance-inactive-agreement-reference">
            {inactiveDraftId ? (
              <>
                <Student360SectionHeader
                  title={t('admin.student360.financeWorkspace.inactiveAgreementReference.draftTitle')}
                />
                <p>{t('admin.student360.financeWorkspace.inactiveAgreementReference.draftDesc')}</p>
                <dl className="detail-list student-finance-agreement-meta">
                  <div>
                    <dt>{t('admin.student360.financialAgreement.fields.number')}</dt>
                    <dd className="mono">#{billingContext.inactiveAgreement.id}</dd>
                  </div>
                  <div>
                    <dt>{t('admin.student360.financialAgreement.fields.state')}</dt>
                    <dd>
                      <AgreementStateBadge state={billingContext.inactiveAgreement.state ?? 'draft'} />
                    </dd>
                  </div>
                  {(() => {
                    const inactiveSummary = resolveAgreementFinanceSummary(inactiveDraftDetailState.data);
                    const displayAmount = inactiveSummary?.final_total ?? inactiveSummary?.net_total;
                    return displayAmount != null ? (
                      <div>
                        <dt>{t('admin.student360.financialAgreement.summary.finalAfterCustomization')}</dt>
                        <dd>
                          <FinanceMoney
                            amount={displayAmount}
                            currency={inactiveDraftDetailState.data?.currency?.name ?? currency?.name}
                          />
                        </dd>
                      </div>
                    ) : null;
                  })()}
                  {(inactiveDraftDetailState.data?.schedule_summary?.installment_count ?? 0) > 0 ? (
                    <div>
                      <dt>{t('admin.student360.financialAgreement.fields.installmentCount')}</dt>
                      <dd>{inactiveDraftDetailState.data!.schedule_summary!.installment_count}</dd>
                    </div>
                  ) : null}
                </dl>
                {inactiveDraftDetailState.loading ? <StudentInlineLoading /> : null}
                {inactiveDraftDetailState.error ? (
                  <ApiErrorView error={inactiveDraftDetailState.error} onRetry={inactiveDraftDetailState.reload} />
                ) : null}
                {!inactiveDraftDetailState.loading && !inactiveDraftDetailState.initialLoading ? (
                  <div className="row student-finance-inactive-draft-actions">
                    {!inactiveDraftDetailState.data?.allowed_actions?.submit &&
                    !inactiveDraftDetailState.data?.allowed_actions?.approve &&
                    !inactiveDraftDetailState.data?.allowed_actions?.activate ? (
                      <>
                        <p className="tiny muted">
                          {t('admin.student360.financeWorkspace.inactiveAgreementReference.noActionFromServer')}
                        </p>
                        <Link
                          href={`/admin/students/${studentId}?tab=finance&financeSubTab=overview`}
                          className="btn btn--ghost btn--sm"
                        >
                          {t('admin.student360.financeWorkspace.inactiveAgreementReference.backToOverview')}
                        </Link>
                      </>
                    ) : (
                      <>
                        {inactiveDraftDetailState.data?.allowed_actions?.submit ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={actionLoading === 'submit'}
                            onClick={() =>
                              requestInactiveDraftAction('submit', 'admin.student360.financialAgreement.confirmSubmit')
                            }
                          >
                            {t('admin.student360.financialAgreement.actions.submit')}
                          </button>
                        ) : null}
                        {inactiveDraftDetailState.data?.allowed_actions?.approve ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={actionLoading === 'approve'}
                            onClick={() =>
                              requestInactiveDraftAction('approve', 'admin.student360.financialAgreement.confirmApprove')
                            }
                          >
                            {t('admin.student360.financialAgreement.actions.approve')}
                          </button>
                        ) : null}
                        {inactiveDraftDetailState.data?.allowed_actions?.cancel ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={actionLoading === 'cancel'}
                            onClick={() =>
                              requestInactiveDraftAction(
                                'cancel',
                                'admin.student360.financialAgreement.confirmCancel',
                              )
                            }
                          >
                            {t('admin.student360.financialAgreement.actions.cancel')}
                          </button>
                        ) : null}
                        {inactiveDraftDetailState.data?.allowed_actions?.activate &&
                        inactiveDraftDetailState.data ? (
                          <button
                            type="button"
                            className="btn btn--primary btn--sm"
                            disabled={actionLoading === 'activate'}
                            onClick={() =>
                              requestInactiveDraftActivate(
                                inactiveDraftDetailState.data!,
                                refName(
                                  inactiveDraftDetailState.data!.billing_partner ?? workspace?.billing_partner,
                                ) ?? '—',
                              )
                            }
                          >
                            {t('admin.student360.financialAgreement.actions.activate')}
                          </button>
                        ) : null}
                      </>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <Student360SectionHeader
                  title={t('admin.student360.financeWorkspace.inactiveAgreementReference.title')}
                />
                <p className="student-finance-inactive-agreement-reference__status">
                  {t('admin.student360.financeWorkspace.inactiveAgreementReference.stateLabel')}:{' '}
                  {billingContext.inactiveAgreement.state
                    ? resolveFinanceAgreementStateLabel(t, billingContext.inactiveAgreement.state, {
                        hasBillableContext: true,
                      })
                    : t('common.dash')}
                </p>
                {billingSource.agreementNumber ? (
                  <p className="tiny muted" dir="auto">
                    {billingSource.agreementNumber}
                  </p>
                ) : null}
                {billingContext.inactiveAgreement.requires_review ? (
                  <div className="student-finance-section student-finance-card-alert" role="alert">
                    <p>{t('admin.student360.financeWorkspace.inactiveAgreementReference.requiresReviewWarning')}</p>
                  </div>
                ) : null}
                {existingCurrentFeesDraft && !orphanCurrentFeesDraftId ? (
                  <p className="tiny muted">
                    {t('admin.student360.financialAgreement.fromFees.errors.draftAlreadyExists')}{' '}
                    {t('admin.student360.financialAgreement.fromFees.errors.draftAlreadyExistsHint')}{' '}
                    <span className="mono">#{existingCurrentFeesDraft.id}</span>
                  </p>
                ) : null}
                <div className="row">{renderCurrentFeesDraftCta()}</div>
              </>
            )}
          </Card>
        ) : null}

        {renderCurrentFeesDraftReviewPanel()}

        {!billingContext.inactiveAgreement ? (
          canAssignFees ? (
            <>
              {financeSetupState.kind === 'clean_no_finance' ? (
                <AssignFinancePlanPanel
                  studentId={studentId}
                  academicYearId={effectiveYearId}
                  setupState={financeSetupState}
                  enrollmentEditHref={`/admin/students/${studentId}?tab=enrollment`}
                  onAssigned={refreshAll}
                />
              ) : financeSetupState.kind !== 'active_agreement' ? (
                <FinanceSetupStatePanel studentId={studentId} setupState={financeSetupState} />
              ) : null}
              <div className="row student-finance-agreement-empty-actions">
                <Link
                  href={`/admin/students/${studentId}?tab=finance&financeSubTab=overview`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.student360.financialAgreement.openFinanceOverview')}
                </Link>
                <Link
                  href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
                  className="btn btn--ghost btn--sm"
                >
                  {t('admin.student360.financialAgreement.openPaymentSchedule')}
                </Link>
                {renderCurrentFeesDraftCta('btn btn--ghost btn--sm')}
              </div>
            </>
          ) : (
            <Student360CompactEmpty
              title={t('admin.student360.financialAgreement.noSpecialAgreementTitle')}
              description={t('admin.student360.financialAgreement.noSpecialAgreementDesc')}
              action={
                <div className="row student-finance-agreement-empty-actions">
                  <Link
                    href={`/admin/students/${studentId}?tab=finance&financeSubTab=overview`}
                    className="btn btn--ghost btn--sm"
                  >
                    {t('admin.student360.financialAgreement.openFinanceOverview')}
                  </Link>
                  <Link
                    href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
                    className="btn btn--ghost btn--sm"
                  >
                    {t('admin.student360.financialAgreement.openPaymentSchedule')}
                  </Link>
                  {renderCurrentFeesDraftCta()}
                </div>
              }
            />
          )
        ) : (
          <div className="row student-finance-agreement-empty-actions">
            <Link
              href={`/admin/students/${studentId}?tab=finance&financeSubTab=overview`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.student360.financialAgreement.openFinanceOverview')}
            </Link>
            <Link
              href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`}
              className="btn btn--ghost btn--sm"
            >
              {t('admin.student360.financialAgreement.openPaymentSchedule')}
            </Link>
            {renderCurrentFeesDraftCta()}
          </div>
        )}

        {hasFeePlanFinance ? (
          <p className="muted student-finance-fee-plan-notice-inline">
            {t('admin.finance.feePlanAppliedWithoutAgreement')}
          </p>
        ) : null}

        {showFromFees ? (
          <AgreementFromFeesDrawer
            open={showFromFees}
            studentId={studentId}
            financialOverview={financialOverview ?? null}
            onClose={() => setShowFromFees(false)}
            onDuplicateDraft={handleDuplicateDraftFromFees}
            onSuccess={() => {
              setShowFromFees(false);
              refreshAll();
            }}
          />
        ) : null}

        {showCreate ? (
          <AgreementCreateDrawer
            studentId={studentId}
            details={details}
            workspace={workspace ?? null}
            academicYearId={Number(effectiveYearId)}
            agreement={draftAgreement ? agreement : null}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              refreshAll();
            }}
          />
        ) : null}
        <StudentFinanceAssignFeeDrawer
          open={showAssignFeePlan}
          studentId={studentId}
          classId={details.current_enrollment?.class?.id ?? details.student.class?.id}
          levelId={details.current_enrollment?.level?.id ?? details.student.level?.id}
          initialAcademicYearId={effectiveYearId}
          enrollmentJoinDate={details.current_enrollment?.actual_join_date}
          enrollmentStartDate={details.current_enrollment?.date_start}
          onClose={() => setShowAssignFeePlan(false)}
          onAssigned={() => {
            setShowAssignFeePlan(false);
            refreshAll();
          }}
        />
        <ConfirmationDialog
          open={pendingConfirm != null}
          title={pendingConfirm?.title ?? t('common.confirm')}
          body={pendingConfirm?.body ?? ''}
          loading={actionLoading != null}
          onConfirm={confirmPendingAction}
          onClose={() => setPendingConfirm(null)}
        />
      </div>
    );
  }

  const activeAgreement = displayAgreement as FinancialAgreement;
  const workflowAllowed = displayAllowed;
  const draftPresentation = resolveDraftAgreementPresentation({
    financialOverview,
    workspaceAgreement: workspace?.current_agreement ?? null,
    agreementDetail: activeAgreement,
  });
  const financeSummary = resolveAgreementFinanceSummary(activeAgreement);
  const isIncompleteDraft =
    activeAgreement.state === 'draft' &&
    !draftPresentation.isPlanCustomized &&
    (activeAgreement.net_amount ?? 0) === 0 &&
    (activeAgreement.lines?.length ?? 0) === 0 &&
    (activeAgreement.schedule_summary?.installment_count ?? 0) === 0;

  if (isIncompleteDraft) {
    const hasFeePlanFinance =
      hasFinanceSummaryMetrics(workspace?.summary) ||
      (workspace?.installments_summary?.upcoming_count ?? 0) > 0 ||
      (workspace?.summary?.total_due ?? 0) > 0;

    return (
      <div className={`${embedded ? 'student-finance-agreement-embedded' : 'student-finance-tab student-360-tab-panel'}${isBackgroundRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}>
        {!embedded ? (
          <Student360SectionHeader
            title={t('admin.student360.financialAgreement.pageTitle')}
            description={t('admin.student360.financialAgreement.pageDescription')}
            action={headerActions}
          />
        ) : null}
        <Card className="student-finance-section student-finance-draft-agreement">
          <Student360SectionHeader title={t('admin.student360.financialAgreement.incompleteDraftTitle')} />
          <p>{t('admin.student360.financialAgreement.incompleteDraftDesc')}</p>
          <div className="row">
            {renderCurrentFeesDraftCta()}
            {renderCompleteDraftAction(activeAgreement)}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() =>
                requestAction(
                  'cancel',
                  'admin.student360.financialAgreement.confirmCancelDraft',
                  activeAgreement.id,
                )
              }
            >
              {t('admin.student360.financialAgreement.cancelDraft')}
            </button>
          </div>
        </Card>
        {hasFeePlanFinance ? (
          <Card className="student-finance-section">
            <p>{t('admin.finance.feePlanAppliedWithoutAgreement')}</p>
            <div className="row">
              <Link href={`/admin/students/${studentId}?tab=finance&financeSubTab=overview`} className="btn btn--ghost btn--sm">
                {t('admin.student360.financialAgreement.openFinanceOverview')}
              </Link>
              <Link href={`/admin/students/${studentId}?tab=finance&financeSubTab=schedule`} className="btn btn--ghost btn--sm">
                {t('admin.student360.financialAgreement.openPaymentSchedule')}
              </Link>
            </div>
          </Card>
        ) : null}
        <ConfirmationDialog
          open={pendingConfirm != null}
          title={pendingConfirm?.title ?? t('common.confirm')}
          body={pendingConfirm?.body ?? ''}
          loading={actionLoading != null}
          onConfirm={confirmPendingAction}
          onClose={() => setPendingConfirm(null)}
        />
      </div>
    );
  }

  const billingProfile = activeAgreement.billing_profile;
  const billingPartner = activeAgreement.billing_partner ?? workspace?.billing_partner;
  const guardianRel = billingProfile?.guardian_id
    ? details.guardian_relationships.find((r) => r.guardian.id === billingProfile.guardian_id)
    : null;
  const billingPartyName = billingPartner ? refName(billingPartner) : null;
  const billingPartyTypeLabel = resolveReferenceLabel(
    t,
    'billing_party_type',
    billingProfile?.billing_party_type ?? '',
    undefined,
  );
  const billingPartyInitials = billingPartyName
    ? billingPartyName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : '?';

  const summaryCards = buildAgreementSummaryCards({
    financeSummary,
    agreement: activeAgreement,
    labels: {
      original: t('admin.student360.financialAgreement.summary.originalTotal'),
      discount: t('admin.student360.financialAgreement.summary.discountTotal'),
      final: t('admin.student360.financialAgreement.summary.finalAfterCustomization'),
      recurring: t('admin.student360.financialAgreement.summary.recurringAfterDiscount'),
      monthly: t('admin.student360.financialAgreement.summary.expectedMonthlyDue'),
      schedule: t('admin.student360.financialAgreement.summary.scheduleTotal'),
      surcharge: t('admin.student360.financialAgreement.summary.surchargeTotal'),
      net: t('admin.student360.financialAgreement.summary.netTotal'),
      paid: t('admin.student360.financialAgreement.summary.paidTotal'),
      remaining: t('admin.student360.financialAgreement.summary.remainingTotal'),
    },
  });

  const policies = activeAgreement.schedule_policies;

  return (
    <div className={`student-finance-agreement-panel ${embedded ? 'student-finance-agreement-embedded' : 'student-finance-tab student-360-tab-panel'}${isBackgroundRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}>
      {!embedded ? (
        <Student360SectionHeader
          title={t('admin.student360.financialAgreement.pageTitle')}
          description={t('admin.student360.financialAgreement.pageDescription')}
          action={headerActions}
        />
      ) : null}
      {isBackgroundRefreshing ? <StudentInlineLoading /> : null}
      {renderCreateFromFeesNotice()}
      <FamilyPlanContextCard studentId={studentId} />
      <ParallelDraftAgreementsBanner presentation={parallelDraftAgreements} />

      {isInactiveAgreementState(activeAgreement.state) ? (
        <div className="student-finance-section student-finance-card-alert" role="alert">
          <p>
            {financeEligibility.hasBillableFinanceContext
              ? t('admin.student360.financeWorkspace.inactiveAgreement.agreementTabWarning')
              : t('admin.student360.financialAgreement.inactiveWarning')}
          </p>
        </div>
      ) : null}

      <Card className="student-finance-agreement-header card">
        <div className="student-finance-agreement-header__top">
          <div className="student-finance-agreement-header__identity">
            <span className="student-finance-agreement-header__eyebrow">
              {refName(activeAgreement.academic_year) ?? t('common.dash')}
            </span>
            <h3 className="student-finance-agreement-header__number mono" dir="auto">
              {activeAgreement.number ?? activeAgreement.name ?? t('common.dash')}
            </h3>
          </div>
          <AgreementStateBadge
            state={activeAgreement.state}
            financeContext
            hasBillableContext={financeEligibility.hasBillableFinanceContext}
          />
        </div>
        <dl className="student-finance-agreement-meta student-finance-agreement-header__meta">
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.agreementDate')}</dt>
            <dd>{formatDate(activeAgreement.agreement_date)}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.validity')}</dt>
            <dd>{formatPeriodRange(formatDate, activeAgreement.valid_from, activeAgreement.valid_until)}</dd>
          </div>
          {billingSource.originalPlanName ? (
            <div className="student-finance-agreement-header__plan">
              <dt>{t('admin.student360.financialAgreement.fields.originalFeePlan')}</dt>
              <dd dir="auto">{billingSource.originalPlanName}</dd>
            </div>
          ) : null}
        </dl>
        {billingSource.hasActiveAgreement ? (
          <p className="student-finance-agreement-header__hint">
            {t('admin.student360.financeWorkspace.billingSourcePlanTemplateHint')}
          </p>
        ) : null}
      </Card>

      {summaryCards.length ? (
        <Student360MetricGrid
          variant="finance"
          className="student-finance-agreement-summary"
          items={summaryCards.map((item) => ({
            key: item.key,
            label: item.label,
            tone: item.tone,
            value: (
              <FinanceMoney amount={item.value} currency={currency?.name} />
            ),
          }))}
        />
      ) : null}

      {draftPresentation.totalsMismatch ? (
        <p className="student-finance-card-alert" role="note">
          {t('admin.student360.financeWorkspace.draftAgreement.totalsMismatch')}
        </p>
      ) : null}

      <AgreementEnrollmentCustomizationsSection presentation={draftPresentation} />

      {canCustomizeAgreement || activeAgreement.state === 'active' ? (
        <AgreementDraftCustomizationSection
          agreement={activeAgreement}
          currency={currency?.name}
          onChanged={refreshAll}
        />
      ) : null}

      <div className="student-finance-agreement-details-grid">
        <article className="student-finance-agreement-detail-card">
          <h4 className="student-finance-agreement-detail-card__title">
            {t('admin.student360.financialAgreement.billingPartyTitle')}
          </h4>
          {billingPartner ? (
            <div className="student-finance-billing-profile">
              <span className="student-finance-billing-profile__avatar" aria-hidden="true">
                {billingPartyInitials}
              </span>
              <div className="student-finance-billing-profile__body">
                <div className="student-finance-billing-profile__head">
                  {guardianRel ? (
                    <Link
                      href={`/admin/parents/${guardianRel.guardian.id}`}
                      className="student-finance-billing-profile__name student-finance-billing-link"
                      dir="auto"
                    >
                      {billingPartyName}
                    </Link>
                  ) : (
                    <span className="student-finance-billing-profile__name" dir="auto">
                      {billingPartyName}
                    </span>
                  )}
                  <span className="student-finance-billing-profile__type">{billingPartyTypeLabel}</span>
                </div>
                {guardianRel ? (
                  <dl className="student-finance-billing-profile__meta">
                    <div>
                      <dt>{t('admin.student360.financialAgreement.fields.relationship')}</dt>
                      <dd>{relationshipTypeLabel(t, guardianRel.relationship_type)}</dd>
                    </div>
                    {guardianRel.guardian?.email ? (
                      <div>
                        <dt>{t('admin.email')}</dt>
                        <dd>
                          <a href={`mailto:${guardianRel.guardian.email}`}>{guardianRel.guardian.email}</a>
                        </dd>
                      </div>
                    ) : null}
                    {guardianRel.guardian?.phone ? (
                      <div>
                        <dt>{t('admin.phone')}</dt>
                        <dd>
                          <a href={`tel:${guardianRel.guardian.phone}`} dir="auto">
                            {guardianRel.guardian.phone}
                          </a>
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            </div>
          ) : (
            <Student360CompactEmpty
              className="student-finance-agreement-detail-empty"
              title={t('admin.student360.financialAgreement.noBillingParty')}
              description={t('admin.student360.financialAgreement.noBillingPartyDesc')}
              action={
                onOpenGuardians ? (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={onOpenGuardians}>
                    {t('admin.student360.financialAgreement.openGuardians')}
                  </button>
                ) : undefined
              }
            />
          )}
        </article>

        <article className="student-finance-agreement-detail-card">
          <div className="student-finance-agreement-detail-card__head">
            <h4 className="student-finance-agreement-detail-card__title">
              {t('admin.student360.financialAgreement.adjustments.title')}
            </h4>
            {activeAgreement.state === 'draft' && allowed.edit ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowAdjustment(true)}>
                {t('admin.student360.financialAgreement.adjustments.addButton')}
              </button>
            ) : null}
          </div>
          {(activeAgreement.adjustments?.length ?? 0) === 0 ? (
            <div className="student-finance-agreement-detail-empty-inline" role="status">
              <span className="student-finance-agreement-detail-empty-inline__icon" aria-hidden="true">
                —
              </span>
              <p>
                {draftPresentation.enrollmentCustomizations.length > 0
                  ? t('admin.student360.financialAgreement.adjustments.emptyWithEnrollmentCustomizations')
                  : t('admin.student360.financialAgreement.adjustments.empty')}
              </p>
            </div>
          ) : (
            <div className="student-finance-table-wrap student-finance-adjustments-list">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{t('admin.student360.financialAgreement.adjustments.type')}</th>
                    <th>{t('admin.student360.financialAgreement.adjustments.amount')}</th>
                    <th>{t('admin.student360.financialAgreement.adjustments.reason')}</th>
                    <th>{t('admin.student360.financialAgreement.adjustments.policy')}</th>
                    {activeAgreement.state === 'draft' ? <th>{t('common.actions')}</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {activeAgreement.adjustments?.map((adj) => (
                    <tr key={adj.id}>
                      <td>{resolveAdjustmentTypeLabel(t, adj.adjustment_type)}</td>
                      <td>
                        {adj.percentage != null ? (
                          <span dir="ltr">{adj.percentage}%</span>
                        ) : (
                          <FinanceMoney amount={adj.amount ?? undefined} currency={currency?.name} />
                        )}
                      </td>
                      <td dir="auto">{adj.reason ?? t('common.dash')}</td>
                      <td>{resolveAdjustmentPolicyLabel(t, adj.application_policy)}</td>
                      {activeAgreement.state === 'draft' ? (
                        <td>
                          <button
                            type="button"
                            className="btn btn--ghost btn--sm"
                            disabled={!!actionLoading}
                            onClick={async () => {
                              setActionLoading(`delete-adj-${adj.id}`);
                              const res = await deleteAgreementAdjustment(activeAgreement.id, adj.id);
                              setActionLoading(null);
                              if (!res.success) {
                                toast.error(res.error.message);
                                return;
                              }
                              toast.success(t('admin.student360.financialAgreement.adjustments.deleteSuccess'));
                              refreshAll();
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </div>

      {!canCustomizeAgreement ? (
      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.linesTitle')} />
        {(activeAgreement.lines?.length ?? 0) === 0 ? (
          <Student360CompactEmpty
            className="student-360-compact-empty--section"
            title={t('admin.student360.financialAgreement.noLines')}
            description={t('admin.student360.financialAgreement.noLinesDesc')}
          />
        ) : (
          <div className="student-finance-table-wrap">
            <DataTable
              columns={lineColumns}
              rows={activeAgreement.lines ?? []}
              rowKey={(row) => row.id ?? `${row.service_id}-${row.tariff_id ?? 0}`}
            />
          </div>
        )}
      </Card>
      ) : null}

      <Card className="student-finance-section">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.scheduleTitle')} />
        {(activeAgreement.installments?.length ?? 0) === 0 ? (
          policies ? (
            <div className="student-finance-schedule-policy student-finance-schedule-policy--compact">
              <p className="student-finance-schedule-policy__title">
                {t('admin.student360.financialAgreement.schedulePolicyTitle')}
              </p>
              <ul className="student-finance-schedule-policy__list">
                <li>
                  {t('admin.student360.financialAgreement.schedulePolicy.generation')}:{' '}
                  {resolveReferenceLabel(
                    t,
                    'schedule_generation_mode',
                    policies.generation_mode ?? '',
                    refState.data?.schedule_generation_modes,
                  )}
                </li>
                <li>
                  {t('admin.student360.financialAgreement.schedulePolicy.display')}:{' '}
                  {resolveReferenceLabel(t, 'display_rule', policies.display_rule ?? '', refState.data?.display_rules)}
                </li>
                <li>
                  {t('admin.student360.financialAgreement.schedulePolicy.dueDay')}:{' '}
                  {policies.due_day_of_month ?? policies.due_offset_days ?? '—'}
                </li>
                <li>
                  {t('admin.student360.financialAgreement.schedulePolicy.earlyPayment')}:{' '}
                  {policies.allow_early_payment ? t('common.yes') : t('common.no')}
                </li>
                <li>
                  {t('admin.student360.financialAgreement.schedulePolicy.firstPeriod')}:{' '}
                  {resolveReferenceLabel(
                    t,
                    'first_period_policy',
                    policies.first_period_policy ?? '',
                    refState.data?.first_period_policies,
                  )}
                </li>
              </ul>
            </div>
          ) : (
            <Student360CompactEmpty
              className="student-360-compact-empty--section"
              title={t('admin.student360.financialAgreement.noSchedule')}
              description={t('admin.student360.financialAgreement.noScheduleDesc')}
            />
          )
        ) : (
          <>
          <div className="student-finance-table-wrap">
            <DataTable
              columns={scheduleColumns}
              rows={activeAgreement.installments ?? []}
              rowKey={(row) => row.id ?? `${row.period_start ?? 'p'}-${row.due_date ?? 'd'}`}
            />
          </div>
        {policies ? (
          <div className="student-finance-schedule-policy student-finance-schedule-policy--compact">
            <p className="student-finance-schedule-policy__title">
              {t('admin.student360.financialAgreement.schedulePolicyTitle')}
            </p>
            <ul className="student-finance-schedule-policy__list">
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.generation')}:{' '}
                {resolveReferenceLabel(
                  t,
                  'schedule_generation_mode',
                  policies.generation_mode ?? '',
                  refState.data?.schedule_generation_modes,
                )}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.display')}:{' '}
                {resolveReferenceLabel(t, 'display_rule', policies.display_rule ?? '', refState.data?.display_rules)}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.dueDay')}:{' '}
                {policies.due_day_of_month ?? policies.due_offset_days ?? '—'}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.earlyPayment')}:{' '}
                {policies.allow_early_payment ? t('common.yes') : t('common.no')}
              </li>
              <li>
                {t('admin.student360.financialAgreement.schedulePolicy.firstPeriod')}:{' '}
                {resolveReferenceLabel(
                  t,
                  'first_period_policy',
                  policies.first_period_policy ?? '',
                  refState.data?.first_period_policies,
                )}
              </li>
            </ul>
          </div>
        ) : null}
          </>
        )}
      </Card>

      <div className="student-finance-agreement-actions-bar">
      <div className="student-finance-agreement-actions row">
        {workflowAllowed.submit ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={actionLoading === 'submit'}
            onClick={() =>
              requestAction('submit', 'admin.student360.financialAgreement.confirmSubmit', activeAgreement.id)
            }
          >
            {t('admin.student360.financialAgreement.actions.submit')}
          </button>
        ) : null}
        {workflowAllowed.approve ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'approve'}
            onClick={() =>
              requestAction('approve', 'admin.student360.financialAgreement.confirmApprove', activeAgreement.id)
            }
          >
            {t('admin.student360.financialAgreement.actions.approve')}
          </button>
        ) : null}
        {workflowAllowed.activate ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={actionLoading === 'activate'}
            onClick={() =>
              requestActivate(activeAgreement, refName(billingPartner) ?? '—')
            }
          >
            {t('admin.student360.financialAgreement.actions.activate')}
          </button>
        ) : null}
        {workflowAllowed.cancel ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'cancel'}
            onClick={() =>
              requestAction('cancel', 'admin.student360.financialAgreement.confirmCancel', activeAgreement.id)
            }
          >
            {t('admin.student360.financialAgreement.actions.cancel')}
          </button>
        ) : null}
        {workflowAllowed.cancel_future_installments ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => setShowCancelFuture(true)}
          >
            {t('admin.student360.financialAgreement.actions.cancelFuture')}
          </button>
        ) : null}
      </div>
      </div>

      {showCancelFuture ? (
        <CancelFutureInstallmentsDrawer
          open={showCancelFuture}
          agreementId={activeAgreement.id}
          onClose={() => setShowCancelFuture(false)}
          onSuccess={refreshAll}
        />
      ) : null}

      {showCreate ? (
        <AgreementCreateDrawer
          studentId={studentId}
          details={details}
          workspace={workspace}
          academicYearId={Number(effectiveYearId)}
          agreement={activeAgreement}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            refreshAll();
          }}
        />
      ) : null}

      <StudentFinanceAssignFeeDrawer
        open={showAssignFeePlan}
        studentId={studentId}
        classId={details.current_enrollment?.class?.id ?? details.student.class?.id}
        levelId={details.current_enrollment?.level?.id ?? details.student.level?.id}
        initialAcademicYearId={effectiveYearId}
        enrollmentJoinDate={details.current_enrollment?.actual_join_date}
        enrollmentStartDate={details.current_enrollment?.date_start}
        onClose={() => setShowAssignFeePlan(false)}
        onAssigned={() => {
          setShowAssignFeePlan(false);
          refreshAll();
        }}
      />

      {showAdjustment ? (
        <AgreementAdjustmentDrawer
          open={showAdjustment}
          agreementId={activeAgreement.id}
          sourceFees={activeAgreement.lines ?? activeAgreement.source_fees}
          onClose={() => setShowAdjustment(false)}
          onSuccess={refreshAll}
        />
      ) : null}

      <ConfirmationDialog
        open={pendingConfirm != null}
        title={pendingConfirm?.title ?? t('common.confirm')}
        body={pendingConfirm?.body ?? ''}
        loading={actionLoading != null}
        onConfirm={confirmPendingAction}
        onClose={() => setPendingConfirm(null)}
      />
    </div>
  );
}
