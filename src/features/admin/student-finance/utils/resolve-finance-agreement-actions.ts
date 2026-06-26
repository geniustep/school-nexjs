import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { FinancialAgreement, StudentFinanceWorkspace } from '../types';
import type { FinanceAgreementActionItem } from '../types/agreement-context';
import { normalizeReferenceValue } from './reference-labels';
import { readRequiresFinanceReview } from './resolve-fee-plan-presentation';
import { hasActiveFinancialAgreement } from './resolve-student-billing-source-presentation';

const FUTURE_ACTION_TOOLTIP =
  'admin.student360.financeWorkspace.agreementContext.actions.futureDatedAmendmentUnavailable';

function readAllowed(
  workspace?: StudentFinanceWorkspace | null,
  agreement?: FinancialAgreement | null,
): Record<string, boolean | undefined> {
  return {
    ...(workspace?.allowed_actions ?? {}),
    ...(agreement?.allowed_actions ?? {}),
  };
}

function pushAction(
  actions: FinanceAgreementActionItem[],
  item: FinanceAgreementActionItem,
): void {
  if (actions.some((existing) => existing.kind === item.kind)) return;
  actions.push(item);
}

export function resolveFinanceAgreementActions(input: {
  workspace?: StudentFinanceWorkspace | null;
  financialOverview?: StudentFinancialOverview | null;
  agreement?: FinancialAgreement | null;
  resetVisible?: boolean;
  resetEnabled?: boolean;
  resetDisabledReasonText?: string | null;
}): FinanceAgreementActionItem[] {
  const hasActiveAgreement = hasActiveFinancialAgreement({
    workspace: input.workspace,
    workspaceAgreement: input.workspace?.current_agreement ?? input.agreement ?? null,
    financialOverview: input.financialOverview,
  });
  const allowed = readAllowed(input.workspace, input.agreement ?? input.workspace?.current_agreement);
  const agreementState =
    input.agreement?.state ??
    input.workspace?.current_agreement?.state ??
    input.workspace?.inactive_agreement?.state ??
    null;
  const slug = normalizeReferenceValue(agreementState ?? '');
  const requiresReview = readRequiresFinanceReview(input.workspace);
  const actions: FinanceAgreementActionItem[] = [];

  const canCreateAgreement = allowed.create_agreement === true;

  if (input.resetVisible) {
    pushAction(actions, {
      kind: 'reset_financial_agreement',
      labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.resetFinancialAgreement',
      enabled: input.resetEnabled === true,
      disabledTooltipKey: input.resetEnabled
        ? null
        : 'admin.student360.financeWorkspace.agreementContext.reset.serverUnavailable',
      disabledTooltipText: input.resetEnabled ? null : input.resetDisabledReasonText ?? null,
      primary: true,
    });
  }

  if (!hasActiveAgreement && canCreateAgreement) {
    pushAction(actions, {
      kind: 'create_agreement',
      labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.createFinancialAgreement',
      enabled: true,
      disabledTooltipKey: null,
      primary: !input.resetVisible,
    });
  }

  if (hasActiveAgreement) {
    const futureActions: FinanceAgreementActionItem[] = [
      {
        kind: 'create_amendment',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.createAmendment',
        enabled: allowed.create_amendment === true,
        disabledTooltipKey: FUTURE_ACTION_TOOLTIP,
      },
      {
        kind: 'add_service_from_date',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.addServiceFromDate',
        enabled: allowed.add_service_from_date === true,
        disabledTooltipKey: FUTURE_ACTION_TOOLTIP,
      },
      {
        kind: 'stop_service_from_date',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.stopServiceFromDate',
        enabled: allowed.stop_service_from_date === true,
        disabledTooltipKey: FUTURE_ACTION_TOOLTIP,
      },
      {
        kind: 'reschedule_remaining',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.rescheduleRemaining',
        enabled: allowed.reschedule_remaining === true,
        disabledTooltipKey: FUTURE_ACTION_TOOLTIP,
      },
      {
        kind: 'terminate_from_date',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.terminateFromDate',
        enabled: allowed.terminate_from_date === true,
        disabledTooltipKey: FUTURE_ACTION_TOOLTIP,
      },
    ];
    for (const action of futureActions) {
      pushAction(actions, action);
    }
    return actions;
  }

  const isPreActive = ['draft', 'pending_approval', 'approved'].includes(slug);
  const isCancelledOrReview = slug === 'cancelled' || slug === 'terminated' || requiresReview;

  if (isPreActive || isCancelledOrReview) {
    if (allowed.customize === true || allowed.edit === true || allowed.update === true) {
      pushAction(actions, {
        kind: 'customize_agreement',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.customizeAgreement',
        enabled: true,
        disabledTooltipKey: null,
      });
    }
    if (allowed.submit === true) {
      pushAction(actions, {
        kind: 'submit_for_review',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.submitForReview',
        enabled: true,
        disabledTooltipKey: null,
      });
    }
    if (allowed.activate === true || allowed.approve === true) {
      pushAction(actions, {
        kind: 'activate_agreement',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.activateAgreement',
        enabled: true,
        disabledTooltipKey: null,
        primary: slug !== 'cancelled',
      });
    }
    if (allowed.cancel === true) {
      pushAction(actions, {
        kind: 'cancel_agreement',
        labelKey: 'admin.student360.financeWorkspace.agreementContext.actions.cancelAgreement',
        enabled: true,
        disabledTooltipKey: null,
      });
    }
  }

  return actions;
}

export function shouldHideDirectEditForActiveAgreement(
  workspace?: StudentFinanceWorkspace | null,
  financialOverview?: StudentFinancialOverview | null,
): boolean {
  return hasActiveFinancialAgreement({
    workspace,
    workspaceAgreement: workspace?.current_agreement ?? null,
    financialOverview,
  });
}
