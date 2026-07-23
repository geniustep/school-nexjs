import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AcademicContextOptionsQuery,
  AcademicContextOptionsResponse,
  AcademicTermOption,
  AcademicTermsInitializePayload,
  AcademicTermsInitializeResult,
  AcademicTermsListResponse,
  CreateAcademicTermInput,
  UpdateAcademicTermInput,
} from '@/types/academic-context';
import {
  normalizeAcademicContextOptions,
  normalizeAcademicTermsList,
  normalizeAcademicTermOption,
} from '../utils/normalize-academic-context';

const TERM_UPDATE_ALLOWED_KEYS = new Set([
  'name',
  'code',
  'date_start',
  'date_end',
]);

/** Strip anything outside the term-edit contract before PATCH. */
export function sanitizeTermUpdatePayload(
  payload: UpdateAcademicTermInput,
): UpdateAcademicTermInput | null {
  const sanitized: UpdateAcademicTermInput = {};
  for (const key of TERM_UPDATE_ALLOWED_KEYS) {
    const value = payload[key as keyof UpdateAcademicTermInput];
    if (typeof value === 'string') {
      sanitized[key as keyof UpdateAcademicTermInput] = value;
    }
  }
  if (Object.keys(sanitized).length === 0) return null;
  return sanitized;
}

const TERM_CREATE_ALLOWED_KEYS = new Set([
  'name',
  'code',
  'date_start',
  'date_end',
  'sequence',
  'description',
  'state',
]);

export function sanitizeTermCreatePayload(
  payload: CreateAcademicTermInput,
): CreateAcademicTermInput | null {
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const code = typeof payload.code === 'string' ? payload.code.trim() : '';
  const date_start = typeof payload.date_start === 'string' ? payload.date_start : '';
  const date_end = typeof payload.date_end === 'string' ? payload.date_end : '';
  if (!name || !code || !date_start || !date_end) return null;

  const sanitized: CreateAcademicTermInput = {
    name,
    code,
    date_start,
    date_end,
  };
  if (typeof payload.sequence === 'number' && Number.isFinite(payload.sequence)) {
    sanitized.sequence = payload.sequence;
  }
  if (typeof payload.description === 'string') {
    sanitized.description = payload.description;
  }
  if (
    payload.state === 'draft' ||
    payload.state === 'active' ||
    payload.state === 'done'
  ) {
    sanitized.state = payload.state;
  }
  // Reject unknown keys by reconstruction only from allowlist.
  for (const key of Object.keys(payload)) {
    if (!TERM_CREATE_ALLOWED_KEYS.has(key)) {
      return null;
    }
  }
  return sanitized;
}

function toQuery(params?: AcademicContextOptionsQuery): ListParams | undefined {
  if (!params) return undefined;
  const query: ListParams = {};
  const entries: Array<[keyof AcademicContextOptionsQuery, unknown]> = [
    ['academic_year_id', params.academic_year_id],
    ['cycle_id', params.cycle_id],
    ['level_id', params.level_id],
    ['track_id', params.track_id],
    ['teaching_language_id', params.teaching_language_id],
    ['subject_id', params.subject_id],
    ['teaching_offering_id', params.teaching_offering_id ?? params.offering_id],
    ['offering_id', params.offering_id ?? params.teaching_offering_id],
    ['reference_id', params.reference_id],
    ['term_id', params.term_id],
    ['class_id', params.class_id],
    ['scope', params.scope],
    ['include_inactive', params.include_inactive],
  ];
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === '') continue;
    if (typeof value === 'boolean') {
      query[key] = String(value);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      query[key] = value;
    }
  }
  return query;
}

