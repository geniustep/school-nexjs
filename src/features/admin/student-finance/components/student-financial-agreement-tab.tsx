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
import {
  postAgreementAction,
  createAgreementFromCurrentFees,
  deleteAgreementAdjustment,
} from '../api/finance-admin-api';
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

  const phase = resolveFinanceTabLoadPhase({
    yearsLoading: refState.loading,
    effectiveYearId,
    workspaceInitialLoading: workspaceState.initialLoading,
    agreementId,
    agreementDetailInitialLoading: agreementState.initialLoading,
  });

  const showAgreementEmpty = shouldShowAgreementEmptyState({
    phase,
    agreement,
    workspaceLoaded: !!workspace && !workspaceState.initialLoading,
  });

  const isBackgroundRefreshing = isRefreshing || agreementState.fetching;

  const currency = agreement?.currency ?? workspace?.summary?.currency;
  const allowed = agreement?.allowed_actions ?? workspace?.allowed_actions ?? {};
  const canCreate = allowed.create_agreement === true;

  const refreshAll = useCallback(() => {
    workspaceState.reload();
    agreementState.reload();
    if (orphanCurrentFeesDraftId) reviewDraftState.reload();
    onChanged();
  }, [workspaceState, agreementState, orphanCurrentFeesDraftId, reviewDraftState, onChanged]);

  const billingContext = useMemo(
    () => resolveBillingContextPresentation({ workspace }),
    [workspace],
  );

  const showCreateFromFeesAction = !billingContext.hasActiveAgreement && canCreate;

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
    if (!showCreateFromFeesAction) return null;

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
      const id = targetAgreementId ?? agreement?.id;
      if (!id) return;
      setActionLoading(action);
      const res = await postAgreementAction(id, action);
      setActionLoading(null);
      setPendingConfirm(null);
      if (!res.success) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t(`admin.student360.financialAgreement.actions.${action}Success`));
      refreshAll();
    },
    [agreement?.id, t, toast, refreshAll],
  );

  function requestAction(action: 'submit' | 'approve' | 'activate' | 'cancel', confirmKey: string) {
    setPendingConfirm({
      action,
      title: t('common.confirm'),
      body: t(confirmKey),
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
        {agreement && allowed.edit ? (
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
                onClick={() => requestAction('cancel', 'admin.student360.financialAgreement.confirmCancelDraft')}
              >
                {t('admin.student360.financialAgreement.cancelDraft')}
              </button>
            </div>
          </Card>
        ) : null}

        {billingContext.inactiveAgreement ? (
          <Card className="student-finance-section student-finance-inactive-agreement-reference">
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
          </Card>
        ) : null}

        {renderCurrentFeesDraftReviewPanel()}

        {!billingContext.inactiveAgreement ? (
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
              {canCreate && !showCreateFromFeesAction ? (
                <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowFromFees(true)}>
                  {t('admin.student360.financialAgreement.fromFees.createButton')}
                </button>
              ) : renderCurrentFeesDraftCta()}
            </div>
          }
        />
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
      </div>
    );
  }

  const activeAgreement = agreement as FinancialAgreement;
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
              onClick={() => requestAction('cancel', 'admin.student360.financialAgreement.confirmCancelDraft')}
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
      </div>
    );
  }

  const billingProfile = activeAgreement.billing_profile;
  const billingPartner = activeAgreement.billing_partner ?? workspace?.billing_partner;
  const guardianRel = billingProfile?.guardian_id
    ? details.guardian_relationships.find((r) => r.guardian.id === billingProfile.guardian_id)
    : null;

  const summaryCards = financeSummary
    ? [
        {
          key: 'original',
          label: t('admin.student360.financialAgreement.summary.originalTotal'),
          value: financeSummary.original_total,
        },
        {
          key: 'discount',
          label: t('admin.student360.financialAgreement.summary.discountTotal'),
          value: financeSummary.discount_total,
        },
        {
          key: 'final',
          label: t('admin.student360.financialAgreement.summary.finalAfterCustomization'),
          value: financeSummary.final_total ?? financeSummary.net_total,
        },
        {
          key: 'recurring',
          label: t('admin.student360.financialAgreement.summary.recurringAfterDiscount'),
          value: financeSummary.recurring_total_after_discount,
        },
        {
          key: 'monthly',
          label: t('admin.student360.financialAgreement.summary.expectedMonthlyDue'),
          value: financeSummary.monthly_due_amount,
        },
        {
          key: 'schedule',
          label: t('admin.student360.financialAgreement.summary.scheduleTotal'),
          value: financeSummary.schedule_total,
        },
      ].filter((item) => item.value != null)
    : [
    {
      key: 'original',
      label: t('admin.student360.financialAgreement.summary.originalTotal'),
      value: activeAgreement.original_total ?? activeAgreement.gross_amount,
    },
    {
      key: 'discount',
      label: t('admin.student360.financialAgreement.summary.discountTotal'),
      value: activeAgreement.discount_total ?? activeAgreement.discount_amount,
    },
    {
      key: 'surcharge',
      label: t('admin.student360.financialAgreement.summary.surchargeTotal'),
      value: activeAgreement.surcharge_total,
    },
    {
      key: 'net',
      label: t('admin.student360.financialAgreement.summary.netTotal'),
      value: activeAgreement.net_total ?? activeAgreement.net_amount,
    },
    {
      key: 'paid',
      label: t('admin.student360.financialAgreement.summary.paidTotal'),
      value: activeAgreement.paid_total,
    },
    {
      key: 'remaining',
      label: t('admin.student360.financialAgreement.summary.remainingTotal'),
      value: activeAgreement.remaining_total,
    },
  ].filter((item) => item.value != null || item.key === 'net' || item.key === 'original');

  const policies = activeAgreement.schedule_policies;

  return (
    <div className={`${embedded ? 'student-finance-agreement-embedded' : 'student-finance-tab student-360-tab-panel'}${isBackgroundRefreshing ? ' student-360-tab-panel--refreshing' : ''}`}>
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
        <dl className="detail-list student-finance-agreement-meta">
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.academicYear')}</dt>
            <dd>{refName(activeAgreement.academic_year) ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.number')}</dt>
            <dd>{activeAgreement.number ?? activeAgreement.name ?? t('common.dash')}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.state')}</dt>
            <dd>
              <AgreementStateBadge
                state={activeAgreement.state}
                financeContext
                hasBillableContext={financeEligibility.hasBillableFinanceContext}
              />
            </dd>
          </div>
          {billingSource.originalPlanName ? (
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.originalFeePlan')}</dt>
              <dd dir="auto">{billingSource.originalPlanName}</dd>
            </div>
          ) : null}
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.agreementDate')}</dt>
            <dd>{formatDate(activeAgreement.agreement_date)}</dd>
          </div>
          <div>
            <dt>{t('admin.student360.financialAgreement.fields.validity')}</dt>
            <dd>{formatPeriodRange(formatDate, activeAgreement.valid_from, activeAgreement.valid_until)}</dd>
          </div>
        </dl>
        {billingSource.hasActiveAgreement ? (
          <p className="student-finance-billing-source__hint tiny muted">
            {t('admin.student360.financeWorkspace.billingSourcePlanTemplateHint')}
          </p>
        ) : null}
      </Card>

      <Student360MetricGrid
        items={summaryCards.map((item) => ({
          key: item.key,
          label: item.label,
          value: (
            <FinanceMoney amount={item.value as number | undefined} currency={currency?.name} />
          ),
        }))}
      />

      {draftPresentation.totalsMismatch ? (
        <p className="student-finance-card-alert" role="note">
          {t('admin.student360.financeWorkspace.draftAgreement.totalsMismatch')}
        </p>
      ) : null}

      <AgreementEnrollmentCustomizationsSection presentation={draftPresentation} />

      <Card className="student-finance-section student-finance-billing-card">
        <Student360SectionHeader title={t('admin.student360.financialAgreement.billingPartyTitle')} />
        {billingPartner ? (
          <dl className="detail-list student-finance-billing-details">
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.billingParty')}</dt>
              <dd>
                {guardianRel ? (
                  <Link href={`/admin/parents/${guardianRel.guardian.id}`} className="student-finance-billing-link">
                    {refName(billingPartner)}
                  </Link>
                ) : (
                  refName(billingPartner)
                )}
              </dd>
            </div>
            <div>
              <dt>{t('admin.student360.financialAgreement.fields.partyType')}</dt>
              <dd>
                {resolveReferenceLabel(
                  t,
                  'billing_party_type',
                  billingProfile?.billing_party_type ?? '',
                  undefined,
                )}
              </dd>
            </div>
            {guardianRel ? (
              <div>
                <dt>{t('admin.student360.financialAgreement.fields.relationship')}</dt>
                <dd>{relationshipTypeLabel(t, guardianRel.relationship_type)}</dd>
              </div>
            ) : null}
            {guardianRel?.guardian?.email ? (
              <div>
                <dt>{t('admin.email')}</dt>
                <dd>
                  <a href={`mailto:${guardianRel.guardian.email}`}>{guardianRel.guardian.email}</a>
                </dd>
              </div>
            ) : null}
            {guardianRel?.guardian?.phone ? (
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
        ) : (
          <Student360CompactEmpty
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
      </Card>

      <Card className="student-finance-section">
        <Student360SectionHeader
          title={t('admin.student360.financialAgreement.adjustments.title')}
          action={
            activeAgreement.state === 'draft' && allowed.edit ? (
              <button type="button" className="btn btn--primary btn--sm" onClick={() => setShowAdjustment(true)}>
                {t('admin.student360.financialAgreement.adjustments.addButton')}
              </button>
            ) : null
          }
        />
        {(activeAgreement.adjustments?.length ?? 0) === 0 ? (
          <p className="muted">
            {draftPresentation.enrollmentCustomizations.length > 0
              ? t('admin.student360.financialAgreement.adjustments.emptyWithEnrollmentCustomizations')
              : t('admin.student360.financialAgreement.adjustments.empty')}
          </p>
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
                    <td>
                      {resolveAdjustmentPolicyLabel(t, adj.application_policy)}
                    </td>
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
      </Card>

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
        {allowed.submit ? (
          <button
            type="button"
            className="btn btn--primary btn--sm"
            disabled={actionLoading === 'submit'}
            onClick={() => requestAction('submit', 'admin.student360.financialAgreement.confirmSubmit')}
          >
            {t('admin.student360.financialAgreement.actions.submit')}
          </button>
        ) : null}
        {allowed.approve ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'approve'}
            onClick={() => requestAction('approve', 'admin.student360.financialAgreement.confirmApprove')}
          >
            {t('admin.student360.financialAgreement.actions.approve')}
          </button>
        ) : null}
        {allowed.activate ? (
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
        {allowed.cancel ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            disabled={actionLoading === 'cancel'}
            onClick={() => requestAction('cancel', 'admin.student360.financialAgreement.confirmCancel')}
          >
            {t('admin.student360.financialAgreement.actions.cancel')}
          </button>
        ) : null}
        {allowed.cancel_future_installments ? (
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
        onConfirm={() => {
          if (pendingConfirm) void runAction(pendingConfirm.action, pendingConfirm.agreementId);
        }}
        onClose={() => setPendingConfirm(null)}
      />
    </div>
  );
}
