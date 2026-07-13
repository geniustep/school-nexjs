import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  ActualDeliveryDetail,
  ActualDeliveryRequestCorrectionPayload,
  ActualDeliverySummary,
} from '@/types/teaching-delivery';
import {
  normalizeActualDeliveries,
  unwrapActualDeliveryMutationData,
} from '../utils/normalize-teaching-delivery';

function withNormalizedDetail(res: ApiResponse<unknown>): ApiResponse<ActualDeliveryDetail> {
  if (!res.success) return res as ApiResponse<ActualDeliveryDetail>;
  const detail = unwrapActualDeliveryMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid actual delivery payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchAdminActualDeliveries(
  query?: ListParams,
): Promise<ApiResponse<ActualDeliverySummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.actualDeliveries, query);
  if (!res.success) return res as ApiResponse<ActualDeliverySummary[]>;
  return { ...res, data: normalizeActualDeliveries(res.data) };
}

export async function fetchAdminActualDelivery(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.get<unknown>(endpoints.admin.actualDelivery(id), query));
}

export async function markActualDeliveryReviewed(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.actualDeliveryMarkReviewed(id), undefined, query),
  );
}

export async function requestActualDeliveryCorrection(
  id: number | string,
  payload: ActualDeliveryRequestCorrectionPayload,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.actualDeliveryRequestCorrection(id), payload, query),
  );
}
