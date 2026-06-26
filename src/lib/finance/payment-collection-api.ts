'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  PaymentCollectionPreviewRequest,
} from '@/types/payment-collection-preview';

export async function previewPaymentCollection(
  payload: PaymentCollectionPreviewRequest,
  query?: ListParams,
): Promise<ApiResponse<unknown>> {
  return api.post<unknown>(endpoints.admin.financePaymentCollectionPreview, payload, query);
}
