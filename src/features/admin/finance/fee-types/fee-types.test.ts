import { describe, expect, it } from 'vitest';
import {
  buildFeeTypeListPath,
  buildFeeTypeUpdatePayload,
  feeTypeActiveQueryParam,
  feeTypeAllowsAction,
  feeTypeCurrencyId,
  feeTypeFormValuesFromDetail,
  feeTypeUsageIsEmpty,
  normalizeAllowedActions,
  normalizeFeeTypeCurrency,
  normalizeFeeTypeDetail,
  normalizeFeeTypeList,
  normalizeFeeTypeListItem,
  parseFeeTypeActiveFilter,
  resolveFeeTypeErrorCode,
} from '@/features/admin/finance/fee-types/normalize-fee-type';
import { appendReturnTo, isSafeInternalReturnPath, sanitizeReturnTo } from '@/lib/utils/safe-return-url';

const listItemRaw = {
  id: 333,
  name: 'QA CANTEEN PACKAGE 20 EXTRA',
  code: 'QA_CANT_PKGX_1781436305',
  category: 'canteen',
  frequency: 'custom',
  default_amount: 450,
  currency: { id: 109, name: 'MAD', symbol: 'DH', decimal_places: 2 },
  active: true,
  school_id: 3,
  usage_summary: {
    is_used: true,
    historical_usage: true,
    can_delete: false,
  },
  allowed_actions: ['view', 'edit', 'archive'],
};

const detailRaw = {
  ...listItemRaw,
  usage: {
    fee_plan_count: 0,
    confirmed_fee_plan_count: 0,
    agreement_count: 0,
    student_fee_count: 2,
    installment_count: 1,
    collection_count: 0,
    receipt_count: 0,
    historical_usage: true,
    can_delete: false,
  },
  create_date: '2026-06-14 11:25:05',
  write_date: '2026-06-14 11:25:05',
};

describe('normalize fee type list item', () => {
  it('normalizes list item with currency object and usage summary', () => {
    const item = normalizeFeeTypeListItem(listItemRaw);
    expect(item?.id).toBe(333);
    expect(item?.currency).toEqual({
      id: 109,
      name: 'MAD',
      symbol: 'DH',
      decimal_places: 2,
    });
    expect(item?.usage_summary?.is_used).toBe(true);
    expect(item?.allowed_actions).toEqual(['view', 'edit', 'archive']);
  });

  it('normalizes list array', () => {
    expect(normalizeFeeTypeList([listItemRaw])).toHaveLength(1);
  });
});

describe('normalize fee type detail', () => {
  it('normalizes detail usage block', () => {
    const detail = normalizeFeeTypeDetail(detailRaw);
    expect(detail?.usage?.student_fee_count).toBe(2);
    expect(detail?.create_date).toBe('2026-06-14 11:25:05');
  });

  it('detects empty usage', () => {
    expect(
      feeTypeUsageIsEmpty({
        fee_plan_count: 0,
        student_fee_count: 0,
        installment_count: 0,
      }),
    ).toBe(true);
  });
});

describe('allowed_actions policy', () => {
  it('respects backend allowed_actions only', () => {
    const item = normalizeFeeTypeListItem(listItemRaw)!;
    expect(feeTypeAllowsAction(item, 'delete')).toBe(false);
    expect(feeTypeAllowsAction(item, 'archive')).toBe(true);
  });

  it('allows delete when backend returns delete action', () => {
    const item = normalizeFeeTypeListItem({
      ...listItemRaw,
      allowed_actions: ['view', 'edit', 'archive', 'delete'],
      usage_summary: { is_used: false, historical_usage: false, can_delete: true },
    })!;
    expect(feeTypeAllowsAction(item, 'delete')).toBe(true);
  });
});

