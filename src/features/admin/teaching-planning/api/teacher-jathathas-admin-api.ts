import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AdminRequestCorrectionPayload,
  TeacherJathathaDetail,
  TeacherJathathaSummary,
} from '@/types/jathatha';
import {
  normalizeTeacherJathathas,
  unwrapTeacherJathathaMutationData,
} from '../utils/normalize-jathatha';

function withNormalizedDetail(res: ApiResponse<unknown>): ApiResponse<TeacherJathathaDetail> {
  if (!res.success) return res as ApiResponse<TeacherJathathaDetail>;
  const detail = unwrapTeacherJathathaMutationData(res.data);
  if (!detail) {
    return {
      success: false,
      error: { code: 'invalid_payload', message: 'Invalid teacher Jathatha payload.', details: {} },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

export async function fetchTeacherJathathasAdmin(
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.teacherJathathasAdmin, query);
  if (!res.success) return res as ApiResponse<TeacherJathathaSummary[]>;
  return { ...res, data: normalizeTeacherJathathas(res.data) };
}

export async function fetchTeacherJathathaAdmin(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.get<unknown>(endpoints.admin.teacherJathathaAdmin(id), query));
}

export async function markTeacherJathathaReviewed(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.teacherJathathaMarkReviewed(id), undefined, query),
  );
}

export async function requestTeacherJathathaCorrection(
  id: number | string,
  payload: AdminRequestCorrectionPayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.admin.teacherJathathaRequestCorrection(id), payload, query),
  );
}
