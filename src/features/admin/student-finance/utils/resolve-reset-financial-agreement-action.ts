import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import type { ResetFinancialAgreementPresentation } from '../types/agreement-context';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function resolveResetFinancialAgreementPresentation(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
}): ResetFinancialAgreementPresentation {
  const allowed = input.workspace?.allowed_actions ?? {};
  const endpointAvailable = allowed.reset_financial_agreement === true;
  const requiresReview = readRequiresFinanceReview(input.workspace);
  const disabledReasonText = readString(input.workspace?.action_reasons?.reset_financial_agreement);

  return {
    visible: requiresReview,
    enabled: endpointAvailable,
    endpointAvailable,
    disabledReasonText,
    warningKey: 'admin.student360.financeWorkspace.agreementContext.reset.warning',
  };
}
