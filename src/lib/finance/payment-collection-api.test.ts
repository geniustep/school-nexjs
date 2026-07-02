import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cancelPaymentCollection, discardCollection } from '@/lib/finance/payment-collection-api';
import { endpoints } from '@/lib/api/endpoints';

const postMock = vi.fn();

vi.mock('@/lib/api/client', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
  },
}));

describe('payment collection api', () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({ success: true, data: {} });
  });

  it('posts cancel with reason body', async () => {
    await cancelPaymentCollection(80, 'تصحيح خطأ إدخال');
    expect(postMock).toHaveBeenCalledWith(endpoints.admin.financePaymentCollectionCancel(80), {
      reason: 'تصحيح خطأ إدخال',
    });
    const path = String(postMock.mock.calls[0][0]);
    expect(path).toContain('/cancel');
  });

  it('posts discard without body', async () => {
    await discardCollection(42);
    expect(postMock).toHaveBeenCalledWith(endpoints.admin.financePaymentCollectionDiscard(42));
    const path = String(postMock.mock.calls[0][0]);
    expect(path).toBe('/admin/finance/payment-collections/42/discard');
  });
});
