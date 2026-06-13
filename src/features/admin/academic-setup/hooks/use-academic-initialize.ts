'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import { parseInitializeResponse } from '../utils/academic-initialize';
import type {
  AcademicInitializeRequest,
  AcademicInitializeResponse,
} from '@/types/academic-initialize';
import type { ApiError, ApiErrorBody } from '@/types/api';

export async function initializeAcademicSetup(
  payload: AcademicInitializeRequest,
  activeSchoolId?: number | null,
): Promise<
  | { ok: true; data: AcademicInitializeResponse }
  | { ok: false; error: ApiErrorBody; partial?: AcademicInitializeResponse }
> {
  if (!payload.reference_level_ids.length) {
    return {
      ok: true,
      data: {
        results: [],
        summary: { requested: 0, enabled: 0, already_enabled: 0, failed: 0 },
      },
    };
  }

  const query =
    activeSchoolId != null ? { active_school_id: activeSchoolId } : undefined;

  const res = await api.post<AcademicInitializeResponse>(
    endpoints.admin.setupAcademicInitialize,
    payload,
    query,
  );

  if (res.success) {
    return { ok: true, data: parseInitializeResponse(res.data) as AcademicInitializeResponse };
  }

  const partial = (res as ApiError & { data?: AcademicInitializeResponse }).data;
  if (partial?.results?.length) {
    return {
      ok: true,
      data: parseInitializeResponse(partial) as AcademicInitializeResponse,
    };
  }

  return {
    ok: false,
    error: res.error,
    partial: partial ? (parseInitializeResponse(partial) as AcademicInitializeResponse) : undefined,
  };
}

export function useAcademicInitializeMutation() {
  const run = useCallback(
    (payload: AcademicInitializeRequest, activeSchoolId?: number | null) =>
      initializeAcademicSetup(payload, activeSchoolId),
    [],
  );
  return { initialize: run };
}
