import { describe, expect, it, vi } from 'vitest';
import {
  readReceiptIdFromConfirmResponse,
  resolveFamilyCollectionReceiptId,
} from '@/features/admin/finance/family-collection-receipt-resolve';

describe('resolveFamilyCollectionReceiptId', () => {
  it('uses receipt_id from confirm response when present', async () => {
    const fetchReceipt = vi.fn();
    const id = await resolveFamilyCollectionReceiptId(
      42,
      { receipt_id: 99, collection_id: 42 },
      fetchReceipt,
    );
    expect(id).toBe(99);
    expect(fetchReceipt).not.toHaveBeenCalled();
  });

  it('fetches payment-collections receipt when confirm omits receipt_id', async () => {
    const fetchReceipt = vi.fn().mockResolvedValue({ id: 77 });
    const id = await resolveFamilyCollectionReceiptId(42, { collection_id: 42 }, fetchReceipt);
    expect(id).toBe(77);
    expect(fetchReceipt).toHaveBeenCalledWith(42);
  });
});

describe('readReceiptIdFromConfirmResponse', () => {
  it('returns null when receipt_id is absent', () => {
    expect(readReceiptIdFromConfirmResponse({ collection_id: 1 })).toBeNull();
  });
});
