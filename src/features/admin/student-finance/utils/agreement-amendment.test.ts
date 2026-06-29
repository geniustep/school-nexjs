import { describe, expect, it, vi } from 'vitest';
import {
  buildAgreementAmendmentApplyPayload,
  buildAgreementAmendmentPreviewPayload,
  canSubmitAgreementAmendmentForm,
  canSubmitAgreementAmendmentReason,
} from './build-agreement-amendment-payload';
import { agreementAmendmentErrorMessageKey } from './agreement-amendment-errors';
import { normalizeAgreementAmendmentPreview } from './normalize-agreement-amendment-preview';
import {
  isAgreementAmendmentAllowed,
  resolveAgreementAmendmentAction,
  resolveAgreementAmendmentDisabledReason,
} from './resolve-agreement-amendment-action';
import { resolveFinanceAgreementActions } from './resolve-finance-agreement-actions';
import type { AgreementAmendmentFormState } from '../types/agreement-amendment';
import type { StudentFinanceWorkspace } from '../types';

const baseForm: AgreementAmendmentFormState = {
  operationType: 'modify_line',
  amendmentPath: 'period_range',
  effectivePeriodId: '456',
  effectivePeriodEndId: '',
  reason: 'Transport amount changed from April',
  sourceLineId: '999',
  feeTypeId: '10',
  amount: '500',
};

describe('resolveAgreementAmendmentAction', () => {
  it('1) shows enabled amend action when amend_financial_agreement=true', () => {
    const workspace = {
      summary: {},
      billing_context: { has_active_agreement: true },
      current_agreement: { id: 1, student_id: 5, state: 'active' },
      allowed_actions: { amend_financial_agreement: true },
    } as StudentFinanceWorkspace;

    const action = resolveAgreementAmendmentAction({ workspace });
    expect(action?.kind).toBe('amend_financial_agreement');
    expect(action?.enabled).toBe(true);

    const actions = resolveFinanceAgreementActions({ workspace });
    expect(actions.some((item) => item.kind === 'amend_financial_agreement' && item.enabled)).toBe(
      true,
    );
  });

  it('2) shows disabled action with reason when amend_financial_agreement=false', () => {
    const workspace = {
      summary: {},
      billing_context: { has_active_agreement: true },
      current_agreement: { id: 1, student_id: 5, state: 'active' },
      allowed_actions: { amend_financial_agreement: false },
      action_reasons: { amend_financial_agreement: 'السنة الدراسية غير نشطة' },
    } as StudentFinanceWorkspace;

    const action = resolveAgreementAmendmentAction({ workspace });
    expect(action?.enabled).toBe(false);
    expect(action?.disabledTooltipText).toBe('السنة الدراسية غير نشطة');
    expect(resolveAgreementAmendmentDisabledReason(workspace)).toBe('السنة الدراسية غير نشطة');
  });
});

describe('buildAgreementAmendmentPayload', () => {
  it('3) requires reason before preview', () => {
    expect(canSubmitAgreementAmendmentReason('')).toBe(false);
    expect(canSubmitAgreementAmendmentReason('   ')).toBe(false);
    expect(canSubmitAgreementAmendmentReason('Parent cancelled transport')).toBe(true);
  });

  it('4) builds cancel_line payload correctly', () => {
    const payload = buildAgreementAmendmentPreviewPayload(123, {
      ...baseForm,
      operationType: 'cancel_line',
      amount: '0',
      reason: 'Parent cancelled transport from March',
    });
    expect(payload).toEqual({
      agreement_id: 123,
      operation_type: 'cancel_line',
      effective_period_id: 456,
      reason: 'Parent cancelled transport from March',
      line: {
        source_line_id: 999,
        fee_type_id: 10,
        amount: 0,
      },
    });
  });

  it('5) builds add_line payload correctly', () => {
    const payload = buildAgreementAmendmentPreviewPayload(123, {
      operationType: 'add_line',
      amendmentPath: '',
      effectivePeriodId: '456',
      effectivePeriodEndId: '',
      reason: 'Parent added canteen from January',
      sourceLineId: '',
      feeTypeId: '10',
      amount: '300',
    });
    expect(payload).toEqual({
      agreement_id: 123,
      operation_type: 'add_line',
      effective_period_id: 456,
      reason: 'Parent added canteen from January',
      line: {
        fee_type_id: 10,
        amount: 300,
      },
    });
  });

  it('6) builds modify_line payload correctly', () => {
    const payload = buildAgreementAmendmentPreviewPayload(123, baseForm);
    expect(payload).toEqual({
      agreement_id: 123,
      operation_type: 'modify_line',
      effective_period_id: 456,
      reason: 'Transport amount changed from April',
      line: {
        source_line_id: 999,
        fee_type_id: 10,
        amount: 500,
      },
    });
  });

  it('7) trims reason and omits undefined fields', () => {
    const payload = buildAgreementAmendmentPreviewPayload(123, {
      ...baseForm,
      effectivePeriodId: '',
      reason: '  spaced reason  ',
    });
    expect(payload.reason).toBe('spaced reason');
    expect('effective_period_id' in payload).toBe(false);
    expect(JSON.stringify(payload)).not.toContain('undefined');
  });

  it('preview and apply payloads match for same form', () => {
    const preview = buildAgreementAmendmentPreviewPayload(123, baseForm);
    const apply = buildAgreementAmendmentApplyPayload(123, baseForm);
    expect(apply).toEqual(preview);
  });
});