describe('fee type update payload', () => {
  it('builds partial patch payload without unchanged fields', () => {
    const detail = normalizeFeeTypeDetail({
      ...detailRaw,
      description: 'Original',
    })!;
    const payload = buildFeeTypeUpdatePayload(detail, {
      ...feeTypeFormValuesFromDetail(detail),
      description: 'Updated only',
    });
    expect(payload).toEqual({ description: 'Updated only' });
  });

  it('does not include default_amount when unchanged', () => {
    const detail = normalizeFeeTypeDetail(detailRaw)!;
    const payload = buildFeeTypeUpdatePayload(detail, feeTypeFormValuesFromDetail(detail));
    expect(payload.default_amount).toBeUndefined();
  });
});

describe('active filter query mapping', () => {
  it('maps active filter values to API query params', () => {
    expect(feeTypeActiveQueryParam('active')).toBeUndefined();
    expect(feeTypeActiveQueryParam('archived')).toBe('0');
    expect(feeTypeActiveQueryParam('all')).toBe('all');
  });

  it('parses URL active filter values', () => {
    expect(parseFeeTypeActiveFilter(null)).toBe('active');
    expect(parseFeeTypeActiveFilter('archived')).toBe('archived');
    expect(parseFeeTypeActiveFilter('all')).toBe('all');
  });
});

describe('list path and returnTo safety', () => {
  it('builds list path with search params', () => {
    expect(buildFeeTypeListPath({ search: 'qa', active: 'archived', page: 2 })).toBe(
      '/admin/finance/fee-types?search=qa&active=archived&page=2',
    );
  });

  it('allows safe internal returnTo only', () => {
    expect(isSafeInternalReturnPath('/admin/finance/fee-types?search=qa')).toBe(true);
    expect(isSafeInternalReturnPath('https://evil.test')).toBe(false);
    expect(sanitizeReturnTo('/admin/finance/fee-types?page=2')).toBe('/admin/finance/fee-types?page=2');
    expect(appendReturnTo('/admin/finance/fee-types/333', '/admin/finance/fee-types?page=2')).toContain(
      'returnTo=',
    );
  });
});

describe('currency and error helpers', () => {
  it('normalizes currency object', () => {
    expect(normalizeFeeTypeCurrency({ id: 1, name: 'MAD' })?.name).toBe('MAD');
  });

  it('resolves known error codes', () => {
    expect(resolveFeeTypeErrorCode('fee_type_in_use')).toBe('fee_type_in_use');
    expect(resolveFeeTypeErrorCode('fee_type_code_locked')).toBe('fee_type_code_locked');
    expect(resolveFeeTypeErrorCode('unknown')).toBeNull();
  });

  it('extracts currency id', () => {
    expect(feeTypeCurrencyId({ id: 109, name: 'MAD' })).toBe(109);
  });

  it('normalizes allowed actions array', () => {
    expect(normalizeAllowedActions(['view', 'edit', 'invalid'])).toEqual(['view', 'edit']);
  });
});

describe('safe delete matrix expectations', () => {
  it('hides delete for in-use active record', () => {
    const item = normalizeFeeTypeListItem(listItemRaw)!;
    expect(feeTypeAllowsAction(item, 'delete')).toBe(false);
    expect(feeTypeAllowsAction(item, 'archive')).toBe(true);
  });

  it('shows delete for unused deletable record', () => {
    const item = normalizeFeeTypeListItem({
      ...listItemRaw,
      active: true,
      allowed_actions: ['view', 'edit', 'archive', 'delete'],
      usage_summary: { is_used: false, historical_usage: false, can_delete: true },
    })!;
    expect(feeTypeAllowsAction(item, 'delete')).toBe(true);
  });

  it('shows restore for archived record when allowed', () => {
    const item = normalizeFeeTypeListItem({
      ...listItemRaw,
      active: false,
      allowed_actions: ['view', 'edit', 'restore'],
    })!;
    expect(feeTypeAllowsAction(item, 'restore')).toBe(true);
    expect(feeTypeAllowsAction(item, 'archive')).toBe(false);
  });
});
