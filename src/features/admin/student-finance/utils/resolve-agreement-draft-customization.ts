import type { AllowedActionsMap, AgreementState, FinancialAgreement } from '../types';

const EDITABLE_STATES = new Set<AgreementState | string>(['draft', 'pending_approval', 'approved']);

export function isAgreementEditableBeforeActivation(
  state: string | null | undefined,
  allowedActions?: AllowedActionsMap | null,
): boolean {
  if (!state || !EDITABLE_STATES.has(state)) return false;
  return allowedActions?.edit === true;
}

export function canPreviewAgreementSchedule(allowedActions?: AllowedActionsMap | null): boolean {
  return allowedActions?.preview_schedule === true;
}

export function canGenerateAgreementSchedule(allowedActions?: AllowedActionsMap | null): boolean {
  return allowedActions?.generate_schedule === true;
}

export function canMutateAgreementLines(allowedActions?: AllowedActionsMap | null): boolean {
  return allowedActions?.edit === true;
}

export function resolveAgreementBillingModeLabelKey(
  commitmentType: string | null | undefined,
): string {
  const slug = (commitmentType ?? '').trim().toLowerCase();
  if (slug === 'one_time' || slug === 'once') {
    return 'admin.student360.financialAgreement.customization.billingMode.oneTime';
  }
  if (slug === 'recurring' || slug === 'monthly') {
    return 'admin.student360.financialAgreement.customization.billingMode.monthly';
  }
  if (slug === 'periodic') {
    return 'admin.student360.financialAgreement.customization.billingMode.periodic';
  }
  return 'admin.student360.financialAgreement.customization.billingMode.unknown';
}

export function agreementNeedsScheduleRefreshAfterLineChange(
  agreement: Pick<FinancialAgreement, 'installments' | 'schedule_summary'> | null | undefined,
): boolean {
  const installmentCount =
    agreement?.installments?.length ?? agreement?.schedule_summary?.installment_count ?? 0;
  return installmentCount > 0;
}
