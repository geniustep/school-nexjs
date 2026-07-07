import type {
  BillingResponsibilityMetadata,
  BillingResponsibilityStatus,
} from '@/types/billing-responsibility';
import { parseBillingResponsibilityMetadata } from '@/features/admin/students/utils/student-create-billing-responsibility';
import type { StudentFinanceWorkspace } from '../types';

export type BillingResponsibilityUxCase =
  | 'resolved'
  | 'needs_selection'
  | 'unresolved'
  | 'legacy_unknown';

export interface BillingResponsibilityPresentation {
  uxCase: BillingResponsibilityUxCase | null;
  status: BillingResponsibilityStatus | null;
  metadata: BillingResponsibilityMetadata | null;
  titleKey: string | null;
  messageKey: string | null;
  tone: 'neutral' | 'warn' | 'danger' | 'review';
  showBanner: boolean;
  showCta: boolean;
  ctaKey: string | null;
  blocksFinanceOperations: boolean;
  financeBlockMessageKey: string | null;
  showReviewWarning: boolean;
  billingPartnerId: number | null;
}

const T = {
  resolved: null,
  needsSelectionTitle:
    'admin.student360.financeWorkspace.billingResponsibility.needsSelection.title',
  needsSelectionMessage:
    'admin.student360.financeWorkspace.billingResponsibility.needsSelection.message',
  needsSelectionCta:
    'admin.student360.financeWorkspace.billingResponsibility.needsSelection.cta',
  needsSelectionFinanceBlocked:
    'admin.student360.financeWorkspace.billingResponsibility.needsSelection.financeBlocked',
  unresolvedTitle:
    'admin.student360.financeWorkspace.billingResponsibility.unresolved.title',
  unresolvedMessage:
    'admin.student360.financeWorkspace.billingResponsibility.unresolved.message',
  unresolvedCta:
    'admin.student360.financeWorkspace.billingResponsibility.unresolved.cta',
  unresolvedFinanceBlocked:
    'admin.student360.financeWorkspace.billingResponsibility.unresolved.financeBlocked',
  legacyTitle: 'admin.student360.financeWorkspace.billingResponsibility.legacyUnknown.title',
  legacyMessage:
    'admin.student360.financeWorkspace.billingResponsibility.legacyUnknown.message',
  legacyReviewWarning:
    'admin.student360.financeWorkspace.billingResponsibility.legacyUnknown.reviewWarning',
} as const;

function readBillingResponsibilityFromWorkspace(
  workspace?: StudentFinanceWorkspace | null,
): BillingResponsibilityMetadata | null {
  if (!workspace) return null;
  return (
    parseBillingResponsibilityMetadata(workspace.billing_responsibility) ??
    parseBillingResponsibilityMetadata(workspace.finance?.billing_responsibility)
  );
}

function resolveUxCase(status: BillingResponsibilityStatus | undefined): BillingResponsibilityUxCase | null {
  if (status === 'resolved') return 'resolved';
  if (status === 'needs_selection') return 'needs_selection';
  if (status === 'unresolved') return 'unresolved';
  if (status === 'legacy_unknown') return 'legacy_unknown';
  return null;
}

export function resolveBillingResponsibilityPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  canSelectBillingResponsible?: boolean;
}): BillingResponsibilityPresentation {
  const metadata = readBillingResponsibilityFromWorkspace(input.workspace);
  const status = metadata?.status ?? null;
  const uxCase = resolveUxCase(status ?? undefined);
  const canSelect = input.canSelectBillingResponsible === true;

  const empty: BillingResponsibilityPresentation = {
    uxCase,
    status,
    metadata,
    titleKey: null,
    messageKey: null,
    tone: 'neutral',
    showBanner: false,
    showCta: false,
    ctaKey: null,
    blocksFinanceOperations: false,
    financeBlockMessageKey: null,
    showReviewWarning: false,
    billingPartnerId: metadata?.billing_partner_id ?? null,
  };

  if (!uxCase || uxCase === 'resolved') {
    return empty;
  }

  if (uxCase === 'needs_selection') {
    return {
      ...empty,
      titleKey: T.needsSelectionTitle,
      messageKey: T.needsSelectionMessage,
      tone: 'warn',
      showBanner: true,
      showCta: canSelect,
      ctaKey: canSelect ? T.needsSelectionCta : null,
      blocksFinanceOperations: true,
      financeBlockMessageKey: T.needsSelectionFinanceBlocked,
    };
  }

  if (uxCase === 'unresolved') {
    return {
      ...empty,
      titleKey: T.unresolvedTitle,
      messageKey: T.unresolvedMessage,
      tone: 'danger',
      showBanner: true,
      showCta: canSelect,
      ctaKey: canSelect ? T.unresolvedCta : null,
      blocksFinanceOperations: true,
      financeBlockMessageKey: T.unresolvedFinanceBlocked,
    };
  }

  return {
    ...empty,
    titleKey: T.legacyTitle,
    messageKey: T.legacyMessage,
    tone: 'review',
    showBanner: true,
    showReviewWarning: true,
    blocksFinanceOperations: false,
    financeBlockMessageKey: null,
  };
}

/** Academic tabs must stay usable even when billing responsibility is pending selection. */
export function shouldBlockAcademicFlowForBillingResponsibility(
  presentation: BillingResponsibilityPresentation,
): boolean {
  return false;
}

export function shouldBlockFinanceOperationsForBillingResponsibility(
  presentation: BillingResponsibilityPresentation,
): boolean {
  return presentation.blocksFinanceOperations;
}
