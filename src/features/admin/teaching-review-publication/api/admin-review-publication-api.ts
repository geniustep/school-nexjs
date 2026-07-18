/**
 * Admin Teaching Stage 9 API — Odoo 224 review / publication / archive / export / closure.
 */

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import {
  normalizeArchiveList,
  normalizeClosureList,
  normalizeClosurePreview,
  normalizeDocumentVersions,
  normalizeExportRequest,
  normalizeOfficialPublication,
  normalizePeriodClosure,
  normalizePeriodException,
  normalizeClosureEvent,
  normalizeReviewQueueCounts,
  normalizeReviewQueuePayload,
} from '@/features/teaching-review-publication/normalize-review-publication';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  TeachingArchiveListPayload,
  TeachingClosureEvent,
  TeachingClosureListPayload,
  TeachingClosurePreview,
  TeachingDocumentVersionsPayload,
  TeachingExportFormat,
  TeachingExportRequest,
  TeachingOfficialPublication,
  TeachingPeriodClosure,
  TeachingPeriodException,
  TeachingPrintLocale,
  TeachingReviewQueueCounts,
  TeachingReviewQueuePayload,
} from '@/types/teaching-review-publication';

export type AdminReviewQueueFilters = {
  academic_year_id?: number;
  document_type?: string;
  review_state?: string;
  teacher_id?: number;
  page?: number;
  page_size?: number;
};

export async function fetchAdminReviewQueue(
  filters: AdminReviewQueueFilters = {},
): Promise<ApiResponse<TeachingReviewQueuePayload>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingReviewQueue,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingReviewQueuePayload>;
  return { ...res, data: normalizeReviewQueuePayload(res.data) };
}

export async function fetchAdminDashboardFoundationCounts(
  filters: Pick<AdminReviewQueueFilters, 'academic_year_id' | 'teacher_id'> = {},
): Promise<ApiResponse<TeachingReviewQueueCounts>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingAdminDashboardFoundation,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingReviewQueueCounts>;
  return { ...res, data: normalizeReviewQueueCounts(res.data) };
}

export async function markDocumentReviewed(
  documentType: string,
  documentId: number,
  body: { note?: string } = {},
): Promise<ApiResponse<Record<string, unknown>>> {
  return api.post(
    endpoints.admin.teachingDocumentMarkReviewed(documentType, documentId),
    body,
  );
}

export async function requestDocumentChanges(
  documentType: string,
  documentId: number,
  reason: string,
): Promise<ApiResponse<Record<string, unknown>>> {
  return api.post(
    endpoints.admin.teachingDocumentRequestChanges(documentType, documentId),
    { reason },
  );
}

export async function approveDocumentOfficial(
  documentType: string,
  documentId: number,
  body: { review_note?: string; expected_fingerprint?: string } = {},
): Promise<ApiResponse<TeachingOfficialPublication>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingDocumentApproveOfficial(documentType, documentId),
    body,
  );
  if (!res.success) return res as ApiResponse<TeachingOfficialPublication>;
  const pub = normalizeOfficialPublication(res.data, { includeEvents: true });
  if (!pub) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid publication response.' },
    } as ApiResponse<TeachingOfficialPublication>;
  }
  return { ...res, data: pub };
}

export async function fetchDocumentVersions(
  documentType: string,
  documentId: number,
): Promise<ApiResponse<TeachingDocumentVersionsPayload>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingDocumentVersions(documentType, documentId),
  );
  if (!res.success) return res as ApiResponse<TeachingDocumentVersionsPayload>;
  const data = normalizeDocumentVersions(res.data);
  if (!data) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid versions response.' },
    } as ApiResponse<TeachingDocumentVersionsPayload>;
  }
  return { ...res, data };
}

export async function fetchPublicationDetail(
  publicationId: number,
): Promise<ApiResponse<TeachingOfficialPublication>> {
  const res = await api.get<unknown>(endpoints.admin.teachingPublication(publicationId));
  if (!res.success) return res as ApiResponse<TeachingOfficialPublication>;
  const pub = normalizeOfficialPublication(res.data, { includeEvents: true });
  if (!pub) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid publication response.' },
    } as ApiResponse<TeachingOfficialPublication>;
  }
  return { ...res, data: pub };
}

export async function archivePublication(
  publicationId: number,
  reason: string,
): Promise<ApiResponse<TeachingOfficialPublication>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingPublicationArchive(publicationId),
    { reason },
  );
  if (!res.success) return res as ApiResponse<TeachingOfficialPublication>;
  const pub = normalizeOfficialPublication(res.data);
  if (!pub) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid publication response.' },
    } as ApiResponse<TeachingOfficialPublication>;
  }
  return { ...res, data: pub };
}

export type AdminArchiveFilters = {
  academic_year_id?: number;
  period_id?: number;
  document_type?: string;
  status?: string;
  teacher_id?: number;
  date_from?: string;
  date_to?: string;
  has_attachment?: boolean;
  page?: number;
  page_size?: number;
};

export async function fetchAdminArchive(
  filters: AdminArchiveFilters = {},
): Promise<ApiResponse<TeachingArchiveListPayload>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingArchive,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingArchiveListPayload>;
  return { ...res, data: normalizeArchiveList(res.data) };
}

