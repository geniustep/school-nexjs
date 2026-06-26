import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementStatusPresentation, FinanceAgreementUiStatus } from '../types/agreement-context';
import { normalizeReferenceValue } from './reference-labels';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';

const I18N = {
  active: 'admin.student360.financeWorkspace.agreementContext.status.active',
  draft: 'admin.student360.financeWorkspace.agreementContext.status.draft',
  pendingApproval: 'admin.student360.financeWorkspace.agreementContext.status.pendingApproval',
  approved: 'admin.student360.financeWorkspace.agreementContext.status.approved',
  cancelled: 'admin.student360.financeWorkspace.agreementContext.status.cancelled',
  requiresReview: 'admin.student360.financeWorkspace.agreementContext.status.requiresReview',
  none: 'admin.student360.financeWorkspace.agreementContext.status.none',
  collectBlocked: 'admin.student360.financeWorkspace.agreementContext.collectBlockedBeforeAgreement',
} as const;

function resolveUiStatus(input: {
  state: string | null | undefined;
  requiresReview: boolean;
  hasActiveAgreement: boolean;
}): FinanceAgreementUiStatus {
  if (input.requiresReview) return 'requires_review';
  const slug = normalizeReferenceValue(input.state ?? '');
  if (!slug) return 'none';
  if (input.hasActiveAgreement && slug === 'active') return 'active';
  if (slug === 'active' && !input.hasActiveAgreement) return 'requires_review';
  if (slug === 'draft') return 'draft';
  if (slug === 'pending_approval') return 'pending_approval';
  if (slug === 'approved') return 'approved';
  if (slug === 'cancelled' || slug === 'terminated') return 'cancelled';
  if (['completed', 'expired', 'superseded', 'inactive'].includes(slug)) return 'requires_review';
  return 'none';
}

function statusTone(status: FinanceAgreementUiStatus): FinanceAgreementStatusPresentation['tone'] {
  switch (status) {
    case 'active':
      return 'ok';
    case 'draft':
    case 'pending_approval':
    case 'approved':
      return 'warn';
    case 'cancelled':
    case 'requires_review':
      return 'danger';
    default:
      return 'neutral';
  }
}

function stateLabelKey(status: FinanceAgreementUiStatus): string {
  switch (status) {
    case 'active':
      return I18N.active;
    case 'draft':
      return I18N.draft;
    case 'pending_approval':
      return I18N.pendingApproval;
    case 'approved':
      return I18N.approved;
    case 'cancelled':
      return I18N.cancelled;
    case 'requires_review':
      return I18N.requiresReview;
    default:
      return I18N.none;
  }
}

function readAgreementNumber(
  workspace?: StudentFinanceWorkspace | null,
  hasActiveAgreement?: boolean,
): string | null {
  const current = workspace?.current_agreement;
  if (hasActiveAgreement) {
    if (typeof current?.number === 'string' && current.number.trim()) return current.number.trim();
    if (typeof current?.name === 'string' && current.name.trim()) return current.name.trim();
    return null;
  }
  if (typeof current?.number === 'string' && current.number.trim()) return current.number.trim();
  if (typeof current?.name === 'string' && current.name.trim()) return current.name.trim();
  if (workspace?.inactive_agreement?.id != null) return `#${workspace.inactive_agreement.id}`;
  return null;
}

export function resolveAgreementStatusPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  collectBlockReason?: string | null;
}): FinanceAgreementStatusPresentation {
  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview,
  });
  const requiresReview = readRequiresFinanceReview(input.workspace);
  const agreementState =
    (hasActiveAgreement ? input.workspace?.current_agreement?.state : null) ??
    input.workspace?.inactive_agreement?.state ??
    input.workspace?.current_agreement?.state ??
    null;

  const uiStatus = resolveUiStatus({ state: agreementState, requiresReview, hasActiveAgreement });
  const collectReason = normalizeReferenceValue(input.collectBlockReason ?? '');
  const collectAllowed = input.workspace?.collection_gate?.collect_allowed === true;
  const showCollectBlockedAlert =
    !hasActiveAgreement &&
    (uiStatus === 'cancelled' ||
      uiStatus === 'requires_review' ||
      requiresReview ||
      collectReason === 'agreement_not_active' ||
      collectReason === 'active_agreement_required' ||
      collectReason !== '');

  return {
    uiStatus,
    stateLabelKey: stateLabelKey(uiStatus),
    tone: statusTone(uiStatus),
    showCollectBlockedAlert: showCollectBlockedAlert && !collectAllowed,
    collectBlockedAlertKey: showCollectBlockedAlert && !collectAllowed ? I18N.collectBlocked : null,
    requiresReview,
    agreementNumber: readAgreementNumber(input.workspace, hasActiveAgreement),
    agreementState,
  };
}
