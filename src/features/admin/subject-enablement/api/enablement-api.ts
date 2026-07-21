import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody, ApiResponse, ListParams } from '@/types/api';
import type {
  SubjectEnablementMatrixPayload,
  SubjectEnablementUpdateRequest,
  SubjectEnablementUpdateResponse,
} from '@/types/subject-enablement';

export type FetchEnablementQuery = {
  academic_year_id?: number;
  level_id?: number;
  subject_id?: number;
};

/** Build GET query — only contract params (plus BFF active_school_id via useAdminResource). */
export function buildEnablementQuery(
  query: FetchEnablementQuery,
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  if (query.academic_year_id != null) out.academic_year_id = query.academic_year_id;
  if (query.level_id != null) out.level_id = query.level_id;
  if (query.subject_id != null) out.subject_id = query.subject_id;
  return out;
}

/**
 * Strict POST body allowlist matching NEXTJS_CONTRACT_BRIEF.md.
 * Rejects / strips any field outside the contract (including school_id).
 */
export function buildEnablementUpdateBody(input: {
  academic_year_id: number;
  level_id: number;
  enable_subject_ids: number[];
  disable_subject_ids: number[];
  expected_version: string;
}): SubjectEnablementUpdateRequest {
  const enable = uniquePositiveIds(input.enable_subject_ids);
  const disable = uniquePositiveIds(input.disable_subject_ids);
  return {
    academic_year_id: input.academic_year_id,
    level_id: input.level_id,
    enable_subject_ids: enable,
    disable_subject_ids: disable,
    expected_version: input.expected_version,
  };
}

export function uniquePositiveIds(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Ensure body JSON keys are exactly the contract allowlist (order not significant). */
export function assertEnablementUpdateBodyKeys(body: Record<string, unknown>): boolean {
  const allowed = new Set([
    'academic_year_id',
    'level_id',
    'enable_subject_ids',
    'disable_subject_ids',
    'expected_version',
  ]);
  return Object.keys(body).every((k) => allowed.has(k));
}

export async function fetchSubjectEnablement(
  query: FetchEnablementQuery,
  activeSchoolId?: number | null,
): Promise<
  | { ok: true; data: SubjectEnablementMatrixPayload }
  | { ok: false; error: ApiErrorBody }
> {
  const params: ListParams = {
    ...buildEnablementQuery(query),
    ...(activeSchoolId != null ? { active_school_id: activeSchoolId } : {}),
  };
  const res = await api.get<SubjectEnablementMatrixPayload>(
    endpoints.admin.subjectsEnablement,
    params,
  );
  return unwrap(res);
}

export async function updateSubjectEnablement(
  input: {
    academic_year_id: number;
    level_id: number;
    enable_subject_ids: number[];
    disable_subject_ids: number[];
    expected_version: string;
  },
  activeSchoolId?: number | null,
): Promise<
  | { ok: true; data: SubjectEnablementUpdateResponse }
  | { ok: false; error: ApiErrorBody }
> {
  const body = buildEnablementUpdateBody(input);
  if (!assertEnablementUpdateBodyKeys({ ...body })) {
    return {
      ok: false,
      error: { code: 'invalid_payload', message: 'Enablement update body failed allowlist.' },
    };
  }
  const params: ListParams | undefined =
    activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;
  const res = await api.post<SubjectEnablementUpdateResponse>(
    endpoints.admin.subjectsEnablementUpdate,
    body,
    params,
  );
  return unwrap(res);
}

function unwrap<T>(
  res: ApiResponse<T>,
): { ok: true; data: T } | { ok: false; error: ApiErrorBody } {
  if (!res.success) return { ok: false, error: res.error };
  return { ok: true, data: res.data };
}
