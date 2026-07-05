import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  applyTransferInPreview,
  buildTransferApplyBody,
  buildTransferPreviewQueryParams,
  getTransferInPreview,
} from '@/lib/finance/billing-membership-api';
import { endpoints } from '@/lib/api/endpoints';

const getMock = vi.fn();
const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('billing membership api', () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it('builds preview query with fee_transfer_mode and academic_year_id', () => {
    expect(
      buildTransferPreviewQueryParams({
        fee_transfer_mode: 'open_unpaid_items',
        academic_year_id: 1,
        start_date: '2026-09-01',
      }),
    ).toEqual({
      fee_transfer_mode: 'open_unpaid_items',
      academic_year_id: 1,
      start_date: '2026-09-01',
    });
  });

  it('serializes selected fee_ids as comma-separated list', () => {
    expect(
      buildTransferPreviewQueryParams({
        fee_transfer_mode: 'selected_items',
        fee_ids: [2913, 2914],
      }),
    ).toEqual({
      fee_transfer_mode: 'selected_items',
      fee_ids: '2913,2914',
    });
  });

  it('calls preview GET with normalized payload', async () => {
    getMock.mockResolvedValue({
      success: true,
      data: {
        student_id: 1798,
        can_apply: false,
        movable_fee_ids: [],
        preserved_fee_ids: [2913],
        blocked_fee_ids: [],
        paid_fee_ids: [],
        skipped_fee_ids: [],
        movable_fees: [],
        preserved_fees: [],
        blocked_fees: [],
        paid_fees: [],
        skipped_fees: [],
        totals: { amount_movable: 0, amount_preserved: 2500 },
        warnings: [],
        preview_token: 'abc',
      },
      meta: {},
    });

    const res = await getTransferInPreview(6667, 1798, {
      fee_transfer_mode: 'membership_only',
      academic_year_id: 1,
    });

    expect(getMock).toHaveBeenCalledWith(
      endpoints.admin.financeBillingAccountMemberTransferInPreview(6667, 1798),
      {
        fee_transfer_mode: 'membership_only',
        academic_year_id: 1,
      },
    );
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.preview_token).toBe('abc');
      expect(res.data?.totals.amount_movable).toBe(0);
    }
  });

  it('posts exact apply body for regular transfer', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        operation_kind: 'membership_transfer',
        membership_changed: true,
        membership_transfer_id: 42,
        moved_fee_ids: [1],
        amount_moved: 500,
        preserved_fee_ids: [],
        blocked_fee_ids: [],
        warnings: [],
      },
      meta: {},
    });

    await applyTransferInPreview(6667, 1798, {
      fee_transfer_mode: 'future_only',
      reason: 'Future move',
      start_date: '2026-09-01',
      academic_year_id: 1,
      preview_token: 'token-1',
    });

    expect(postMock).toHaveBeenCalledWith(
      endpoints.admin.financeBillingAccountMemberTransferIn(6667, 1798),
      {
        fee_transfer_mode: 'future_only',
        reason: 'Future move',
        start_date: '2026-09-01',
        academic_year_id: 1,
        preview_token: 'token-1',
      },
    );
  });

  it('posts exact apply body for open_unpaid_items', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        operation_kind: 'membership_transfer',
        moved_fee_ids: [2],
        amount_moved: 100,
        preserved_fee_ids: [],
        blocked_fee_ids: [],
        warnings: [],
      },
      meta: {},
    });

    await applyTransferInPreview(6667, 1798, {
      fee_transfer_mode: 'open_unpaid_items',
      reason: 'Open unpaid',
      preview_token: 'token-2',
    });

    expect(postMock).toHaveBeenCalledWith(
      endpoints.admin.financeBillingAccountMemberTransferIn(6667, 1798),
      {
        fee_transfer_mode: 'open_unpaid_items',
        reason: 'Open unpaid',
        start_date: null,
        academic_year_id: null,
        preview_token: 'token-2',
      },
    );
  });

  it('posts selected_items with exact fee_ids only', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        operation_kind: 'membership_transfer',
        moved_fee_ids: [2913, 2914],
        amount_moved: 3000,
        preserved_fee_ids: [],
        blocked_fee_ids: [],
        warnings: [],
      },
      meta: {},
    });

    await applyTransferInPreview(6667, 1798, {
      fee_transfer_mode: 'selected_items',
      reason: 'Selected',
      preview_token: 'token-3',
      fee_ids: [2914, 2913],
    });

    expect(postMock).toHaveBeenCalledWith(
      endpoints.admin.financeBillingAccountMemberTransferIn(6667, 1798),
      {
        fee_transfer_mode: 'selected_items',
        reason: 'Selected',
        start_date: null,
        academic_year_id: null,
        preview_token: 'token-3',
        fee_ids: [2913, 2914],
      },
    );
  });

  it('does not leak fee_ids for non-selected modes in buildTransferApplyBody', () => {
    expect(
      buildTransferApplyBody({
        fee_transfer_mode: 'membership_only',
        reason: 'Only membership',
        preview_token: 'x',
        fee_ids: [1, 2, 3],
      }),
    ).toEqual({
      fee_transfer_mode: 'membership_only',
      reason: 'Only membership',
      start_date: null,
      academic_year_id: null,
      preview_token: 'x',
    });
  });

  it('normalizes apply result with null membership_transfer_id for fee realignment', async () => {
    postMock.mockResolvedValue({
      success: true,
      data: {
        operation_kind: 'fee_realignment',
        membership_changed: false,
        membership_transfer_id: null,
        moved_fee_ids: [99],
        amount_moved: 100,
        preserved_fee_ids: [1],
        blocked_fee_ids: [],
        warnings: [],
      },
      meta: {},
    });

    const res = await applyTransferInPreview(6667, 1, {
      fee_transfer_mode: 'open_unpaid_items',
      reason: 'Realign',
      preview_token: 'token-r',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data?.operation_kind).toBe('fee_realignment');
      expect(res.data?.membership_transfer_id).toBeNull();
      expect(res.data?.amount_moved).toBe(100);
    }
  });
});
