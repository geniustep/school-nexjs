import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiErrorBody } from '@/types/api';
import type { PersonSearchResult } from '@/types/student-360';
import { normalizePersonSearchList } from './normalize-person-search';

export type GuardianCandidateSearchSource = 'candidates' | 'legacy';

export type GuardianCandidateSearchOutcome =
  | { ok: true; results: PersonSearchResult[]; source: GuardianCandidateSearchSource }
  | { ok: false };

function isCandidateEndpointUnavailable(error: ApiErrorBody | undefined): boolean {
  const status = error?.details?.status;
  if (status === 404 || status === 501) return true;
  const code = String(error?.code ?? '');
  return code === 'not_found' || code === 'endpoint_not_found';
}

async function searchLegacyGuardians(
  studentId: number,
  params: {
    query: string;
    activeSchoolId?: number | null;
    includeArchived?: boolean;
  },
): Promise<GuardianCandidateSearchOutcome> {
  const res = await api.get<PersonSearchResult[]>(endpoints.admin.guardiansSearch, {
    q: params.query,
    page: 1,
    page_size: 20,
    exclude_student_id: studentId,
    active_school_id: params.activeSchoolId ?? undefined,
    include_archived: params.includeArchived ? 'true' : undefined,
  });

  if (!res.success) return { ok: false };
  return { ok: true, results: normalizePersonSearchList(res.data), source: 'legacy' };
}

/** Student 360 guardian link — prefer GET /admin/students/{id}/guardian-candidates. */
export async function searchGuardianCandidatesForStudent(
  studentId: number,
  params: {
    query: string;
    activeSchoolId?: number | null;
    includeArchived?: boolean;
  },
): Promise<GuardianCandidateSearchOutcome> {
  const res = await api.get<PersonSearchResult[]>(
    endpoints.admin.studentGuardianCandidates(studentId),
    {
      query: params.query,
      active_school_id: params.activeSchoolId ?? undefined,
      include_archived: params.includeArchived ? 'true' : undefined,
    },
  );

  if (res.success) {
    return { ok: true, results: normalizePersonSearchList(res.data), source: 'candidates' };
  }

  if (!isCandidateEndpointUnavailable(res.error)) {
    return { ok: false };
  }

  return searchLegacyGuardians(studentId, params);
}
