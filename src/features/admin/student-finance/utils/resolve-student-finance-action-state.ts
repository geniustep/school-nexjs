import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import type { DraftAgreementPresentation } from './resolve-draft-agreement-presentation';
import type { BillingContextPresentation } from './resolve-billing-context-presentation';
import type { ChangePlanEligibility } from './resolve-change-plan-eligibility';
import type { InactiveAgreementPresentation } from './resolve-inactive-agreement-presentation';

/**
 * Single source of truth for the actionable finance state shown in the student
 * finance workspace. It consolidates the scattered draft / inactive / billing
 * context signals into ONE scenario so the UI never renders three duplicate
 * warning cards for the same situation.
 *
 * IMPORTANT: this resolver never invents backend actions. `canActivateAgreement`
 * and `canCreateAgreement` are only true when the backend `allowed_actions`
 * already expose a safe, existing route.
 */
export type StudentFinanceScenario =
  | 'active_agreement'
  | 'draft_agreement'
  | 'history_without_active_agreement'
  | 'no_agreement';

export type StudentFinanceActionKind =
  | 'review_agreement'
  | 'activate_agreement'
  | 'create_agreement';

export interface StudentFinanceAction {
  kind: StudentFinanceActionKind;
  labelKey: string;
}

/**
 * How the installment schedule must be presented:
 * - `official`: real, billable schedule — collection allowed per capabilities.
 * - `draft_preview`: installments come from an unapproved draft fee agreement —
 *   show them clearly as a non-binding preview, never as collectable dues.
 * - `blocked`: schedule must not be shown as an actionable table.
 */
export type StudentFinanceScheduleMode = 'official' | 'draft_preview' | 'blocked';

export interface StudentFinanceActionState {
  scenario: StudentFinanceScenario;
  hasActiveAgreement: boolean;
  hasDraftAgreement: boolean;
  hasHistoricalMovements: boolean;
  canReviewAgreement: boolean;
  canCreateAgreement: boolean;
  canActivateAgreement: boolean;
  primaryAction: StudentFinanceAction | null;
  secondaryActions: StudentFinanceAction[];
  /** i18n key describing why finance management is blocked, or null when nothing is blocked. */
  blockingReason: string | null;
  /** When false the workspace must not render any "no active agreement" warning. */
  showConsolidatedBanner: boolean;
  /** Suppresses the redundant executive-summary context headline when a banner already explains the state. */
  showExecutiveContextHeadline: boolean;
  /** Presentation mode for the installment schedule (official vs draft preview). */
  scheduleMode: StudentFinanceScheduleMode;
  /** True when the schedule should be rendered as the official, billable table. */
  shouldShowOfficialSchedule: boolean;
  /** True when the schedule should be rendered as an explicit unapproved preview. */
  shouldShowDraftSchedulePreview: boolean;
  /** Gate for per-installment "record payment" actions — false for a draft agreement. */
  shouldAllowInstallmentCollection: boolean;
  /** True when executive KPI amounts (overdue/remaining) must not be shown as confirmed dues. */
  shouldSuppressExecutiveAmounts: boolean;
}

const T = {
  reviewDraft: 'admin.student360.financeWorkspace.actionState.reviewDraft',
  reviewAgreement: 'admin.student360.financeWorkspace.actionState.reviewAgreement',
  // Reuse the accurate existing label for the safe submit step.
  activateAgreement: 'admin.student360.financialAgreement.actions.submit',
  createAgreement: 'admin.student360.financeWorkspace.actionState.createAgreement',
  blockedByDraft: 'admin.student360.financeWorkspace.actionState.blockedByDraft',
  blockedByNoActive: 'admin.student360.financeWorkspace.actionState.blockedByNoActive',
} as const;

function readBackendCreateAgreementAllowed(
  workspace: StudentFinanceWorkspace | null | undefined,
): boolean {
  const workspaceAllowed = workspace?.allowed_actions ?? {};
  const agreementAllowed = workspace?.current_agreement?.allowed_actions ?? {};
  return workspaceAllowed.create_agreement === true || agreementAllowed.create_agreement === true;
}

