import { describe, expect, it, vi, beforeEach } from 'vitest';
import { postChequeReject, postChequeSettle } from './cheque-lifecycle-api';
import { endpoints } from '@/lib/api/endpoints';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('cheque lifecycle api', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ success: true, data: {} });
  });

  it('posts settle to /settle endpoint', async () => {
    await postChequeSettle(42, {
      settlement_date: '2026-06-18',
      bank_reference: 'BANK-REF-001',
      note: 'تم تحصيل الشيك',
    });
    expect(postMock).toHaveBeenCalledWith(endpoints.admin.financeChequeSettle(42), {
      settlement_date: '2026-06-18',
      bank_reference: 'BANK-REF-001',
      note: 'تم تحصيل الشيك',
    });
    const path = String(postMock.mock.calls[0][0]);
    expect(path).toContain('/settle');
    expect(path).not.toContain('/bounce');
    expect(path).not.toContain('/clear');
  });

  it('posts reject to /reject endpoint', async () => {
    await postChequeReject(42, {
      rejection_date: '2026-06-18',
      reason_code: 'insufficient_funds',
      reason: null,
      bank_reference: null,
      note: null,
    });
    expect(postMock).toHaveBeenCalledWith(endpoints.admin.financeChequeReject(42), {
      rejection_date: '2026-06-18',
      reason_code: 'insufficient_funds',
      reason: null,
      bank_reference: null,
      note: null,
    });
    const path = String(postMock.mock.calls[0][0]);
    expect(path).toContain('/reject');
    expect(path).not.toContain('/bounce');
  });
});
