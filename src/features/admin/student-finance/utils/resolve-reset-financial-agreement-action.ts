import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import type { ResetFinancialAgreementPresentation } from '../types/agreement-context';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';

export function resolveResetFinancialAgreementPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): ResetFinancialAgreementPresentation {
  const allowed = input.workspace?.allowed_actions ?? {};
  const endpointAvailable = allowed.reset_financial_agreement === true;
  const requiresReview = readRequiresFinanceReview(input.workspace);
  const canCreateAgreement = allowed.create_agreement === true;
  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? null,
    financialOverview: input.financialOverview,
  });

  const visible =
    requiresReview &&
    !hasActiveAgreement &&
    (endpointAvailable || canCreateAgreement);

  return {
    visible,
    enabled: endpointAvailable,
    endpointAvailable,
    reasonKey: 'admin.student360.financeWorkspace.agreementContext.reset.reason',
  };
}
