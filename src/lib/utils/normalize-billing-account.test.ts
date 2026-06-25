import { describe, expect, it } from 'vitest';
import {
  billingAccountErrorMessageKey,
  billingAccountHasFinancialData,
  buildBillingAccountCollectHref,
  buildBillingAccountDrillDownHref,
  normalizeAllowedActions,
  normalizeBillingAccountList,
  normalizeBillingAccountListItem,
  normalizeBillingAccountSummary,
  normalizeBillingActivityStateKey,
  parseBillingAccountListResponse,
  resolveBillingActivityStateLabel,
  resolveBillingActivityTypeLabel,
} from '@/lib/utils/normalize-billing-account';

describe('normalizeBillingAccountListItem', () => {
  it('reads billing_partner_id from nested partner', () => {
    const row = normalizeBillingAccountListItem({
      billing_partner: { id: 6988, display_name: 'QA Partner' },
      total_due: 1000,
      confirmed_paid: 900,
      unallocated_collection_amount: 100,
    });
    expect(row?.billing_partner_id).toBe(6988);
    expect(row?.display_name).toBe('QA Partner');
    expect(row?.total_due).toBe(1000);
    expect(row?.confirmed_paid).toBe(900);
    expect(row?.unallocated_collection_amount).toBe(100);
  });
});

describe('parseBillingAccountListResponse', () => {
  it('uses pagination.total from meta', () => {
    const parsed = parseBillingAccountListResponse(
      [{ billing_partner_id: 1, display_name: 'A' }],
      {
        pagination: { page: 1, page_size: 20, total: 42, total_pages: 3 },
      },
    );
    expect(parsed.items).toHaveLength(1);
    expect(parsed.pagination?.total).toBe(42);
    expect(parsed.items.length).not.toBe(parsed.pagination?.total);
  });
});

describe('normalizeBillingAccountList', () => {
  it('accepts bare array payloads', () => {
    expect(
      normalizeBillingAccountList([{ billing_partner_id: 2, display_name: 'Guardian' }]),
    ).toHaveLength(1);
  });
});

describe('normalizeBillingAccountSummary', () => {
  it('normalizes multi-child fixture without double counting', () => {
    const summary = normalizeBillingAccountSummary({
      billing_account: { id: 10, display_name: 'Family' },
      summary: {
        student_count: 2,
        confirmed_collection_amount: 1000,
        confirmed_paid: 900,
        unallocated_collection_amount: 100,
      },
      students: [
        { student_id: 1, student_name: 'A', total_due: 500 },
        { student_id: 2, student_name: 'B', total_due: 500 },
      ],
      recent_activity: [],
      allowed_actions: ['view_summary', 'view_collections'],
    });
    expect(summary?.summary.student_count).toBe(2);
    expect(summary?.summary.confirmed_collection_amount).toBe(1000);
    expect(summary?.summary.confirmed_paid).toBe(900);
    expect(summary?.summary.unallocated_collection_amount).toBe(100);
    expect(summary?.students).toHaveLength(2);
  });

  it('handles empty account', () => {
    const summary = normalizeBillingAccountSummary({
      billing_account: { id: 6988, display_name: 'Empty' },
      summary: {
        student_count: 0,
        total_due: 0,
        confirmed_paid: 0,
        unallocated_collection_amount: 0,
      },
      students: [],
      recent_activity: [],
      allowed_actions: ['view_summary'],
    });
    expect(summary?.students).toHaveLength(0);
    expect(billingAccountHasFinancialData(summary!.summary)).toBe(false);
  });
});

describe('normalizeAllowedActions', () => {
  it('filters unknown actions', () => {
    expect(normalizeAllowedActions(['view_receipts', 'unknown'])).toEqual(['view_receipts']);
  });

  it('reads map-style allowed actions', () => {
    expect(
      normalizeAllowedActions({ view_cheques: true, collect_payment: false }),
    ).toEqual(['view_cheques']);
  });
});

describe('billingAccountErrorMessageKey', () => {
  it('maps academic_year_out_of_scope', () => {
    expect(billingAccountErrorMessageKey('academic_year_out_of_scope')).toBe(
      'admin.finance.billingAccounts.errors.yearOutOfScope',
    );
  });
});

describe('drill-down helpers', () => {
  it('builds filtered drill-down hrefs', () => {
    expect(buildBillingAccountDrillDownHref('installments', 5, '/admin/finance/billing-accounts/5')).toBe(
      '/admin/finance/installments?billing_partner_id=5&returnTo=%2Fadmin%2Ffinance%2Fbilling-accounts%2F5',
    );
    expect(buildBillingAccountDrillDownHref('collections', 5, '/x')).toContain('billing_partner_id=5');
    expect(buildBillingAccountDrillDownHref('receipts', 5, '/x')).toContain('billing_partner_id=5');
    expect(buildBillingAccountDrillDownHref('agreements', 5, '/x')).toContain('billing_partner_id=5');
    expect(buildBillingAccountDrillDownHref('cheques', 5, '/x')).toContain('billing_partner_id=5');
  });

  it('builds collect href with returnTo', () => {
    const href = buildBillingAccountCollectHref(9, '/admin/finance/billing-accounts/9', 1);
    expect(href).toContain('billing_partner_id=9');
    expect(href).toContain('returnTo=');
    expect(href).toContain('academic_year_id=1');
  });
});

describe('financial metric separation', () => {
  it('keeps confirmed_paid separate from collection amount', () => {
    const row = normalizeBillingAccountListItem({
      billing_partner_id: 1,
      confirmed_paid: 900,
      confirmed_collection_amount: 1000,
      unallocated_collection_amount: 100,
    });
    expect(row?.confirmed_paid).toBe(900);
    expect(row?.confirmed_collection_amount).toBe(1000);
    expect(row?.confirmed_paid).not.toBe(row?.confirmed_collection_amount);
  });
});

describe('billing account activity labels', () => {
  const t = (key: string) => {
    const map: Record<string, string> = {
      'admin.finance.billingAccounts.activity.types.cheque_received': 'استلام شيك',
      'admin.finance.billingAccounts.activity.types.cheque_collected': 'تحصيل شيك',
      'admin.finance.billingAccounts.activity.states.deposited': 'مودع',
      'admin.finance.billingAccounts.activity.states.bounced': 'مرتجع',
    };
    return map[key] ?? key;
  };

  it('resolves known activity types', () => {
    expect(
      resolveBillingActivityTypeLabel({ activity_type: 'cheque_received' }, t),
    ).toBe('استلام شيك');
    expect(
      resolveBillingActivityTypeLabel({ activity_type: 'cheque_collected' }, t),
    ).toBe('تحصيل شيك');
  });

  it('prefers backend label when provided', () => {
    expect(
      resolveBillingActivityTypeLabel(
        { activity_type: 'cheque_received', label: 'Custom label' },
        t,
      ),
    ).toBe('Custom label');
  });

  it('normalizes activity state labels from API English text', () => {
    expect(normalizeBillingActivityStateKey(null, 'Deposited')).toBe('deposited');
    expect(normalizeBillingActivityStateKey('bounced', null)).toBe('bounced');
    expect(resolveBillingActivityStateLabel({ state_label: 'Deposited' }, t)).toBe('مودع');
    expect(resolveBillingActivityStateLabel({ state: 'bounced' }, t)).toBe('مرتجع');
  });
});
