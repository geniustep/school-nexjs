import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AcademicCalendarClosureContext,
  AcademicCalendarCreatePayload,
  AcademicCalendarDetail,
  AcademicCalendarDuplicatePayload,
  AcademicCalendarEffectiveEventsData,
  AcademicCalendarEventPayload,
  AcademicCalendarSummary,
  AcademicCalendarUpdatePayload,
} from '@/types/academic-calendar';
import {
  normalizeAcademicCalendarClosureContext,
  normalizeAcademicCalendarDetail,
  normalizeAcademicCalendarEffectiveEvents,
  normalizeAcademicCalendars,
  unwrapAcademicCalendarMutationData,
} from '../utils/normalize-academic-calendar';
import { academicCalendarTimeToPayload } from '../utils/academic-calendar-time';

function withNormalizedDetail(
  res: ApiResponse<unknown>,
): ApiResponse<AcademicCalendarDetail> {
  if (!res.success) return res as ApiResponse<AcademicCalendarDetail>;
  const detail =
    unwrapAcademicCalendarMutationData(res.data) ?? normalizeAcademicCalendarDetail(res.data);
  if (!detail) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid academic calendar payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: detail };
}

function toEventMutationPayload(payload: AcademicCalendarEventPayload): Record<string, unknown> {
  const timeFrom =
    typeof payload.time_from === 'number'
      ? payload.time_from
      : academicCalendarTimeToPayload(
          typeof payload.time_from === 'string' ? payload.time_from : undefined,
        );
  const timeTo =
    typeof payload.time_to === 'number'
      ? payload.time_to
      : academicCalendarTimeToPayload(
          typeof payload.time_to === 'string' ? payload.time_to : undefined,
        );
  return {
    ...payload,
    time_from: timeFrom,
    time_to: timeTo,
  };
}

export async function fetchAcademicCalendars(
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarSummary[]>> {
  const res = await api.get<unknown>(endpoints.admin.academicCalendars, query);
  if (!res.success) return res as ApiResponse<AcademicCalendarSummary[]>;
  return { ...res, data: normalizeAcademicCalendars(res.data) };
}

export async function fetchAcademicCalendar(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.get<unknown>(endpoints.admin.academicCalendar(id), query);
  return withNormalizedDetail(res);
}

export async function createAcademicCalendar(
  payload: AcademicCalendarCreatePayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(endpoints.admin.academicCalendars, payload, query);
  return withNormalizedDetail(res);
}

export async function updateAcademicCalendar(
  id: number | string,
  payload: AcademicCalendarUpdatePayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.put<unknown>(endpoints.admin.academicCalendar(id), payload, query);
  return withNormalizedDetail(res);
}

export async function createAcademicCalendarEvent(
  calendarId: number | string,
  payload: AcademicCalendarEventPayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarEvents(calendarId),
    toEventMutationPayload(payload),
    query,
  );
  return withNormalizedDetail(res);
}

export async function updateAcademicCalendarEvent(
  calendarId: number | string,
  eventId: number | string,
  payload: AcademicCalendarEventPayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.put<unknown>(
    endpoints.admin.academicCalendarEvent(calendarId, eventId),
    toEventMutationPayload(payload),
    query,
  );
  return withNormalizedDetail(res);
}

export async function deleteAcademicCalendarEvent(
  calendarId: number | string,
  eventId: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail | null>> {
  const res = await api.delete<unknown>(
    endpoints.admin.academicCalendarEvent(calendarId, eventId),
    query,
  );
  if (!res.success) return res as ApiResponse<null>;
  const detail =
    unwrapAcademicCalendarMutationData(res.data) ?? normalizeAcademicCalendarDetail(res.data);
  return { ...res, data: detail };
}

export async function submitAcademicCalendarReview(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarSubmitReview(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function resetAcademicCalendarToDraft(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarResetToDraft(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function publishAcademicCalendar(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarPublish(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function duplicateAcademicCalendar(
  id: number | string,
  payload?: AcademicCalendarDuplicatePayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarDuplicate(id),
    payload,
    query,
  );
  return withNormalizedDetail(res);
}

export async function archiveAcademicCalendar(
  id: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicCalendarDetail>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicCalendarArchive(id),
    undefined,
    query,
  );
  return withNormalizedDetail(res);
}

export async function fetchAcademicCalendarEffectiveEvents(
  query: {
    academic_year_id: number;
    school_id?: number;
    date_from?: string;
    date_to?: string;
    include_provisional?: boolean;
  },
  listQuery?: ListParams,
): Promise<ApiResponse<AcademicCalendarEffectiveEventsData>> {
  const params: ListParams = {
    ...listQuery,
    academic_year_id: query.academic_year_id,
    school_id: query.school_id,
    date_from: query.date_from,
    date_to: query.date_to,
    include_provisional:
      query.include_provisional == null ? undefined : query.include_provisional ? 'true' : 'false',
  };
  const res = await api.get<unknown>(endpoints.admin.academicCalendarEffectiveEvents, params);
  if (!res.success) return res as ApiResponse<AcademicCalendarEffectiveEventsData>;
  const data = normalizeAcademicCalendarEffectiveEvents(res.data);
  if (!data) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid effective-events payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data };
}

export async function fetchAcademicCalendarClosureContext(
  query: {
    date: string;
    calendar_id?: number;
    academic_year_id?: number;
    include_provisional?: boolean;
  },
  listQuery?: ListParams,
): Promise<ApiResponse<AcademicCalendarClosureContext>> {
  const params: ListParams = {
    ...listQuery,
    date: query.date,
    calendar_id: query.calendar_id,
    academic_year_id: query.academic_year_id,
    include_provisional:
      query.include_provisional == null ? undefined : query.include_provisional ? 'true' : 'false',
  };
  const res = await api.get<unknown>(endpoints.admin.academicCalendarClosureContext, params);
  if (!res.success) return res as ApiResponse<AcademicCalendarClosureContext>;
  const data = normalizeAcademicCalendarClosureContext(res.data);
  if (!data) {
    return {
      success: false,
      error: {
        code: 'invalid_payload',
        message: 'Invalid closure-context payload.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data };
}
