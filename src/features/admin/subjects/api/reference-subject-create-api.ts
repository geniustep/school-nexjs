import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody, ApiResponse } from '@/types/api';
import type {
  ReferenceSubjectCreateRequest,
  ReferenceSubjectCreateResult,
} from '@/types/reference-subjects';

export type CreateReferenceSubjectOutcome =
  | { ok: true; data: ReferenceSubjectCreateResult }
  | { ok: false; error: ApiErrorBody };

export async function createReferenceSubject(
  payload: ReferenceSubjectCreateRequest,
): Promise<CreateReferenceSubjectOutcome> {
  const res: ApiResponse<ReferenceSubjectCreateResult> = await api.post(
    endpoints.admin.referenceSubjects,
    payload,
  );

  if (!res.success) {
    return { ok: false, error: res.error };
  }

  return { ok: true, data: res.data };
}
