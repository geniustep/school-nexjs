import { describe, expect, it } from 'vitest';
import {
  arrearsBillingPartnerId,
  buildArrearsCollectHref,
  buildFamilyCollectHref,
  computeArrearsSummaryFromRows,
  filterMergedRowsByTab,
  mergeArrearsRows,
  normalizeArrearsFollowupListItem,
  parseArrearsFollowupListResponse,
} from '@/lib/utils/normalize-arrears';

describe('normalizeArrearsFollowupListItem', () => {
  it('keeps billing_partner_id as canonical identity and reads account_kind', () => {
    const row = normalizeArrearsFollowupListItem({
      family_id: 6667,
      billing_partner_id: 6667,
      account_kind: 'individual',
      display_name: 'QA Family',
      student_count: 2,
      total_overdue: 1600,
      gross_overdue_amount: 1600,
      pending_cheque_coverage_amount: 1500,
      actionable_overdue_amount: 100,
      total_remaining: 1500,
      followup_status: 'needs_followup',
      followup_status_label: 'تحتاج متابعة',
      payment_promise_date: '2026-07-10',
      payment_promise_amount: '500',
      next_followup_date: '2026-07-05',
      assigned_user_name: 'done',
    });
    expect(row?.family_id).toBe(6667);
    expect(row?.billing_partner_id).toBe(6667);
    expect(row?.account_kind).toBe('individual');
    expect(row && arrearsBillingPartnerId(row)).toBe(6667);
    expect(row?.family_name).toBe('QA Family');
    expect(row?.total_overdue).toBe(1600);
    expect(row?.gross_overdue_amount).toBe(1600);
    expect(row?.pending_cheque_coverage_amount).toBe(1500);
    expect(row?.actionable_overdue_amount).toBe(100);
    expect(row?.payment_promise_amount).toBe(500);
    expect(row?.followup_status_label).toBe('تحتاج متابعة');
  });
});

