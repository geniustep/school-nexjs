import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementActionItem } from '../types/agreement-context';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readAllowed(
  workspace?: StudentFinanceWorkspace | null,
  agreement?: FinancialAgreement | null,
): Record<string, boolean | undefined> {
  return {
    ...(workspace?.allowed_actions ?? {}),
    ...(agreement?.allowed_actions ?? {}),
  };
}

export function isAgreementAmendmentAllowed(
  workspace?: StudentFinanceWorkspace | null,
  agreement?: FinancialAgreement | null,
): boolean {
  const allowed = readAllowed(workspace, agreement);
  return (
    allowed.amend_financial_agreement === true ||
    allowed.create_amendment === true ||
    allowed.amend === true
  );
}

export function resolveAgreementAmendmentDisabledReason(
  workspace?: StudentFinanceWorkspace | null,
): string | null {
  return (
    readString(workspace?.action_reasons?.amend_financial_agreement) ??
    readString(workspace?.action_reasons?.create_amendment)
  );
}

export function resolveAgreementAmendmentAction(input: {
  workspace?: StudentFinanceWorkspace | null;
  agreement?: FinancialAgreement | null;
  financialOverview?: StudentFinancialOverview | null;
}): FinanceAgreementActionItem | null {
  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.agreement ?? input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview ?? null,
  });
  if (!hasActiveAgreement) return null;

  const enabled = isAgreementAmendmentAllowed(input.workspace, input.agreement);
  const disabledReasonText = enabled ? null : resolveAgreementAmendmentDisabledReason(input.workspace);

  return {
    kind: 'amend_financial_agreement',
    labelKey: 'admin.student360.financeWorkspace.agreementAmendment.action',
    enabled,
    disabledTooltipKey: enabled
      ? null
      : disabledReasonText
        ? null
        : 'admin.student360.financeWorkspace.agreementAmendment.noPermission',
    disabledTooltipText: disabledReasonText,
    primary: enabled,
  };
}
