'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { PaymentCollection } from '@/types/finance';
import type {
  PaymentCollectionPreviewRequest,
} from '@/types/payment-collection-preview';

export async function previewPaymentCollection(
  payload: PaymentCollectionPreviewRequest,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.financePaymentCollectionPreview, payload, query);
}

export async function cancelPaymentCollection(
  collectionId: number,
  reason: string,
): Promise<ApiResponse<PaymentCollection>> {
  return api.post<PaymentCollection>(endpoints.admin.financePaymentCollectionCancel(collectionId), {
    reason,
  });
}