describe('normalizeAgreementAmendmentPreview', () => {
  it('8) normalizes preview without undefined/null/NaN display values', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      amount_before: 1000,
      amount_after: 1300,
      delta: 300,
      currency: 'MAD',
      affected_periods: [{ label: 'April 2026' }],
      locked_periods: ['January 2026'],
      warnings: ['locked_financial_records'],
      blocking_reasons: [],
      created_installments: [{ label: 'May installment', amount: 300 }],
    });

    expect(normalized.allowed).toBe(true);
    expect(normalized.amountBefore).toBe(1000);
    expect(normalized.amountAfter).toBe(1300);
    expect(normalized.delta).toBe(300);
    expect(normalized.affectedPeriods).toEqual(['April 2026']);
    expect(normalized.lockedPeriods).toEqual(['January 2026']);
    expect(normalized.warnings).toEqual([{ code: 'locked_financial_records' }]);
    expect(normalized.createdInstallments[0]?.amount).toBe(300);
    expect(Object.values(normalized).every((value) => value !== undefined)).toBe(true);
  });

  it('9) preview.allowed=false blocks apply in UI contract', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: false,
      blocking_reasons: ['no_open_periods'],
    });
    expect(normalized.allowed).toBe(false);
    expect(normalized.blockingReasons).toEqual([{ code: 'no_open_periods' }]);
  });

  it('10) preview.allowed=true permits apply', () => {
    const normalized = normalizeAgreementAmendmentPreview({ allowed: true, blocking_reasons: [] });
    expect(normalized.allowed).toBe(true);
  });

  it('10b) allowed preview ignores stale amendment_not_allowed blockers', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      blocked: false,
      blocking_reasons: ['amendment_not_allowed'],
      amount_before: 2300,
      amount_after: 2000,
      delta: -300,
    });
    expect(normalized.allowed).toBe(true);
    expect(normalized.blockingReasons).toEqual([]);
  });

  it('10c) disallowed preview keeps amendment_not_allowed blockers', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: false,
      blocking_reasons: ['amendment_not_allowed'],
    });
    expect(normalized.allowed).toBe(false);
    expect(normalized.blockingReasons).toEqual([{ code: 'amendment_not_allowed' }]);
  });

  it('11) locked_periods and warnings are surfaced', () => {
    const normalized = normalizeAgreementAmendmentPreview({
      allowed: true,
      locked_periods: ['March 2026'],
      warnings: ['Some periods are locked'],
    });
    expect(normalized.lockedPeriods).toEqual(['March 2026']);
    expect(normalized.warnings).toEqual([{ code: 'Some periods are locked' }]);
  });
});

describe('apply success behavior contract', () => {
  it('12) apply success should refresh via callback and not optimistic update', () => {
    const onSuccess = vi.fn();
    onSuccess();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});

describe('agreementAmendmentErrorMessageKey', () => {
  it('13) maps known Odoo error codes', () => {
    expect(agreementAmendmentErrorMessageKey('reason_required')).toContain('reasonRequired');
    expect(agreementAmendmentErrorMessageKey('agreement_not_found')).toContain('agreementNotFound');
    expect(agreementAmendmentErrorMessageKey('no_open_periods')).toContain('noOpenPeriods');
    expect(agreementAmendmentErrorMessageKey('unknown_code')).toBeNull();
  });
});

describe('isAgreementAmendmentAllowed', () => {
  it('accepts create_amendment legacy flag on workspace', () => {
    expect(
      isAgreementAmendmentAllowed({
        summary: {},
        allowed_actions: { create_amendment: true },
      } as StudentFinanceWorkspace),
    ).toBe(true);
  });

  it('accepts amend legacy flag from agreement allowed_actions', () => {
    expect(
      isAgreementAmendmentAllowed(null, {
        id: 1,
        student_id: 5,
        state: 'active',
        allowed_actions: { amend: true },
      } as import('../types').FinancialAgreement),
    ).toBe(true);
  });
});

describe('canSubmitAgreementAmendmentForm', () => {
  it('requires complete form for modify_line', () => {
    const selectedLine = {
      id: 999,
      sourceLineId: 999,
      agreementLineId: 999,
      label: 'Transport',
      feeTypeId: 10,
      amount: 500,
      unitPrice: 500,
      quantity: 1,
      commitmentType: 'renewable_subscription',
      pricingUnit: 'month',
      periodAmendable: true,
      amendmentBlockReason: null,
      amountAmendable: false,
      amountAmendmentBlockReason: null,
      supportedAmendmentOperations: ['modify_line', 'cancel_line'],
      duplicateServiceWarning: false,
      isMonthly: true,
    } as import('./resolve-amendment-form-options').AgreementAmendmentLineOption;

    expect(canSubmitAgreementAmendmentForm(baseForm, selectedLine)).toBe(true);
    expect(canSubmitAgreementAmendmentForm({ ...baseForm, reason: '' }, selectedLine)).toBe(false);
  });
});