describe('parseArrearsFollowupListResponse', () => {
  it('reads summary kpis from nested payload', () => {
    const parsed = parseArrearsFollowupListResponse({
      items: [{ family_id: 6667, display_name: 'QA Family' }],
      summary: {
        overdue_accounts_count: 4,
        overdue_families_count: 3,
        total_overdue_amount: 4200,
        actionable_overdue_accounts_count: 3,
        total_actionable_overdue_amount: 3700,
        total_pending_cheque_coverage_on_overdue: 500,
        payment_promises_count: 1,
        today_followups_count: 2,
      },
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.summary?.overdue_accounts_count).toBe(4);
    expect(parsed.summary?.overdue_families_count).toBe(3);
    expect(parsed.summary?.total_overdue_amount).toBe(4200);
    expect(parsed.summary?.actionable_overdue_accounts_count).toBe(3);
    expect(parsed.summary?.total_actionable_overdue_amount).toBe(3700);
    expect(parsed.summary?.total_pending_cheque_coverage_on_overdue).toBe(500);
  });

  it('does not reinterpret legacy overdue_count as all overdue accounts', () => {
    const parsed = parseArrearsFollowupListResponse({
      items: [],
      summary: { overdue_count: 3 },
    });
    expect(parsed.summary?.overdue_accounts_count).toBeUndefined();
    expect(parsed.summary?.overdue_families_count).toBe(3);
  });
});

describe('mergeArrearsRows', () => {
  it('merges billing accounts with followup enrichment', () => {
    const merged = mergeArrearsRows(
      [
        {
          billing_partner_id: 6667,
          display_name: 'Billing Name',
          student_count: 2,
          total_overdue: 1000,
          total_remaining: 800,
        },
      ],
      [
        {
          family_id: 6667,
          followup_status: 'payment_promise',
          followup_status_label: 'وعد بالدفع',
          next_followup_date: '2026-07-06',
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]?.family_id).toBe(6667);
    expect(merged[0]?.display_name).toBe('Billing Name');
    expect(merged[0]?.followup_status_label).toBe('وعد بالدفع');
    expect(merged[0]?.next_followup_date).toBe('2026-07-06');
  });
});

describe('filterMergedRowsByTab', () => {
  const rows = [
    {
      family_id: 1,
      billing_partner_id: 1,
      followup_status: 'needs_followup',
    },
    {
      family_id: 2,
      billing_partner_id: 2,
      followup_status: 'resolved',
    },
  ] as ReturnType<typeof mergeArrearsRows>;

  it('filters by followup family ids when provided', () => {
    expect(filterMergedRowsByTab(rows, 'needs_followup', new Set([1]))).toHaveLength(1);
    expect(filterMergedRowsByTab(rows, 'needs_followup', new Set([1]))[0]?.family_id).toBe(1);
  });

  it('filters resolved by status when no id set', () => {
    expect(filterMergedRowsByTab(rows, 'resolved', new Set())).toHaveLength(1);
    expect(filterMergedRowsByTab(rows, 'resolved', new Set())[0]?.family_id).toBe(2);
  });
});

describe('computeArrearsSummaryFromRows', () => {
  const paginatedRows = [
    {
      family_id: 6667,
      billing_partner_id: 6667,
      total_overdue: 1000,
      payment_promise_date: '2026-07-10',
      next_followup_date: '2026-07-10',
    },
  ] as ReturnType<typeof mergeArrearsRows>;

  it('does not derive KPI values from paginated rows when backend summary is absent', () => {
    const summary = computeArrearsSummaryFromRows(paginatedRows, null);
    expect(summary).toEqual({});
  });

  it('preserves a partial backend summary without filling missing fields from rows', () => {
    const summary = computeArrearsSummaryFromRows(paginatedRows, {
      overdue_families_count: 17,
      total_overdue_amount: 4200,
    });
    expect(summary).toEqual({
      overdue_families_count: 17,
      total_overdue_amount: 4200,
    });
    expect(summary.payment_promises_count).toBeUndefined();
    expect(summary.today_followups_count).toBeUndefined();
  });
});

describe('buildFamilyCollectHref', () => {
  it('builds billing account family collect link', () => {
    expect(buildFamilyCollectHref(6667, '/admin/finance/arrears')).toBe(
      '/admin/finance/billing-accounts/6667?family_collect=1&returnTo=%2Fadmin%2Ffinance%2Farrears',
    );
  });

  it('includes arrears suggestion params when provided', () => {
    expect(
      buildFamilyCollectHref(6667, '/admin/finance/arrears', {
        source: 'arrears',
        suggestedAmount: 1500,
      }),
    ).toBe(
      '/admin/finance/billing-accounts/6667?family_collect=1&returnTo=%2Fadmin%2Ffinance%2Farrears&source=arrears&suggested_amount=1500',
    );
  });
});

describe('buildArrearsCollectHref', () => {
  it('keeps the family collection flow for family accounts', () => {
    expect(
      buildArrearsCollectHref(
        {
          family_id: 6667,
          billing_partner_id: 6667,
          account_kind: 'family',
          total_overdue: 1600,
          actionable_overdue_amount: 100,
        },
        '/admin/finance/arrears',
      ),
    ).toBe(
      '/admin/finance/billing-accounts/6667?family_collect=1&returnTo=%2Fadmin%2Ffinance%2Farrears&source=arrears&suggested_amount=100',
    );
  });

  it('uses the existing individual collection flow for individual accounts', () => {
    expect(
      buildArrearsCollectHref(
        {
          family_id: 7001,
          billing_partner_id: 7001,
          account_kind: 'individual',
          total_overdue: 1600,
          actionable_overdue_amount: 100,
        },
        '/admin/finance/arrears',
      ),
    ).toBe(
      '/admin/finance/collections/new?billing_partner_id=7001&returnTo=%2Fadmin%2Ffinance%2Farrears&suggested_amount=100',
    );
  });
});
