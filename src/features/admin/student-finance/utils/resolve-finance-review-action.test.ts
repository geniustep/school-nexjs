import { describe, expect, it } from 'vitest';
import {
  isResolveFinanceReviewAllowed,
  resolveFinanceReviewResolveAction,
} from './resolve-finance-review-action';
import { resolveFinanceAgreementActions } from './resolve-finance-agreement-actions';
import type { StudentFinanceWorkspace } from '../types';

function baseWorkspace(
  overrides: Partial<StudentFinanceWorkspace> & {
    finance_review_details?: unknown;
    finance_review_reasons?: string[];
  } = {},
): StudentFinanceWorkspace {
  return {
    summary: {},
    requires_finance_review: true,
    billing_context: { has_active_agreement: true },
    finance_review_reasons: ['billing_partner_mismatch'],
    finance_review_details: [
      {
        code: 'billing_partner_mismatch',
        agreement_partner: { id: 1, name: 'A' },
        profile_partner: { id: 2, name: 'B' },
        resolution_available: true,
      },
    ],
    current_agreement: { id: 67, student_id: 11, state: 'active' },
    ...overrides,
  } as StudentFinanceWorkspace;
}

describe('resolveFinanceReviewResolveAction', () => {
  it('2) shows enabled resolve action when backend allows', () => {
    const workspace = baseWorkspace({
      allowed_actions: { resolve_finance_review: true },
    });
    const action = resolveFinanceReviewResolveAction({ workspace });
    expect(action?.kind).toBe('resolve_finance_review');
    expect(action?.enabled).toBe(true);
    expect(isResolveFinanceReviewAllowed(workspace)).toBe(true);

    const actions = resolveFinanceAgreementActions({ workspace });
    expect(actions.some((item) => item.kind === 'resolve_finance_review' && item.enabled)).toBe(
      true,
    );
  });

  it('3) hides action when resolve is not allowed and no disabled reason', () => {
    const workspace = baseWorkspace({
      allowed_actions: { resolve_finance_review: false },
    });
    expect(resolveFinanceReviewResolveAction({ workspace })).toBeNull();
  });

  it('3b) shows disabled action with backend reason when blocked', () => {
    const workspace = baseWorkspace({
      allowed_actions: { resolve_finance_review: false },
      action_reasons: { resolve_finance_review: 'لا تملك صلاحية حل المراجعة' },
    });
    const action = resolveFinanceReviewResolveAction({ workspace });
    expect(action?.enabled).toBe(false);
    expect(action?.disabledTooltipText).toBe('لا تملك صلاحية حل المراجعة');
  });

  it('3c) disables action when resolution_available=false', () => {
    const workspace = baseWorkspace({
      allowed_actions: { resolve_finance_review: true },
      finance_review_details: [
        {
          code: 'billing_partner_mismatch',
          agreement_partner: { id: 1, name: 'A' },
          profile_partner: { id: 2, name: 'B' },
          resolution_available: false,
          resolution_block_reason: 'الاتفاق مقفل مؤقتًا',
        },
      ],
    });
    const action = resolveFinanceReviewResolveAction({ workspace });
    expect(action?.enabled).toBe(false);
    expect(action?.disabledTooltipText).toBe('الاتفاق مقفل مؤقتًا');
  });
});
