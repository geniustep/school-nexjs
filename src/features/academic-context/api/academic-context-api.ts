import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type {
  AcademicContextOptionsQuery,
  AcademicContextOptionsResponse,
  AcademicTermsInitializePayload,
  AcademicTermsInitializeResult,
  AcademicTermsListResponse,
} from '@/types/academic-context';
import {
  normalizeAcademicContextOptions,
  normalizeAcademicTermsList,
  normalizeAcademicTermOption,
} from '../utils/normalize-academic-context';

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
    query[key] = value as string | number | boolean;
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

export async function fetchAcademicTermsForYear(
  academicYearId: number | string,
): Promise<ApiResponse<AcademicTermsListResponse>> {
  return fetchAcademicYearTerms(academicYearId);
}

/** Re-export for callers that need a single term normalizer. */
export { normalizeAcademicTermOption };
