import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  JathathaContextResponse,
  SessionOccurrenceDetail,
  SessionOccurrenceSummary,
  TeacherJathathaCorrectionPayload,
  TeacherJathathaCreatePayload,
  TeacherJathathaDetail,
  TeacherJathathaSummary,
  TeacherJathathaUpdatePayload,
  TeacherJathathaVoidPayload,
} from '@/types/jathatha';
import {
  normalizeJathathaContextResponse,
  normalizeSessionOccurrenceDetail,
  normalizeSessionOccurrences,
  normalizeTeacherJathathas,
  unwrapTeacherJathathaMutationData,
} from '@/features/admin/teaching-planning/utils/normalize-jathatha';

function invalidPayload<T>(res: ApiResponse<unknown>, message: string): ApiResponse<T> {
  return {
    success: false,
    error: { code: 'invalid_payload', message, details: {} },
    meta: res.meta ?? {},
  };
}

function withNormalizedDetail(res: ApiResponse<unknown>): ApiResponse<TeacherJathathaDetail> {
  if (!res.success) return res as ApiResponse<TeacherJathathaDetail>;
  const detail = unwrapTeacherJathathaMutationData(res.data);
  return detail ? { ...res, data: detail } : invalidPayload(res, 'Invalid teacher Jathatha payload.');
}

export async function fetchTeacherSessionOccurrences(
  query?: ListParams,
): Promise<ApiResponse<SessionOccurrenceSummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.sessionOccurrences, query);
  if (!res.success) return res as ApiResponse<SessionOccurrenceSummary[]>;
  return { ...res, data: normalizeSessionOccurrences(res.data) };
}

export async function fetchTeacherSessionOccurrence(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<SessionOccurrenceDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.sessionOccurrence(id), query);
  if (!res.success) return res as ApiResponse<SessionOccurrenceDetail>;
  const detail = normalizeSessionOccurrenceDetail(res.data);
  return detail ? { ...res, data: detail } : invalidPayload(res, 'Invalid session occurrence payload.');
}

export async function fetchJathathaContext(
  occurrenceId: number | string,
  query?: ListParams,
): Promise<ApiResponse<JathathaContextResponse>> {
  const res = await api.get<unknown>(endpoints.teacher.sessionOccurrenceJathathaContext(occurrenceId), query);
  if (!res.success) return res as ApiResponse<JathathaContextResponse>;
  const context = normalizeJathathaContextResponse(res.data);
  return context ? { ...res, data: context } : invalidPayload(res, 'Invalid Jathatha context payload.');
}

export async function fetchTeacherJathathas(
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaSummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.jathathas, query);
  if (!res.success) return res as ApiResponse<TeacherJathathaSummary[]>;
  return { ...res, data: normalizeTeacherJathathas(res.data) };
}

export async function fetchTeacherJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.get<unknown>(endpoints.teacher.jathatha(id), query));
}

export async function createTeacherJathatha(
  payload: TeacherJathathaCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.jathathas, payload, query));
}

export async function updateTeacherJathatha(
  id: number | string,
  payload: TeacherJathathaUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.patch<unknown>(endpoints.teacher.jathatha(id), payload, query));
}

export async function markTeacherJathathaReady(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.jathathaMarkReady(id), undefined, query));
}

export async function resetTeacherJathathaToDraft(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.jathathaResetToDraft(id), undefined, query));
}

export async function confirmTeacherJathatha(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.jathathaConfirm(id), undefined, query));
}

export async function createTeacherJathathaCorrection(
  id: number | string,
  payload: TeacherJathathaCorrectionPayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.teacher.jathathaCreateCorrection(id), payload, query),
  );
}

export async function voidTeacherJathatha(
  id: number | string,
  payload: TeacherJathathaVoidPayload,
  query?: ListParams,
): Promise<ApiResponse<TeacherJathathaDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.jathathaVoid(id), payload, query));
}
