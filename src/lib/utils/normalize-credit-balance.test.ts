import { describe, expect, it } from 'vitest';
import {
  aggregateCreditListSummary,
  applyCreditErrorMessageKey,
  canShowApplyCreditButton,
  collectionToCreditSourceFallback,
  creditBalanceDetailErrorMessageKey,
  deriveCreditLifecycleState,
  normalizeBillingAccountCreditDetail,
  normalizeCollectionCreditDetail,
  normalizeCreditBalanceListItem,
  parseCreditBalanceListResponse,
} from '@/lib/utils/normalize-credit-balance';
import {
  buildApplyCreditPayload,
  validateApplyCreditAllocations,
} from '@/features/admin/finance/credit-balance/apply-credit-drawer';
import type { FinanceInstallment } from '@/types/finance';

const LIVE_LIST_ITEM = {
  billing_account: { id: 6988, display_name: 'QA FIN Billing Partner 822' },
  billing_partner_id: 6988,
  credit: {
    gross_unallocated_amount: 1150,
    pending_unallocated_amount: 0,
    available_credit_amount: 0,
    blocked_unallocated_amount: 1150,
    applied_credit_amount: 0,
    refundable_credit_amount: 0,
    currency: 'MAD',
  },
  gross_unallocated_amount: 1150,
  pending_unallocated_amount: 0,
  available_credit_amount: 0,
  blocked_unallocated_amount: 1150,
  applied_credit_amount: 0,
  refundable_credit_amount: 0,
  source_count: 3,
  allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
};

const LIVE_DETAIL_ENVELOPE = {
  billing_account: {
    id: 6988,
    name: 'QA FIN Billing Partner 822',
    display_name: 'QA FIN Billing Partner 822',
    reference: null,
  },
  billing_partner_id: 6988,
  credit: {
    gross_unallocated_amount: 1150,
    pending_unallocated_amount: 0,
    available_credit_amount: 0,
    blocked_unallocated_amount: 1150,
    applied_credit_amount: 0,
    refundable_credit_amount: 0,
    currency: 'MAD',
  },
  allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
  sources: [
    {
      collection_id: 635,
      amount: 500,
      gross_unallocated_amount: 500,
      available_credit_amount: 0,
      blocked_unallocated_amount: 500,
      block_reason: 'cheque_bounced',
      blocked_reason: 'cheque_bounced',
      allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
    },
    {
      collection_id: 640,
      amount: 500,
      gross_unallocated_amount: 500,
      available_credit_amount: 0,
      blocked_unallocated_amount: 500,
      block_reason: 'cheque_replaced',
      blocked_reason: 'cheque_replaced',
      allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
    },
    {
      collection_id: 644,
      amount: 150,
      gross_unallocated_amount: 150,
      available_credit_amount: 0,
      blocked_unallocated_amount: 150,
      block_reason: 'cheque_bounced',
      blocked_reason: 'cheque_bounced',
      allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
    },
  ],
  applications: [],
};

const LIVE_COLLECTION_635 = {
  collection_id: 635,
  receipt_number: 'PAY/2026/000002',
  amount: 500,
  allocated_amount: 0,
  unallocated_amount: 500,
  gross_unallocated_amount: 500,
  pending_unallocated_amount: 0,
  available_credit_amount: 0,
  blocked_unallocated_amount: 500,
  settlement_status: 'cheque_bounced',
  lifecycle_state: 'blocked',
  block_reason: 'cheque_bounced',
  allowed_actions: ['view_credit', 'view_source_collection', 'view_receipt'],
  applications: [],
};

describe('normalize credit balance list', () => {
  it('normalizes live list item with nested credit', () => {
    const row = normalizeCreditBalanceListItem(LIVE_LIST_ITEM);
    expect(row?.billing_partner_id).toBe(6988);
    expect(row?.gross_unallocated_amount).toBe(1150);
    expect(row?.available_credit_amount).toBe(0);
    expect(row?.blocked_unallocated_amount).toBe(1150);
    expect(row?.lifecycle_state).toBe('blocked');
  });

  it('parses list envelope with pagination total', () => {
    const parsed = parseCreditBalanceListResponse([LIVE_LIST_ITEM], {
      pagination: { page: 1, page_size: 5, total: 1, total_pages: 1 },
    });
    expect(parsed.items).toHaveLength(1);
  });

  it('keeps gross separate from available for live QA state', () => {
    const row = normalizeCreditBalanceListItem(LIVE_LIST_ITEM)!;
    expect(row.gross_unallocated_amount).toBe(1150);
    expect(row.available_credit_amount).toBe(0);
    expect(row.blocked_unallocated_amount).toBe(1150);
    expect(deriveCreditLifecycleState(row)).toBe('blocked');
  });
});

describe('normalize collection credit detail', () => {
  it('normalizes blocked collection 635', () => {
    const detail = normalizeCollectionCreditDetail(LIVE_COLLECTION_635);
    expect(detail?.collection_id).toBe(635);
    expect(detail?.available_credit_amount).toBe(0);
    expect(detail?.block_reason).toBe('cheque_bounced');
    expect(canShowApplyCreditButton(detail!)).toBe(false);
  });

  it('shows apply only when available and apply_credit action present', () => {
    expect(
      canShowApplyCreditButton({
        available_credit_amount: 300,
        allowed_actions: ['apply_credit'],
      }),
    ).toBe(true);
    expect(
      canShowApplyCreditButton({
        available_credit_amount: 300,
        allowed_actions: ['view_credit'],
      }),
    ).toBe(false);
    expect(
      canShowApplyCreditButton({
        available_credit_amount: 0,
        allowed_actions: ['apply_credit'],
      }),
    ).toBe(false);
  });
});

