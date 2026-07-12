'use client';

import { api } from '@/lib/api/client';
import { endpoints } from '@/lib/api/endpoints';
import type { ApiResponse, ListParams } from '@/types/api';
import type { StudentMultiSubjectResults } from '@/types/student-multi-subject-results';
import { normalizeStudentMultiSubjectResultsPayload } from '../utils/student-multi-subject-results-present';

export async function getStudentMultiSubjectResults(params: {
  studentId: number | string;
  academicYearId: number | string;
  termId: number | string;
  query?: ListParams;
}): Promise<ApiResponse<StudentMultiSubjectResults>> {
  const res = await api.get<StudentMultiSubjectResults>(
    endpoints.admin.studentMultiSubjectResults(params.studentId),
    {
      academic_year_id: params.academicYearId,
      term_id: params.termId,
      ...params.query,
    },
  );
  if (res.success && res.data) {
    return { ...res, data: normalizeStudentMultiSubjectResultsPayload(res.data) };
  }
  return res;
}