export function resolveStudentFinanceActionState(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  draftPresentation: DraftAgreementPresentation;
  billingContext: BillingContextPresentation;
  eligibility: ChangePlanEligibility;
  inactiveAgreement: InactiveAgreementPresentation;
}): StudentFinanceActionState {
  const { draftPresentation, billingContext, eligibility, inactiveAgreement } = input;

  const hasActiveAgreement =
    billingContext.hasActiveAgreement || eligibility.hasActiveAgreementInUi;
  const hasDraftAgreement = draftPresentation.hasDraftAgreement;
  const hasHistoricalMovements = eligibility.hasBillableFinanceContext;

  const allowed = draftPresentation.allowedActions ?? {};
  // A draft only exposes a safe one-click activation path when the backend says so.
  const canActivateAgreement =
    hasDraftAgreement &&
    draftPresentation.agreementId != null &&
    (allowed.submit === true || allowed.approve === true || allowed.activate === true);

  const canCreateAgreement =
    !hasActiveAgreement && readBackendCreateAgreementAllowed(input.workspace);

  // Decide the single scenario. Order matters: an active agreement wins, then a
  // draft (always actionable), then a billable history, then the empty case.
  let scenario: StudentFinanceScenario;
  if (hasActiveAgreement) {
    scenario = 'active_agreement';
  } else if (hasDraftAgreement) {
    scenario = 'draft_agreement';
  } else if (hasHistoricalMovements || inactiveAgreement.hasInactiveAgreementRecord) {
    scenario = 'history_without_active_agreement';
  } else {
    scenario = 'no_agreement';
  }

  const canReviewAgreement =
    scenario === 'draft_agreement' ||
    (scenario === 'history_without_active_agreement' &&
      (inactiveAgreement.hasInactiveAgreementRecord || hasHistoricalMovements));

  let primaryAction: StudentFinanceAction | null = null;
  const secondaryActions: StudentFinanceAction[] = [];
  let blockingReason: string | null = null;

  switch (scenario) {
    case 'draft_agreement': {
      blockingReason = T.blockedByDraft;
      if (canActivateAgreement) {
        primaryAction = { kind: 'activate_agreement', labelKey: T.activateAgreement };
        secondaryActions.push({ kind: 'review_agreement', labelKey: T.reviewDraft });
      } else {
        primaryAction = { kind: 'review_agreement', labelKey: T.reviewDraft };
      }
      break;
    }
    case 'history_without_active_agreement': {
      blockingReason = T.blockedByNoActive;
      primaryAction = { kind: 'review_agreement', labelKey: T.reviewAgreement };
      if (canCreateAgreement) {
        secondaryActions.push({ kind: 'create_agreement', labelKey: T.createAgreement });
      }
      break;
    }
    case 'no_agreement': {
      if (canCreateAgreement) {
        primaryAction = { kind: 'create_agreement', labelKey: T.createAgreement };
      }
      break;
    }
    case 'active_agreement':
    default:
      break;
  }

  const showConsolidatedBanner =
    scenario === 'draft_agreement' || scenario === 'history_without_active_agreement';

  // A draft fee agreement must never let its installments behave like official
  // billable dues: no collection, schedule shown only as an explicit preview,
  // and executive overdue/remaining amounts suppressed (they are not confirmed).
  const isDraftScenario = scenario === 'draft_agreement';
  const scheduleMode: StudentFinanceScheduleMode = isDraftScenario ? 'draft_preview' : 'official';
  const shouldAllowInstallmentCollection = !isDraftScenario;
  const shouldShowDraftSchedulePreview = isDraftScenario;
  const shouldShowOfficialSchedule = !isDraftScenario;
  const shouldSuppressExecutiveAmounts = isDraftScenario;

  return {
    scenario,
    hasActiveAgreement,
    hasDraftAgreement,
    hasHistoricalMovements,
    canReviewAgreement,
    canCreateAgreement,
    canActivateAgreement,
    primaryAction,
    secondaryActions,
    blockingReason,
    showConsolidatedBanner,
    // The banner already carries the problem/impact/action copy, so the
    // executive headline only shows when no banner is present.
    showExecutiveContextHeadline: !showConsolidatedBanner,
    scheduleMode,
    shouldShowOfficialSchedule,
    shouldShowDraftSchedulePreview,
    shouldAllowInstallmentCollection,
    shouldSuppressExecutiveAmounts,
  };
}
