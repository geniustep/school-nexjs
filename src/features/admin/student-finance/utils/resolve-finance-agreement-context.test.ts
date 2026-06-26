import { describe, expect, it } from 'vitest';
import type { StudentFinancialOverview } from '@/types/student-financial-overview';
import type { StudentFinanceWorkspace } from '../types';
import { resolveFeePlanPresentation } from './resolve-fee-plan-presentation';
import { resolveAgreementStatusPresentation } from './resolve-agreement-status-presentation';
import {
  hasFinanceOperationsHistoryApi,
  resolveFinanceOperationsHistory,
  resolvePerformedByLabel,
} from './resolve-finance-operations-history';
import { resolveFinanceAgreementActions } from './resolve-finance-agreement-actions';
import { resolveResetFinancialAgreementPresentation } from './resolve-reset-financial-agreement-action';
import { resolveBillingContextPresentation } from './resolve-billing-context-presentation';

describe('resolveFeePlanPresentation', () => {
  it('1) renders fee plan details when plan and agreement exist', () => {
    const workspace = {
      summary: { remaining: 22000, currency: { id: 1, name: 'MAD' } },
      billing_context: { has_active_agreement: false },
      inactive_agreement: { id: 3, state: 'cancelled', requires_review: true },
      current_agreement: {
        id: 3,
        student_id: 5,
        state: 'cancelled',
        number: 'FA/2026/00003',
        fee_plan_id: 12,
        fee_plan_name: 'Plan Collège',
        gross_amount: 20000,
        discount_amount: 1700,
        net_amount: 18300,
        remaining_total: 22000,
        valid_from: '2026-09-01',
        valid_until: '2027-06-30',
        academic_year: { id: 1, name: '2026-2027' },
      },
    } as StudentFinanceWorkspace;

    const plan = resolveFeePlanPresentation({
      workspace,
      financialOverview: {
        applied_plans: [
          {
            id: 12,
            name: 'Plan Collège',
            total_fees: 18300,
            paid: 0,
            remaining: 22000,
            fees_count: 4,
            installments_count: 10,
          },
        ],
      } as StudentFinancialOverview,
      details: {
        student: { id: 5, level: { id: 1, name: 'Collège' }, class: { id: 2, name: '2A' } },
      } as never,
    });

    expect(plan.hasValidPlan).toBe(true);
    expect(plan.feePlanName).toBe('Plan Collège');
    expect(plan.feePlanId).toBe(12);
    expect(plan.agreementNumber).toBe('FA/2026/00003');
    expect(plan.showAsInactive).toBe(true);
    expect(plan.remainingAmount).toBe(22000);
  });
});

describe('resolvePerformedByLabel', () => {
  it('2) never returns undefined for missing user or reference', () => {
    expect(resolvePerformedByLabel({}).performedByKey).toContain('Unavailable');
    expect(resolvePerformedByLabel({ user_name: 'sara' }).performedByLabel).toBe('sara');
    expect(resolvePerformedByLabel({ performed_by: 'system' }).performedByKey).toContain('System');
  });
});

describe('resolveBillingContextPresentation', () => {
  it('3) maps agreement_not_active as collect block reason', () => {
    const billing = resolveBillingContextPresentation({
      workspace: {
        summary: {},
        collection_gate: {
          collect_allowed: false,
          collect_block_reason: 'agreement_not_active',
        },
        allowed_actions: { collect_payment: false },
      } as StudentFinanceWorkspace,
      canCollectCapability: true,
    });

    expect(billing.collectBlockReason).toBe('agreement_not_active');
    expect(billing.shouldHideCollectButton).toBe(true);
    expect(billing.collectPaymentAllowed).toBe(false);
  });

  it('4) hides collect when collect_allowed=false', () => {
    const billing = resolveBillingContextPresentation({
      workspace: {
        summary: {},
        collection_gate: { collect_allowed: false, collect_block_reason: 'agreement_not_active' },
      } as StudentFinanceWorkspace,
      canCollectCapability: true,
    });
    expect(billing.collectPaymentAllowed).toBe(false);
    expect(billing.shouldHideCollectButton).toBe(true);
  });
});

describe('resolveFinanceAgreementActions', () => {
  it('5) shows create agreement when create_agreement=true', () => {
    const actions = resolveFinanceAgreementActions({
      workspace: {
        summary: {},
        billing_context: { has_active_agreement: false },
        allowed_actions: { create_agreement: true },
      } as StudentFinanceWorkspace,
    });
    expect(actions.some((action) => action.kind === 'create_agreement' && action.enabled)).toBe(true);
  });

  it('6) shows disabled reset when endpoint is unavailable', () => {
    const reset = resolveResetFinancialAgreementPresentation({
      workspace: {
        summary: {},
        requires_finance_review: true,
        allowed_actions: { create_agreement: true },
      } as StudentFinanceWorkspace & { requires_finance_review?: boolean },
    });
    expect(reset.visible).toBe(true);
    expect(reset.enabled).toBe(false);

    const actions = resolveFinanceAgreementActions({
      workspace: {
        summary: {},
        requires_finance_review: true,
        allowed_actions: { create_agreement: true },
      } as StudentFinanceWorkspace & { requires_finance_review?: boolean },
      resetVisible: reset.visible,
      resetEnabled: reset.enabled,
    });
    const resetAction = actions.find((action) => action.kind === 'reset_financial_agreement');
    expect(resetAction?.enabled).toBe(false);
  });

  it('7) does not expose direct edit action for active agreement', () => {
    const actions = resolveFinanceAgreementActions({
      workspace: {
        summary: {},
        billing_context: { has_active_agreement: true },
        current_agreement: { id: 1, student_id: 5, state: 'active', allowed_actions: { edit: true } },
        allowed_actions: { edit: true, customize: true },
      } as StudentFinanceWorkspace,
    });
    expect(actions.some((action) => action.kind === 'customize_agreement')).toBe(false);
    expect(actions.some((action) => action.kind === 'create_amendment')).toBe(true);
  });
});

