import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeachingProgressLineDetail,
  TeachingProgressLineSummary,
  TeachingProgressSummary,
} from '@/types/teaching-delivery';
import {
  normalizeTeachingProgressLineDetail,
  normalizeTeachingProgressLines,
  normalizeTeachingProgressSummary,
} from '../utils/normalize-teaching-delivery';

export async function fetchAdminTeachingProgressLines(
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressLineSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingProgressLines, query);
  if (!res.success) return res as ApiResponse<TeachingProgressLineSummary[]>;
  return { ...res, data: normalizeTeachingProgressLines(res.data) };
}

export async function fetchAdminTeachingProgressLine(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressLineDetail>> {
  const res = await api.get<unknown>(endpoints.admin.teachingProgressLine(id), query);
  if (!res.success) return res as ApiResponse<TeachingProgressLineDetail>;
  const detail = normalizeTeachingProgressLineDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid teaching progress line payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchAdminTeachingProgressSummary(
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressSummary>> {
  const res = await api.get<unknown>(endpoints.admin.teachingProgressSummary, query);
  if (!res.success) return res as ApiResponse<TeachingProgressSummary>;
  return { ...res, data: normalizeTeachingProgressSummary(res.data) };
}
