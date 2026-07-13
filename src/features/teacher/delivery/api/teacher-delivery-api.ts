import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  ActualDeliveryCorrectionPayload,
  ActualDeliveryCreatePayload,
  ActualDeliveryDetail,
  ActualDeliverySummary,
  ActualDeliveryUpdatePayload,
  ActualDeliveryVoidPayload,
  ClassJournalEntryDetail,
  ClassJournalEntrySummary,
  DeliveryContextResponse,
  TeachingProgressLineDetail,
  TeachingProgressLineSummary,
  TeachingProgressSummary,
} from '@/types/teaching-delivery';
import {
  normalizeActualDeliveries,
  normalizeClassJournalEntries,
  normalizeClassJournalEntryDetail,
  normalizeDeliveryContextResponse,
  normalizeTeachingProgressLineDetail,
  normalizeTeachingProgressLines,
  normalizeTeachingProgressSummary,
  unwrapActualDeliveryMutationData,
} from '@/features/admin/teaching-planning/utils/normalize-teaching-delivery';

function invalidPayload<T>(res: ApiResponse<unknown>, message: string): ApiResponse<T> {
  return {
    success: false,
    error: { code: 'invalid_payload', message, details: {} },
    meta: res.meta ?? {},
  };
}

function withNormalizedDetail(res: ApiResponse<unknown>): ApiResponse<ActualDeliveryDetail> {
  if (!res.success) return res as ApiResponse<ActualDeliveryDetail>;
  const detail = unwrapActualDeliveryMutationData(res.data);
  return detail ? { ...res, data: detail } : invalidPayload(res, 'Invalid actual delivery payload.');
}

export async function fetchDeliveryContext(
  occurrenceId: number | string,
  query?: ListParams,
): Promise<ApiResponse<DeliveryContextResponse>> {
  const res = await api.get<unknown>(endpoints.teacher.sessionOccurrenceDeliveryContext(occurrenceId), query);
  if (!res.success) return res as ApiResponse<DeliveryContextResponse>;
  const context = normalizeDeliveryContextResponse(res.data);
  return context ? { ...res, data: context } : invalidPayload(res, 'Invalid delivery context payload.');
}

export async function fetchTeacherActualDeliveries(
  query?: ListParams,
): Promise<ApiResponse<ActualDeliverySummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.actualDeliveries, query);
  if (!res.success) return res as ApiResponse<ActualDeliverySummary[]>;
  return { ...res, data: normalizeActualDeliveries(res.data) };
}

export async function fetchTeacherActualDelivery(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.get<unknown>(endpoints.teacher.actualDelivery(id), query));
}

export async function createActualDelivery(
  payload: ActualDeliveryCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.actualDeliveries, payload, query));
}

export async function updateActualDelivery(
  id: number | string,
  payload: ActualDeliveryUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.patch<unknown>(endpoints.teacher.actualDelivery(id), payload, query));
}

export async function confirmActualDelivery(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.actualDeliveryConfirm(id), undefined, query));
}

export async function createActualDeliveryCorrection(
  id: number | string,
  payload: ActualDeliveryCorrectionPayload,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(
    await api.post<unknown>(endpoints.teacher.actualDeliveryCreateCorrection(id), payload, query),
  );
}

export async function voidActualDelivery(
  id: number | string,
  payload: ActualDeliveryVoidPayload,
  query?: ListParams,
): Promise<ApiResponse<ActualDeliveryDetail>> {
  return withNormalizedDetail(await api.post<unknown>(endpoints.teacher.actualDeliveryVoid(id), payload, query));
}

export async function fetchTeacherClassJournal(
  query?: ListParams,
): Promise<ApiResponse<ClassJournalEntrySummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.classJournal, query);
  if (!res.success) return res as ApiResponse<ClassJournalEntrySummary[]>;
  return { ...res, data: normalizeClassJournalEntries(res.data) };
}

export async function fetchTeacherClassJournalEntry(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<ClassJournalEntryDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.classJournalEntry(id), query);
  if (!res.success) return res as ApiResponse<ClassJournalEntryDetail>;
  const detail = normalizeClassJournalEntryDetail(res.data);
  return detail ? { ...res, data: detail } : invalidPayload(res, 'Invalid class journal entry payload.');
}

export async function fetchTeacherTeachingProgress(
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressLineSummary[]>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingProgress, query);
  if (!res.success) return res as ApiResponse<TeachingProgressLineSummary[]>;
  return { ...res, data: normalizeTeachingProgressLines(res.data) };
}

export async function fetchTeacherTeachingProgressLine(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressLineDetail>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingProgressLine(id), query);
  if (!res.success) return res as ApiResponse<TeachingProgressLineDetail>;
  const detail = normalizeTeachingProgressLineDetail(res.data);
  return detail ? { ...res, data: detail } : invalidPayload(res, 'Invalid teaching progress line payload.');
}

export async function fetchTeacherTeachingProgressSummary(
  query?: ListParams,
): Promise<ApiResponse<TeachingProgressSummary>> {
  const res = await api.get<unknown>(endpoints.teacher.teachingProgressSummary, query);
  if (!res.success) return res as ApiResponse<TeachingProgressSummary>;
  return { ...res, data: normalizeTeachingProgressSummary(res.data) };
}