describe('Odoo remediation — active agreement FA/2026/00004', () => {
  const remediatedWorkspace = {
    summary: { remaining: 18300, total_agreed: 18300, currency: { id: 1, name: 'MAD' } },
    billing_context: { has_active_agreement: true },
    requires_finance_review: false,
    billing_partner: { id: 59, name: 'امحمد الطالبي' },
    fee_plan_used: { id: 101, name: 'الخطة المالية للتعليم الابتدائي 2026-2027' },
    inactive_agreement: { id: 3, state: 'cancelled', requires_review: false },
    current_agreement: {
      id: 4,
      student_id: 5,
      state: 'active',
      number: 'FA/2026/00004',
      net_amount: 18300,
      remaining_total: 18300,
      gross_amount: 18300,
      fee_plan_name: 'الخطة المالية للتعليم الابتدائي 2026-2027',
    },
    collection_gate: { collect_allowed: true, prepayment_allowed: true },
    allowed_actions: { collect_payment: true },
  } as StudentFinanceWorkspace & { requires_finance_review?: boolean; fee_plan_used?: { id: number; name: string } };

  it('1) shows active fee plan and current agreement after remediation', () => {
    const plan = resolveFeePlanPresentation({ workspace: remediatedWorkspace });
    expect(plan.agreementNumber).toBe('FA/2026/00004');
    expect(plan.agreementUiStatus).toBe('active');
    expect(plan.netAmount).toBe(18300);
    expect(plan.remainingAmount).toBe(18300);
    expect(plan.feePlanName).toContain('2026-2027');
    expect(plan.showAsInactive).toBe(false);
    expect(plan.billingPartnerLabel).toBe('امحمد الطالبي');
  });

  it('2) hides reset when requires_finance_review=false', () => {
    const reset = resolveResetFinancialAgreementPresentation({ workspace: remediatedWorkspace });
    expect(reset.visible).toBe(false);
  });

  it('3) allows collect when collect_allowed=true', () => {
    const billing = resolveBillingContextPresentation({
      workspace: remediatedWorkspace,
      canCollectCapability: true,
    });
    expect(billing.collectPaymentAllowed).toBe(true);
    expect(billing.shouldHideCollectButton).toBe(false);
  });

  it('4) does not show agreement_not_active alert after remediation', () => {
    const status = resolveAgreementStatusPresentation({
      workspace: remediatedWorkspace,
      collectBlockReason: null,
    });
    expect(status.uiStatus).toBe('active');
    expect(status.showCollectBlockedAlert).toBe(false);
    expect(status.requiresReview).toBe(false);
  });

  it('5) does not surface cancelled FA/2026/00003 as current agreement', () => {
    const plan = resolveFeePlanPresentation({ workspace: remediatedWorkspace });
    expect(plan.agreementNumber).not.toBe('FA/2026/00003');
    expect(plan.agreementState).toBe('active');
  });
});

describe('resolveFinanceOperationsHistory', () => {
  it('8) renders history when API returns entries and empty state otherwise', () => {
    const withHistory = resolveFinanceOperationsHistory({
      summary: {},
      finance_operations_history: [
        {
          id: 1,
          date: '2026-01-10',
          operation_type: 'cancel_agreement',
          user_name: 'sara',
          reference: 'FA/2026/00003',
        },
      ],
    } as StudentFinanceWorkspace & { finance_operations_history?: unknown[] });
    expect(withHistory).toHaveLength(1);
    expect(withHistory[0]?.reference).toBe('FA/2026/00003');
    expect(hasFinanceOperationsHistoryApi({
      summary: {},
      finance_operations_history: [{ id: 1 }],
    } as never)).toBe(true);

    expect(resolveFinanceOperationsHistory({ summary: {} } as StudentFinanceWorkspace)).toEqual([]);
    expect(hasFinanceOperationsHistoryApi({ summary: {} } as StudentFinanceWorkspace)).toBe(false);
  });
});

describe('resolveAgreementStatusPresentation', () => {
  it('shows collect blocked alert for cancelled agreement', () => {
    const status = resolveAgreementStatusPresentation({
      workspace: {
        summary: {},
        billing_context: { has_active_agreement: false },
        inactive_agreement: { id: 3, state: 'cancelled' },
        collection_gate: { collect_allowed: false, collect_block_reason: 'agreement_not_active' },
      } as StudentFinanceWorkspace,
      collectBlockReason: 'agreement_not_active',
    });
    expect(status.uiStatus).toBe('cancelled');
    expect(status.showCollectBlockedAlert).toBe(true);
  });
});