export async function createTeachingExport(body: {
  export_type: TeachingExportFormat;
  locale?: TeachingPrintLocale;
  document_types?: string[];
  filters?: Record<string, unknown>;
  academic_year_id?: number;
  period_id?: number;
  publication_id?: number;
}): Promise<ApiResponse<TeachingExportRequest>> {
  const res = await api.post<unknown>(endpoints.admin.teachingExports, body);
  if (!res.success) return res as ApiResponse<TeachingExportRequest>;
  const req = normalizeExportRequest(res.data);
  if (!req) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid export response.' },
    } as ApiResponse<TeachingExportRequest>;
  }
  return { ...res, data: req };
}

export async function fetchExportStatus(
  exportId: number,
): Promise<ApiResponse<TeachingExportRequest>> {
  const res = await api.get<unknown>(endpoints.admin.teachingExport(exportId));
  if (!res.success) return res as ApiResponse<TeachingExportRequest>;
  const req = normalizeExportRequest(res.data);
  if (!req) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid export response.' },
    } as ApiResponse<TeachingExportRequest>;
  }
  return { ...res, data: req };
}

export async function fetchPeriodClosures(filters: {
  academic_year_id?: number;
  state?: string;
  page?: number;
  page_size?: number;
} = {}): Promise<ApiResponse<TeachingClosureListPayload>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingPeriodClosures,
    filters as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingClosureListPayload>;
  return { ...res, data: normalizeClosureList(res.data) };
}

export async function fetchPeriodClosurePreview(params: {
  academic_year_id: number;
  scope_type: 'term' | 'academic_year';
  term_id?: number;
}): Promise<ApiResponse<TeachingClosurePreview>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingPeriodClosurePreview,
    params as ListParams,
  );
  if (!res.success) return res as ApiResponse<TeachingClosurePreview>;
  const preview = normalizeClosurePreview(res.data);
  if (!preview) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid preview response.' },
    } as ApiResponse<TeachingClosurePreview>;
  }
  return { ...res, data: preview };
}

export async function fetchPeriodClosure(
  closureId: number,
): Promise<ApiResponse<TeachingPeriodClosure>> {
  const res = await api.get<unknown>(endpoints.admin.teachingPeriodClosure(closureId));
  if (!res.success) return res as ApiResponse<TeachingPeriodClosure>;
  const closure = normalizePeriodClosure(res.data, true);
  if (!closure) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid closure response.' },
    } as ApiResponse<TeachingPeriodClosure>;
  }
  return { ...res, data: closure };
}

export async function closeTeachingPeriod(body: {
  academic_year_id: number;
  scope_type: 'term' | 'academic_year';
  term_id?: number;
  reason: string;
  acknowledge_warnings?: boolean;
  expected_preview_checksum?: string;
}): Promise<ApiResponse<TeachingPeriodClosure>> {
  const res = await api.post<unknown>(endpoints.admin.teachingPeriodClosureClose, body);
  if (!res.success) return res as ApiResponse<TeachingPeriodClosure>;
  const closure = normalizePeriodClosure(res.data, true);
  if (!closure) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid closure response.' },
    } as ApiResponse<TeachingPeriodClosure>;
  }
  return { ...res, data: closure };
}

export async function reopenTeachingPeriod(
  closureId: number,
  body: { reason: string; expected_closure_revision?: number },
): Promise<ApiResponse<TeachingPeriodClosure>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingPeriodClosureReopen(closureId),
    body,
  );
  if (!res.success) return res as ApiResponse<TeachingPeriodClosure>;
  const closure = normalizePeriodClosure(res.data, true);
  if (!closure) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid closure response.' },
    } as ApiResponse<TeachingPeriodClosure>;
  }
  return { ...res, data: closure };
}

export async function fetchClosureEvents(
  closureId: number,
): Promise<ApiResponse<TeachingClosureEvent[]>> {
  const res = await api.get<unknown>(endpoints.admin.teachingPeriodClosureEvents(closureId));
  if (!res.success) return res as ApiResponse<TeachingClosureEvent[]>;
  const data = res.data as { items?: unknown[] } | unknown[];
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return {
    ...res,
    data: items
      .map(normalizeClosureEvent)
      .filter((e): e is TeachingClosureEvent => e != null),
  };
}

export async function authorizePeriodException(
  closureId: number,
  body: {
    document_type: string;
    document_id: number;
    allowed_action: string;
    reason: string;
    expires_at?: string;
  },
): Promise<ApiResponse<TeachingPeriodException>> {
  const res = await api.post<unknown>(
    endpoints.admin.teachingPeriodClosureExceptions(closureId),
    body,
  );
  if (!res.success) return res as ApiResponse<TeachingPeriodException>;
  const exception = normalizePeriodException(res.data);
  if (!exception) {
    return {
      success: false,
      error: { code: 'validation_error', message: 'Invalid exception response.' },
    } as ApiResponse<TeachingPeriodException>;
  }
  return { ...res, data: exception };
}

export async function fetchPeriodExceptions(
  closureId: number,
): Promise<ApiResponse<TeachingPeriodException[]>> {
  const res = await api.get<unknown>(
    endpoints.admin.teachingPeriodClosureExceptions(closureId),
  );
  if (!res.success) return res as ApiResponse<TeachingPeriodException[]>;
  const data = res.data as { items?: unknown[] } | unknown[];
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return {
    ...res,
    data: items
      .map(normalizePeriodException)
      .filter((e): e is TeachingPeriodException => e != null),
  };
}