describe('billing account credit detail normalization', () => {
  it('uses official detail envelope as source of truth', () => {
    const detail = normalizeBillingAccountCreditDetail(LIVE_DETAIL_ENVELOPE);
    expect(detail?.billing_partner_id).toBe(6988);
    expect(detail?.gross_unallocated_amount).toBe(1150);
    expect(detail?.available_credit_amount).toBe(0);
    expect(detail?.blocked_unallocated_amount).toBe(1150);
    expect(detail?.sources).toHaveLength(3);
    expect(detail?.applications).toEqual([]);
    expect(detail?.allowed_actions).toEqual([
      'view_credit',
      'view_source_collection',
      'view_receipt',
    ]);
    expect(detail?.lifecycle_state).toBe('blocked');
  });

  it('reads sources from official response including blocked_reason alias', () => {
    const detail = normalizeBillingAccountCreditDetail(LIVE_DETAIL_ENVELOPE);
    const source640 = detail?.sources.find((s) => s.collection_id === 640);
    expect(source640?.block_reason).toBe('cheque_replaced');
    expect(source640?.available_credit_amount).toBe(0);
  });

  it('does not expose apply_credit when backend omits it', () => {
    const detail = normalizeBillingAccountCreditDetail(LIVE_DETAIL_ENVELOPE)!;
    expect(canShowApplyCreditButton(detail)).toBe(false);
  });
});

describe('apply credit validation', () => {
  const installments: FinanceInstallment[] = [
    {
      id: 1,
      student_id: 822,
      remaining_amount: 200,
      payment_status: 'unpaid',
      state: 'planned',
    },
    {
      id: 2,
      student_id: 823,
      remaining_amount: 150,
      payment_status: 'unpaid',
      state: 'planned',
    },
  ];

  it('prevents exceeding available credit', () => {
    const error = validateApplyCreditAllocations({
      availableAmount: 100,
      values: { 1: '120' },
      installments,
    });
    expect(error).toBe('allocationExceedsCredit');
  });

  it('prevents exceeding installment remaining', () => {
    const error = validateApplyCreditAllocations({
      availableAmount: 500,
      values: { 1: '250' },
      installments,
    });
    expect(error).toBe('allocationExceedsReceivable');
  });

  it('allows multi-installment allocation within credit', () => {
    const error = validateApplyCreditAllocations({
      availableAmount: 300,
      values: { 1: '100', 2: '150' },
      installments,
    });
    expect(error).toBeNull();
    const payload = buildApplyCreditPayload({ 1: '100', 2: '150' });
    expect(payload.allocations).toEqual([
      { installment_id: 1, amount: 100 },
      { installment_id: 2, amount: 150 },
    ]);
  });
});

describe('apply credit error mapping', () => {
  it('maps official error codes', () => {
    expect(applyCreditErrorMessageKey('credit_source_bounced')).toBe(
      'admin.finance.creditBalances.applyErrors.creditSourceBounced',
    );
    expect(applyCreditErrorMessageKey('credit_not_available')).toBe(
      'admin.finance.creditBalances.applyErrors.creditNotAvailable',
    );
  });
});

describe('detail error mapping', () => {
  it('maps detail load failure to dedicated message key', () => {
    expect(creditBalanceDetailErrorMessageKey('server_error')).toBe(
      'admin.finance.creditBalances.errors.detailLoadFailed',
    );
    expect(creditBalanceDetailErrorMessageKey('billing_account_not_found')).toBe(
      'admin.finance.creditBalances.errors.notFound',
    );
  });
});

describe('aggregate list summary', () => {
  it('aggregates when single page only', () => {
    const row = normalizeCreditBalanceListItem(LIVE_LIST_ITEM)!;
    const summary = aggregateCreditListSummary([row], {
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1,
    });
    expect(summary?.gross_unallocated_amount).toBe(1150);
    expect(summary?.available_credit_amount).toBe(0);
  });

  it('returns null for multi-page lists', () => {
    const summary = aggregateCreditListSummary([], {
      page: 1,
      page_size: 20,
      total: 50,
      total_pages: 3,
    });
    expect(summary).toBeNull();
  });
});

describe('collection fallback source (legacy helper only)', () => {
  it('does not treat unallocated collection as available credit', () => {
    const source = collectionToCreditSourceFallback({
      id: 635,
      unallocated_amount: 500,
      amount: 500,
      allowed_actions: ['view_credit'],
    });
    expect(source?.unallocated_amount).toBe(500);
    expect(source?.available_credit_amount).toBeUndefined();
  });
});

describe('lifecycle derivation', () => {
  it('detects pending state separately', () => {
    expect(
      deriveCreditLifecycleState({
        gross_unallocated_amount: 500,
        pending_unallocated_amount: 500,
        available_credit_amount: 0,
        blocked_unallocated_amount: 0,
      }),
    ).toBe('pending');
  });

  it('detects available state', () => {
    expect(
      deriveCreditLifecycleState({
        gross_unallocated_amount: 500,
        pending_unallocated_amount: 0,
        available_credit_amount: 500,
        blocked_unallocated_amount: 0,
      }),
    ).toBe('available');
  });
});

describe('block reason translation keys', () => {
  it('uses i18n keys for cheque_bounced and cheque_replaced', () => {
    expect('admin.finance.creditBalances.blockReasons.cheque_bounced').toContain(
      'cheque_bounced',
    );
    expect('admin.finance.creditBalances.blockReasons.cheque_replaced').toContain(
      'cheque_replaced',
    );
  });
});
