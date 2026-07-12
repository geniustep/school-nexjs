'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { ClassMultiSubjectResults } from '@/types/class-multi-subject-results';
import { normalizeClassMultiSubjectResultsPayload } from '../utils/class-results-present';

export async function getClassMultiSubjectResults(params: {
  classId: number | string;
  academicYearId: number | string;
  termId: number | string;
  query?: ListParams;
}): Promise<ApiResponse<ClassMultiSubjectResults>> {
  const res = await api.get<ClassMultiSubjectResults>(
    endpoints.admin.classMultiSubjectResults(params.classId),
    {
      academic_year_id: params.academicYearId,
      term_id: params.termId,
      ...params.query,
    },
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeClassMultiSubjectResultsPayload(res.data) };
  }
  return res;
}
