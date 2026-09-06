import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgreementAmendmentRequestPayload } from '../types/agreement-amendment';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  fetchPeriods: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  api: { get: mocks.apiGet },
}));

vi.mock('../api/finance-admin-api', () => ({
  fetchAgreementAmendmentEffectivePeriods: mocks.fetchPeriods,
}));

import { prepareAgreementAmendmentPayload } from './prepare-agreement-amendment-payload';

const singlePayload: AgreementAmendmentRequestPayload = {
  agreement_id: 467,
  operation_type: 'adjust_installment_amount',
  effective_period_id: 305,
  reason: 'accord',
  line: {
    source_line_id: 868,
    agreement_line_id: 868,
    fee_type_id: 23,
    amount: 900,
  },
};

describe('prepareAgreementAmendmentPayload', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.fetchPeriods.mockReset();
  });

  it('passes non-single-installment operations through without extra reads', async () => {
    const payload = { ...singlePayload, operation_type: 'modify_line' as const };
    await expect(prepareAgreementAmendmentPayload(42, payload)).resolves.toEqual({
      success: true,
      data: payload,
      meta: {},
    });
    expect(mocks.fetchPeriods).not.toHaveBeenCalled();
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });

  it('uses the normalized BFF period contract and injects the exact operational installment id', async () => {
    mocks.fetchPeriods.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 305,
          label: 'October 2026',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
        },
      ],
      meta: {},
    });
    mocks.apiGet.mockResolvedValueOnce({
      success: true,
      data: {
        items: [
          {
            id: 4734,
            agreement_id: 467,
            agreement_line_id: 868,
            period_start: '2026-10-01',
            period_end: '2026-10-31',
            timing_status: 'overdue',
          },
        ],
      },
      meta: { pagination: { page: 1, page_size: 100, total: 1, total_pages: 1 } },
    });

    const result = await prepareAgreementAmendmentPayload(42, singlePayload);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(mocks.fetchPeriods).toHaveBeenCalledWith(42, 467);
    expect(result.data.line.operational_installment_id).toBe(4734);
    expect(result.data.operation_type).toBe('adjust_installment_amount');
  });

  it('fails closed instead of guessing when no canonical installment matches', async () => {
    mocks.fetchPeriods.mockResolvedValueOnce({
      success: true,
      data: [
        {
          id: 305,
          label: 'October 2026',
          periodStart: '2026-10-01',
          periodEnd: '2026-10-31',
        },
      ],
      meta: {},
    });
    mocks.apiGet.mockResolvedValueOnce({
      success: true,
      data: { items: [] },
      meta: { pagination: { page: 1, page_size: 100, total: 0, total_pages: 1 } },
    });

    const result = await prepareAgreementAmendmentPayload(42, singlePayload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('operational_installment_id_not_available_to_ui');
    expect(result.error.details?.reason).toBe('not_found');
  });

  it('returns a controlled failure when the normalized period read rejects', async () => {
    mocks.fetchPeriods.mockRejectedValueOnce(new Error('network unavailable'));

    const result = await prepareAgreementAmendmentPayload(42, singlePayload);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('operational_installment_id_not_available_to_ui');
    expect(result.error.details?.reason).toBe('request_failed');
    expect(mocks.apiGet).not.toHaveBeenCalled();
  });
});
