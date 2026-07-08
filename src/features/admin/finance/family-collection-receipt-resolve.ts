import type { FamilyCollectionConfirmResponse } from '@/types/family-finance';
import type { FinanceReceipt } from '@/types/finance';

export function readReceiptIdFromConfirmResponse(
  data: FamilyCollectionConfirmResponse | null | undefined,
): number | null {
  if (!data?.receipt_id) return null;
  return data.receipt_id;
}

/** Prefer receipt_id from confirm; otherwise fetch payment-collections/{id}/receipt. */
export async function resolveFamilyCollectionReceiptId(
  collectionId: number,
  confirmData: FamilyCollectionConfirmResponse | null,
  fetchReceipt: (collectionId: number) => Promise<FinanceReceipt | null>,
): Promise<number | null> {
  const fromConfirm = readReceiptIdFromConfirmResponse(confirmData);
  if (fromConfirm != null) return fromConfirm;
  const receipt = await fetchReceipt(collectionId);
  return receipt?.id ?? null;
}
