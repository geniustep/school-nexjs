export type AgreementWorkflowAction = 'submit' | 'approve' | 'activate' | 'cancel';

export type PendingAgreementConfirm = {
  action: AgreementWorkflowAction;
  agreementId?: number;
};

export function resolveAgreementActionTargetId(input: {
  targetAgreementId?: number | null;
  displayedAgreementId?: number | null;
  currentAgreementId?: number | null;
  inactiveDraftId?: number | null;
  orphanDraftId?: number | null;
}): number | null {
  const candidates = [
    input.targetAgreementId,
    input.displayedAgreementId,
    input.currentAgreementId,
    input.inactiveDraftId,
    input.orphanDraftId,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }
  return null;
}

export function shouldBlockAgreementAction(actionLoading: string | null | undefined): boolean {
  return actionLoading != null && actionLoading.length > 0;
}

export function buildAgreementActionExecutionPlan(input: {
  pending: PendingAgreementConfirm | null;
  targetAgreementId?: number;
  displayedAgreementId?: number | null;
  currentAgreementId?: number | null;
  inactiveDraftId?: number | null;
  orphanDraftId?: number | null;
  actionLoading?: string | null;
}):
  | { kind: 'blocked'; reason: 'no_pending' | 'loading' }
  | { kind: 'missing_target' }
  | { kind: 'execute'; agreementId: number; action: AgreementWorkflowAction } {
  if (!input.pending) return { kind: 'blocked', reason: 'no_pending' };
  if (shouldBlockAgreementAction(input.actionLoading)) {
    return { kind: 'blocked', reason: 'loading' };
  }

  const agreementId = resolveAgreementActionTargetId({
    targetAgreementId: input.targetAgreementId ?? input.pending.agreementId,
    displayedAgreementId: input.displayedAgreementId,
    currentAgreementId: input.currentAgreementId,
    inactiveDraftId: input.inactiveDraftId,
    orphanDraftId: input.orphanDraftId,
  });

  if (agreementId == null) return { kind: 'missing_target' };
  return { kind: 'execute', agreementId, action: input.pending.action };
}

export function resolveAgreementActionErrorMessage(
  t: (key: string) => string,
  action: AgreementWorkflowAction,
  code?: string | null,
): string {
  if (action === 'cancel') {
    if (code === 'forbidden' || code === 'access_denied' || code === 'permission_denied') {
      return t('admin.student360.financialAgreement.errors.cancelNotAllowed');
    }
    if (
      code === 'conflict' ||
      code === 'invalid_state' ||
      code === 'financial_impact' ||
      code === 'has_financial_impact'
    ) {
      return t('admin.student360.financialAgreement.errors.cancelFinancialImpact');
    }
  }
  return t('admin.student360.financialAgreement.errors.actionFailed');
}

export function logAgreementActionBlocked(reason: string, detail?: string): void {
  if (typeof console !== 'undefined' && console.error) {
    console.error('[agreement-action] blocked:', reason, detail ?? '');
  }
}