function withNormalizedOptions(
  res: ApiResponse<unknown>,
): ApiResponse<AcademicContextOptionsResponse> {
  if (!res.success) return res as ApiResponse<AcademicContextOptionsResponse>;
  const data = normalizeAcademicContextOptions(res.data);
  if (data.language_contract_complete === false) {
    return {
      success: false,
      error: {
        code: 'academic_language_options_incomplete',
        message:
          'Teaching language options are incomplete: Backend returned language IDs without labels.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data };
}

export async function fetchAdminAcademicContextOptions(
  query?: AcademicContextOptionsQuery,
): Promise<ApiResponse<AcademicContextOptionsResponse>> {
  const res = await api.get<unknown>(
    endpoints.admin.academicContextOptions,
    toQuery(query),
  );
  return withNormalizedOptions(res);
}

export async function fetchTeacherAcademicContextOptions(
  query?: AcademicContextOptionsQuery,
): Promise<ApiResponse<AcademicContextOptionsResponse>> {
  const res = await api.get<unknown>(
    endpoints.teacher.academicContextOptions,
    toQuery(query),
  );
  return withNormalizedOptions(res);
}

export async function fetchAcademicYearTerms(
  academicYearId: number | string,
  query?: ListParams,
): Promise<ApiResponse<AcademicTermsListResponse>> {
  const res = await api.get<unknown>(
    endpoints.admin.academicYearTerms(academicYearId),
    query,
  );
  if (!res.success) return res as ApiResponse<AcademicTermsListResponse>;
  return { ...res, data: normalizeAcademicTermsList(res.data) };
}

export async function initializeAcademicYearTerms(
  academicYearId: number | string,
  payload: AcademicTermsInitializePayload,
  query?: ListParams,
): Promise<ApiResponse<AcademicTermsInitializeResult>> {
  const res = await api.post<unknown>(
    endpoints.admin.academicYearTermsInitialize(academicYearId),
    payload,
    query,
  );
  if (!res.success) return res as ApiResponse<AcademicTermsInitializeResult>;
  const list = normalizeAcademicTermsList(res.data);
  return {
    ...res,
    data: {
      terms: list.terms,
      readiness: list.readiness,
      warnings: list.warnings,
    },
  };
}

export async function createAcademicTerm(
  academicYearId: number | string,
  payload: CreateAcademicTermInput,
  query?: ListParams,
): Promise<ApiResponse<AcademicTermOption>> {
  const body = sanitizeTermCreatePayload(payload);
  if (!body) {
    return {
      success: false,
      error: {
        code: 'invalid_term_field',
        message: 'Term create payload is incomplete or contains unsupported fields.',
        details: {},
      },
      meta: {},
    };
  }
  const res = await api.post<unknown>(
    endpoints.admin.academicYearTerms(academicYearId),
    body,
    query,
  );
  if (!res.success) return res as ApiResponse<AcademicTermOption>;
  const term = normalizeAcademicTermOption(res.data);
  if (!term) {
    return {
      success: false,
      error: {
        code: 'server_error',
        message: 'Unexpected term payload from server.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: term };
}

export async function updateAcademicTerm(
  termId: number | string,
  payload: UpdateAcademicTermInput,
  query?: ListParams,
): Promise<ApiResponse<AcademicTermOption>> {
  const body = sanitizeTermUpdatePayload(payload);
  if (!body) {
    return {
      success: false,
      error: {
        code: 'invalid_term_field',
        message: 'Term update payload is empty or contains no allowed fields.',
        details: {},
      },
      meta: {},
    };
  }
  const res = await api.patch<unknown>(
    endpoints.admin.academicSetupTerm(termId),
    body,
    query,
  );
  if (!res.success) return res as ApiResponse<AcademicTermOption>;
  const term = normalizeAcademicTermOption(res.data);
  if (!term) {
    return {
      success: false,
      error: {
        code: 'server_error',
        message: 'Unexpected term payload from server.',
        details: {},
      },
      meta: res.meta ?? {},
    };
  }
  return { ...res, data: term };
}

export async function fetchAcademicTermsForYear(
  academicYearId: number | string,
): Promise<ApiResponse<AcademicTermsListResponse>> {
  return fetchAcademicYearTerms(academicYearId);
}

/** Re-export for callers that need a single term normalizer. */
export { normalizeAcademicTermOption };
